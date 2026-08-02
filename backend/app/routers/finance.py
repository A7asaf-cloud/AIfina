import json
import asyncio
from datetime import datetime
from functools import partial
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Transaction, UploadBatch, AiAnalysis
from ..services.file_parser import parse_file
from ..services import gemini_service as gemini


async def _run(fn, *args):
    """Run a blocking Gemini call in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(fn, *args))

router = APIRouter(prefix="/api/finance", tags=["finance"])


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    filename = file.filename or "unknown"

    try:
        rows = parse_file(content, filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    batch = UploadBatch(filename=filename, uploaded_at=datetime.utcnow(), row_count=len(rows), status="pending")
    db.add(batch)
    await db.flush()

    now = datetime.utcnow()
    for r in rows:
        # Skip duplicates already in DB (same date + amount + description)
        existing = await db.execute(
            select(Transaction).where(
                and_(
                    Transaction.date == r["date"],
                    Transaction.amount == r["amount"],
                    Transaction.description == r["description"],
                )
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(Transaction(
            date=r["date"],
            amount=r["amount"],
            description=r["description"],
            source_file=r["source_file"],
            upload_batch_id=batch.id,
            created_at=now,
        ))

    await db.commit()
    await db.refresh(batch)
    return {"batch_id": batch.id, "filename": filename, "row_count": len(rows)}


# ── Transactions list ─────────────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction).order_by(Transaction.date.desc())

    if month:
        q = q.where(Transaction.date.like(f"{month}%"))
    if category:
        q = q.where(Transaction.ai_category == category)
    if search:
        q = q.where(Transaction.description.ilike(f"%{search}%"))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()

    per_page = 50
    q = q.offset((page - 1) * per_page).limit(per_page)
    rows = (await db.execute(q)).scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "transactions": [_tx_dict(t) for t in rows],
    }


# ── Analyze batch ─────────────────────────────────────────────────────────────

@router.post("/analyze/{batch_id}")
async def analyze_batch(batch_id: int, db: AsyncSession = Depends(get_db)):
    batch = await db.get(UploadBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch.status = "analyzing"
    await db.commit()

    try:
        # Fetch transactions for this batch
        result = await db.execute(select(Transaction).where(Transaction.upload_batch_id == batch_id))
        txs = result.scalars().all()
        tx_dicts = [_tx_dict(t) for t in txs]

        now = datetime.utcnow()

        # 1. Categorize (run blocking Gemini call in thread pool)
        categories = await _run(gemini.categorize_transactions, tx_dicts)
        cat_map = {item["id"]: item.get("category", "אחר") for item in categories if isinstance(item, dict)}
        for tx in txs:
            tx.ai_category = cat_map.get(tx.id, "אחר")
        await db.commit()

        # 2. Detect recurring
        all_txs_result = await db.execute(select(Transaction).order_by(Transaction.date.desc()).limit(500))
        all_txs = [_tx_dict(t) for t in all_txs_result.scalars().all()]
        recurring = await _run(gemini.detect_recurring, all_txs)
        _save_analysis(db, batch_id, "recurring", recurring, now)

        recurring_descs = {r["description"].lower() for r in recurring if isinstance(r, dict) and "description" in r}
        for tx in txs:
            if tx.description.lower() in recurring_descs:
                tx.is_recurring = True
        await db.flush()

        # 3. Monthly summary (one Gemini call per month in the batch)
        months = sorted({t["date"][:7] for t in tx_dicts})
        summaries = {}
        for m in months:
            summaries[m] = await _run(gemini.monthly_summary, all_txs, m)
        _save_analysis(db, batch_id, "monthly_summary", summaries, now)

        # 4. Anomalies
        anomalies = await _run(gemini.detect_anomalies, all_txs)
        _save_analysis(db, batch_id, "anomalies", anomalies, now)
        severity_score = {"low": 0.3, "medium": 0.6, "high": 1.0}
        anomaly_map = {a["transaction_id"]: a.get("severity", "low") for a in anomalies if isinstance(a, dict)}
        for tx in txs:
            sev = anomaly_map.get(tx.id)
            if sev:
                tx.anomaly_score = severity_score.get(sev, 0.0)
        await db.flush()

        # 5. Recommendations
        summary_for_rec = next(iter(summaries.values()), {}) if summaries else {}
        recs = await _run(gemini.savings_recommendations, summary_for_rec, recurring)
        _save_analysis(db, batch_id, "recommendations", recs, now)

        batch.status = "done"
        await db.commit()

    except Exception as exc:
        batch.status = "error"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"ניתוח נכשל: {exc}")

    return {"batch_id": batch_id, "status": "done", "months_analyzed": months}


def _save_analysis(db: AsyncSession, batch_id: int, analysis_type: str, data, now: datetime):
    db.add(AiAnalysis(
        batch_id=batch_id,
        analysis_type=analysis_type,
        result_json=json.dumps(data, ensure_ascii=False),
        created_at=now,
    ))


# ── Monthly summary ───────────────────────────────────────────────────────────

@router.get("/summary/{month}")
async def get_monthly_summary(month: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AiAnalysis)
        .where(AiAnalysis.analysis_type == "monthly_summary")
        .order_by(AiAnalysis.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return {}
    data = json.loads(row.result_json or "{}")
    return data.get(month, {})


# ── Recurring ─────────────────────────────────────────────────────────────────

@router.get("/recurring")
async def get_recurring(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AiAnalysis)
        .where(AiAnalysis.analysis_type == "recurring")
        .order_by(AiAnalysis.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return json.loads(row.result_json or "[]") if row else []


# ── Anomalies ─────────────────────────────────────────────────────────────────

@router.get("/anomalies")
async def get_anomalies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AiAnalysis)
        .where(AiAnalysis.analysis_type == "anomalies")
        .order_by(AiAnalysis.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return json.loads(row.result_json or "[]") if row else []


# ── Recommendations ───────────────────────────────────────────────────────────

@router.get("/recommendations")
async def get_recommendations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AiAnalysis)
        .where(AiAnalysis.analysis_type == "recommendations")
        .order_by(AiAnalysis.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return json.loads(row.result_json or '{"recommendations":[]}') if row else {"recommendations": []}


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction.ai_category, func.sum(Transaction.amount).label("total"), func.count().label("count"))
        .where(Transaction.ai_category != "")
        .group_by(Transaction.ai_category)
        .order_by(func.sum(Transaction.amount))
    )
    rows = result.all()
    return [{"category": r.ai_category, "total": round(r.total, 2), "count": r.count} for r in rows]


# ── Helper ────────────────────────────────────────────────────────────────────

def _tx_dict(t: Transaction) -> dict:
    return {
        "id": t.id,
        "date": t.date,
        "amount": t.amount,
        "description": t.description,
        "ai_category": t.ai_category,
        "is_recurring": t.is_recurring,
        "anomaly_score": t.anomaly_score,
        "source_file": t.source_file,
        "upload_batch_id": t.upload_batch_id,
    }
