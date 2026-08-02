import json
import logging
import os
from typing import Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

CATEGORIES = ["מזון", "תחבורה", "בילויים", "קניות", "בריאות", "חשבונות", "חינוך", "דיור", "הכנסה", "אחר"]
_PREFIX = (
    "Respond ONLY with valid JSON. No markdown, no explanation. "
    "The data is from Israeli bank exports. Merchant names may be in Hebrew."
)


def _model() -> genai.GenerativeModel:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
        generation_config={"temperature": 0.2},
    )


def _call(prompt: str) -> Optional[str]:
    try:
        resp = _model().generate_content(_PREFIX + "\n\n" + prompt)
        return resp.text
    except Exception as exc:
        logger.error("Gemini call failed: %s", exc)
        return None


def _parse(text: Optional[str], fallback):
    if not text:
        return fallback
    try:
        s = text.strip()
        # Strip markdown code fences if present
        if s.startswith("```"):
            lines = s.split("\n")
            s = "\n".join(lines[1:-1]) if len(lines) > 2 else s
        return json.loads(s)
    except Exception:
        logger.error("Failed to parse Gemini JSON: %.400s", text)
        return fallback


# ── 1. Categorize ─────────────────────────────────────────────────────────────

def categorize_transactions(transactions: list) -> list:
    results = []
    for i in range(0, len(transactions), 200):
        batch = transactions[i : i + 200]
        rows = [{"id": t["id"], "description": t["description"], "amount": t["amount"]} for t in batch]
        prompt = (
            f'Categorize each transaction. Return JSON array: [{{"id": <id>, "category": "<cat>"}}]\n'
            f"Use ONLY these categories: {', '.join(CATEGORIES)}\n"
            f"Transactions: {json.dumps(rows, ensure_ascii=False)}"
        )
        parsed = _parse(_call(prompt), [])
        if isinstance(parsed, list) and parsed:
            results.extend(parsed)
        else:
            results.extend([{"id": t["id"], "category": "אחר"} for t in batch])
    return results


# ── 2. Recurring ──────────────────────────────────────────────────────────────

def detect_recurring(transactions: list) -> list:
    rows = [{"description": t["description"], "amount": t["amount"], "date": t["date"]} for t in transactions[:500]]
    prompt = (
        "Identify recurring charges (subscriptions, monthly bills).\n"
        'Return JSON array: [{"description":"<desc>","amount":<float>,"frequency":"<monthly|weekly|yearly>","next_expected_date":"<YYYY-MM-DD>"}]\n'
        f"Transactions: {json.dumps(rows, ensure_ascii=False)}"
    )
    return _parse(_call(prompt), [])


# ── 3. Monthly summary ────────────────────────────────────────────────────────

def monthly_summary(transactions: list, month: str) -> dict:
    filtered = [t for t in transactions if str(t.get("date", "")).startswith(month)]
    _empty = {"total_income": 0, "total_expenses": 0, "top_categories": [], "biggest_expense": None, "savings_rate": 0}
    if not filtered:
        return _empty
    rows = [{"description": t["description"], "amount": t["amount"], "category": t.get("ai_category", "")} for t in filtered]
    prompt = (
        f"Summarize transactions for {month}.\n"
        'Return JSON: {"total_income":<float>,"total_expenses":<float>,'
        '"top_categories":[{"category":"<name>","total":<float>}],'
        '"biggest_expense":{"description":"<desc>","amount":<float>},"savings_rate":<float 0-100>}\n'
        f"Transactions: {json.dumps(rows, ensure_ascii=False)}"
    )
    return _parse(_call(prompt), _empty)


# ── 4. Anomalies ──────────────────────────────────────────────────────────────

def detect_anomalies(transactions: list) -> list:
    rows = [{"id": t["id"], "description": t["description"], "amount": t["amount"], "date": t["date"]} for t in transactions[:300]]
    prompt = (
        "Flag unusual transactions (outliers, duplicates, unfamiliar merchants) from this history.\n"
        'Return JSON array: [{"transaction_id":<id>,"reason":"<Hebrew reason>","severity":"<low|medium|high>"}]\n'
        f"Transactions: {json.dumps(rows, ensure_ascii=False)}"
    )
    return _parse(_call(prompt), [])


# ── 5. Savings recommendations ────────────────────────────────────────────────

def savings_recommendations(summary: dict, recurring: list) -> dict:
    prompt = (
        "Based on this financial summary and recurring payments, provide 3-5 savings recommendations IN HEBREW.\n"
        'Return JSON: {"recommendations":[{"title":"<Hebrew>","description":"<Hebrew>","estimated_saving_nis":<float>}]}\n'
        f"Summary: {json.dumps(summary, ensure_ascii=False)}\n"
        f"Recurring: {json.dumps(recurring, ensure_ascii=False)}"
    )
    return _parse(_call(prompt), {"recommendations": []})
