from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | analyzing | done | error


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String, nullable=False)          # YYYY-MM-DD
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(String, default="")
    ai_category: Mapped[str] = mapped_column(String, default="")
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    source_file: Mapped[str] = mapped_column(String, default="")
    upload_batch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("upload_batches.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class AiAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(Integer, ForeignKey("upload_batches.id"), nullable=False)
    analysis_type: Mapped[str] = mapped_column(String, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
