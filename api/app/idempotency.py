import hashlib
import json
from typing import Optional, Tuple
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
import redis.asyncio as redis

from app.models import IdempotencyKey
from app.redis_client import get_redis

IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours
REDIS_KEY_PREFIX = "idem:"


def compute_request_hash(body: bytes) -> str:
    """Compute SHA-256 hash of request body."""
    return hashlib.sha256(body).hexdigest()


async def check_idempotency_redis(
    key: str,
    redis_client: redis.Redis,
) -> Optional[dict]:
    """Check Redis for cached idempotency response (fast path)."""
    cached = await redis_client.get(f"{REDIS_KEY_PREFIX}{key}")
    if cached:
        return json.loads(cached)
    return None


async def cache_idempotency_redis(
    key: str,
    request_hash: str,
    response_body: dict,
    status_code: int,
    redis_client: redis.Redis,
) -> None:
    """Cache idempotency response in Redis."""
    data = {
        "request_hash": request_hash,
        "response_body": response_body,
        "status_code": status_code,
    }
    await redis_client.setex(
        f"{REDIS_KEY_PREFIX}{key}",
        IDEMPOTENCY_TTL_SECONDS,
        json.dumps(data),
    )


async def check_idempotency_postgres(
    key: str,
    db: AsyncSession,
) -> Optional[IdempotencyKey]:
    """Check Postgres for idempotency record (authoritative)."""
    result = await db.execute(
        select(IdempotencyKey).where(IdempotencyKey.key == key)
    )
    return result.scalar_one_or_none()


async def claim_idempotency_key(
    key: str,
    request_hash: str,
    db: AsyncSession,
) -> Tuple[bool, Optional[IdempotencyKey]]:
    """
    Attempt to claim an idempotency key using INSERT ... ON CONFLICT DO NOTHING.
    
    Returns:
        (True, None) if we successfully claimed the key
        (False, existing_record) if someone else already has it
    """
    stmt = (
        insert(IdempotencyKey)
        .values(key=key, request_hash=request_hash)
        .on_conflict_do_nothing(index_elements=["key"])
        .returning(IdempotencyKey.key)
    )
    
    result = await db.execute(stmt)
    inserted = result.scalar_one_or_none()
    
    if inserted is not None:
        await db.commit()
        return True, None
    
    existing = await check_idempotency_postgres(key, db)
    return False, existing


async def complete_idempotency_key(
    key: str,
    response_body: dict,
    status_code: int,
    db: AsyncSession,
    redis_client: redis.Redis,
) -> None:
    """Store the response for a completed idempotent operation."""
    await db.execute(
        text("""
            UPDATE idempotency_keys 
            SET response_body = :response_body, status_code = :status_code
            WHERE key = :key
        """),
        {"key": key, "response_body": json.dumps(response_body), "status_code": status_code},
    )
    await db.commit()
    
    record = await check_idempotency_postgres(key, db)
    if record:
        await cache_idempotency_redis(
            key, record.request_hash, response_body, status_code, redis_client
        )


async def validate_idempotency_request(
    idempotency_key: str,
    body: bytes,
    db: AsyncSession,
) -> Optional[dict]:
    """
    Validate an idempotent request.
    
    Returns:
        - None if this is a new request that should proceed
        - dict with cached response if this is a duplicate
        
    Raises:
        HTTPException 409 if key exists but body hash differs
    """
    redis_client = await get_redis()
    request_hash = compute_request_hash(body)
    
    cached = await check_idempotency_redis(idempotency_key, redis_client)
    if cached:
        if cached["request_hash"] != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key reused with different request body",
            )
        if cached["response_body"] is not None:
            return {
                "response": cached["response_body"],
                "status_code": cached["status_code"],
            }
    
    claimed, existing = await claim_idempotency_key(idempotency_key, request_hash, db)
    
    if not claimed and existing:
        if existing.request_hash != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key reused with different request body",
            )
        
        if existing.response_body is not None:
            await cache_idempotency_redis(
                idempotency_key,
                existing.request_hash,
                existing.response_body,
                existing.status_code or 200,
                redis_client,
            )
            return {
                "response": existing.response_body,
                "status_code": existing.status_code,
            }
        
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request with this idempotency key is still being processed",
        )
    
    return None


def get_idempotency_key_header(request: Request) -> str:
    """Extract and validate the Idempotency-Key header."""
    key = request.headers.get("Idempotency-Key")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required",
        )
    if len(key) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key must not exceed 100 characters",
        )
    return key
