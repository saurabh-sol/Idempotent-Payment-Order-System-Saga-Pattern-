"""
Admin API for chaos testing and system management.
"""
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.chaos import (
    ChaosConfig,
    FailureMode,
    get_chaos_config,
    set_chaos_config,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ChaosConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    fail_step: Optional[str] = Field(None, description="Step to fail: reserve_inventory, charge_payment, confirm_order")
    failure_mode: Optional[str] = Field(None, description="always, probability, or never")
    failure_probability: Optional[float] = Field(None, ge=0, le=1)
    step_overrides: Optional[Dict[str, float]] = None


class ChaosConfigResponse(BaseModel):
    enabled: bool
    fail_step: Optional[str]
    failure_mode: str
    failure_probability: float
    step_overrides: Dict[str, float]


@router.get("/chaos", response_model=ChaosConfigResponse)
async def get_chaos_status() -> ChaosConfigResponse:
    """Get current chaos injection configuration."""
    config = get_chaos_config()
    return ChaosConfigResponse(
        enabled=config.enabled,
        fail_step=config.fail_step,
        failure_mode=config.failure_mode.value,
        failure_probability=config.failure_probability,
        step_overrides=config.step_overrides,
    )


@router.post("/chaos", response_model=ChaosConfigResponse)
async def update_chaos_config(request: ChaosConfigRequest) -> ChaosConfigResponse:
    """
    Update chaos injection configuration.
    
    Examples:
    - Fail confirm_order 100% of the time:
      {"enabled": true, "fail_step": "confirm_order", "failure_mode": "always"}
    
    - Fail any step 30% of the time:
      {"enabled": true, "fail_step": null, "failure_mode": "probability", "failure_probability": 0.3}
    
    - Disable chaos:
      {"enabled": false}
    """
    failure_mode = None
    if request.failure_mode:
        try:
            failure_mode = FailureMode(request.failure_mode)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid failure_mode. Must be one of: {[m.value for m in FailureMode]}",
            )
    
    config = set_chaos_config(
        enabled=request.enabled,
        fail_step=request.fail_step,
        failure_mode=failure_mode,
        failure_probability=request.failure_probability,
        step_overrides=request.step_overrides,
    )
    
    return ChaosConfigResponse(
        enabled=config.enabled,
        fail_step=config.fail_step,
        failure_mode=config.failure_mode.value,
        failure_probability=config.failure_probability,
        step_overrides=config.step_overrides,
    )


@router.delete("/chaos")
async def disable_chaos() -> dict:
    """Disable chaos injection."""
    set_chaos_config(enabled=False, fail_step="")
    return {"status": "Chaos injection disabled"}
