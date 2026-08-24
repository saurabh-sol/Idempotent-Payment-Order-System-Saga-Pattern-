"""
Anomaly API endpoints.

Provides access to anomaly detection flags and rate limit status.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.database import get_db
from app.models import AnomalyFlag
from app.rate_limit import get_rate_limit_status

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


class AnomalyFlagResponse(BaseModel):
    id: str
    user_id: str
    reason: str
    action_taken: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyListResponse(BaseModel):
    flags: List[AnomalyFlagResponse]
    total: int


@router.get("", response_model=AnomalyListResponse)
async def list_anomalies(
    user_id: Optional[uuid.UUID] = Query(None, description="Filter by user ID"),
    reason: Optional[str] = Query(None, description="Filter by reason"),
    since_hours: int = Query(24, description="Get flags from last N hours"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> AnomalyListResponse:
    """
    List anomaly detection flags.
    
    Flags indicate suspicious patterns detected by the anomaly detector.
    """
    cutoff = datetime.utcnow() - timedelta(hours=since_hours)
    
    query = select(AnomalyFlag).where(AnomalyFlag.created_at >= cutoff)
    
    if user_id:
        query = query.where(AnomalyFlag.user_id == user_id)
    
    if reason:
        query = query.where(AnomalyFlag.reason == reason)
    
    query = query.order_by(AnomalyFlag.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    flags = result.scalars().all()
    
    return AnomalyListResponse(
        flags=[
            AnomalyFlagResponse(
                id=str(f.id),
                user_id=str(f.user_id),
                reason=f.reason,
                action_taken=f.action_taken,
                created_at=f.created_at,
            )
            for f in flags
        ],
        total=len(flags),
    )


@router.get("/rate-limit/{user_id}")
async def get_user_rate_limit(user_id: str) -> dict:
    """Get rate limit status for a specific user."""
    return await get_rate_limit_status(user_id)


@router.get("/stats")
async def get_anomaly_stats(
    since_hours: int = Query(24, description="Stats from last N hours"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get anomaly detection statistics."""
    cutoff = datetime.utcnow() - timedelta(hours=since_hours)
    
    result = await db.execute(
        select(AnomalyFlag).where(AnomalyFlag.created_at >= cutoff)
    )
    flags = result.scalars().all()
    
    reasons = {}
    actions = {}
    users = set()
    
    for flag in flags:
        reasons[flag.reason] = reasons.get(flag.reason, 0) + 1
        actions[flag.action_taken] = actions.get(flag.action_taken, 0) + 1
        users.add(str(flag.user_id))
    
    return {
        "total_flags": len(flags),
        "unique_users": len(users),
        "by_reason": reasons,
        "by_action": actions,
        "period_hours": since_hours,
    }
