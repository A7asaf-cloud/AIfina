import io
import hashlib
from datetime import datetime
from typing import Optional

import pandas as pd

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

_DATE_COLS = {"date", "תאריך", "תאריך עסקה", "transaction date"}
_DEBIT_COLS = {"amount", "סכום", "חיוב", "debit"}
_CREDIT_COLS = {"זיכוי", "credit"}
_DESC_COLS = {"description", "תיאור", "שם בית העסק", "פירוט", "merchant"}


def _find_col(columns: list[str], targets: set[str]) -> Optional[str]:
    for c in columns:
        if c.strip().lower() in targets:
            return c
    return None


def _parse_date(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    s = str(val).strip()
    if not s or s in ("nan", "None"):
        return ""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y", "%m/%d/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    try:
        return pd.to_datetime(s, dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return s


def _to_float(val) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0.0


def parse_file(content: bytes, filename: str) -> list[dict]:
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("קובץ גדול מ-5MB — נדחה")

    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        df = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig", dtype=str)
    elif ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(content), sheet_name=0, dtype=str)
    else:
        raise ValueError(f"סוג קובץ לא נתמך: .{ext}")

    df.dropna(how="all", inplace=True)
    df.reset_index(drop=True, inplace=True)

    cols = list(df.columns)
    date_col = _find_col(cols, _DATE_COLS)
    debit_col = _find_col(cols, _DEBIT_COLS)
    credit_col = _find_col(cols, _CREDIT_COLS)
    desc_col = _find_col(cols, _DESC_COLS)

    if not date_col:
        raise ValueError("לא נמצאה עמודת תאריך בקובץ")

    rows: list[dict] = []
    for _, row in df.iterrows():
        date_val = _parse_date(row.get(date_col))
        if not date_val:
            continue

        # Merge debit/credit into a single signed amount.
        # If only one amount column exists, preserve its original sign.
        # If both debit+credit columns exist, debit=negative, credit=positive.
        amount = 0.0
        if debit_col and not credit_col:
            # Single column — keep original sign (positive = income, negative = expense)
            amount = _to_float(row.get(debit_col))
        else:
            if debit_col:
                v = _to_float(row.get(debit_col))
                if v != 0.0:
                    amount -= abs(v)
            if credit_col:
                v = _to_float(row.get(credit_col))
                if v != 0.0:
                    amount += abs(v)

        desc = str(row.get(desc_col, "")).strip() if desc_col else ""
        if not desc or desc in ("nan", "None", ""):
            desc = "עסקה ללא תיאור"

        rows.append({
            "date": date_val,
            "amount": round(amount, 2),
            "description": desc,
            "source_file": filename,
        })

    # Deduplicate by date + amount + description
    seen: set[str] = set()
    unique: list[dict] = []
    for r in rows:
        key = hashlib.md5(f"{r['date']}|{r['amount']}|{r['description']}".encode()).hexdigest()
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return unique
