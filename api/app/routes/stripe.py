"""Stripe configuration endpoints (test mode)."""

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


@router.get("/config")
async def stripe_config() -> dict:
    """Expose Stripe test-mode config for the frontend."""
    settings = get_settings()
    enabled = bool(
        settings.stripe_enabled
        and settings.stripe_secret_key.startswith("sk_")
    )
    mode = "test" if settings.stripe_secret_key.startswith("sk_test") else "live"

    return {
        "enabled": enabled,
        "publishable_key": settings.stripe_publishable_key if enabled else None,
        "mode": mode if enabled else None,
        "dashboard_url": "https://dashboard.stripe.com/test/payments"
        if mode == "test"
        else "https://dashboard.stripe.com/payments",
    }
