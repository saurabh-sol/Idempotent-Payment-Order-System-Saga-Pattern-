"""
Rate Limiting using Redis sliding window.

Provides per-user rate limiting for order creation to prevent abuse
and detect anomalous behavior (like retry storms from AI agents).
"""
import time
from typing import Tuple

import redis.asyncio as redis
from fastapi import HTTPException, status

from app.redis_client import get_redis
import structlog

logger = structlog.get_logger()

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 10
REDIS_KEY_PREFIX = "rate_limit:"


async def check_rate_limit(
    user_id: str,
    window_seconds: int = RATE_LIMIT_WINDOW,
    max_requests: int = RATE_LIMIT_MAX_REQUESTS,
) -> Tuple[bool, int, int]:
    """
    Check and update rate limit for a user using sliding window.
    
    Returns:
        (allowed, remaining, reset_time)
    """
    redis_client = await get_redis()
    key = f"{REDIS_KEY_PREFIX}{user_id}"
    now = time.time()
    window_start = now - window_seconds
    
    pipe = redis_client.pipeline()
    
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zcard(key)
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, window_seconds)
    
    results = await pipe.execute()
    current_count = results[1]
    
    remaining = max(0, max_requests - current_count - 1)
    reset_time = int(now + window_seconds)
    
    if current_count >= max_requests:
        logger.warning(
            "Rate limit exceeded",
            user_id=user_id,
            count=current_count,
            limit=max_requests,
        )
        return False, 0, reset_time
    
    return True, remaining, reset_time


async def enforce_rate_limit(
    user_id: str,
    window_seconds: int = RATE_LIMIT_WINDOW,
    max_requests: int = RATE_LIMIT_MAX_REQUESTS,
) -> None:
    """
    Enforce rate limit, raising HTTPException if exceeded.
    """
    allowed, remaining, reset_time = await check_rate_limit(
        user_id, window_seconds, max_requests
    )
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": reset_time - int(time.time()),
                "limit": max_requests,
                "window": window_seconds,
            },
            headers={
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time),
                "Retry-After": str(reset_time - int(time.time())),
            },
        )


async def get_rate_limit_status(user_id: str) -> dict:
    """Get current rate limit status for a user."""
    redis_client = await get_redis()
    key = f"{REDIS_KEY_PREFIX}{user_id}"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    
    await redis_client.zremrangebyscore(key, 0, window_start)
    current_count = await redis_client.zcard(key)
    
    return {
        "user_id": user_id,
        "requests_used": current_count,
        "requests_remaining": max(0, RATE_LIMIT_MAX_REQUESTS - current_count),
        "limit": RATE_LIMIT_MAX_REQUESTS,
        "window_seconds": RATE_LIMIT_WINDOW,
    }
