"""
Chaos engineering module for failure injection testing.

Allows injecting failures at specific saga steps to test compensation logic.
Controlled via environment variables or admin API.
"""
import random
from typing import Optional, Dict
from dataclasses import dataclass, field
from enum import Enum

from app.config import get_settings
import structlog

logger = structlog.get_logger()
settings = get_settings()


class FailureMode(str, Enum):
    ALWAYS = "always"
    PROBABILITY = "probability"
    NEVER = "never"


@dataclass
class ChaosConfig:
    """Configuration for chaos injection."""
    enabled: bool = False
    fail_step: Optional[str] = None
    failure_mode: FailureMode = FailureMode.ALWAYS
    failure_probability: float = 0.5
    step_overrides: Dict[str, float] = field(default_factory=dict)


_chaos_config = ChaosConfig()


def get_chaos_config() -> ChaosConfig:
    """Get the current chaos configuration."""
    global _chaos_config
    
    if settings.chaos_enabled and not _chaos_config.enabled:
        _chaos_config.enabled = True
        _chaos_config.fail_step = settings.chaos_fail_step or None
    
    return _chaos_config


def set_chaos_config(
    enabled: bool = None,
    fail_step: str = None,
    failure_mode: FailureMode = None,
    failure_probability: float = None,
    step_overrides: Dict[str, float] = None,
) -> ChaosConfig:
    """Update chaos configuration."""
    global _chaos_config
    
    if enabled is not None:
        _chaos_config.enabled = enabled
    if fail_step is not None:
        _chaos_config.fail_step = fail_step if fail_step else None
    if failure_mode is not None:
        _chaos_config.failure_mode = failure_mode
    if failure_probability is not None:
        _chaos_config.failure_probability = failure_probability
    if step_overrides is not None:
        _chaos_config.step_overrides = step_overrides
    
    logger.info(
        "Chaos config updated",
        enabled=_chaos_config.enabled,
        fail_step=_chaos_config.fail_step,
        failure_mode=_chaos_config.failure_mode.value,
        failure_probability=_chaos_config.failure_probability,
    )
    
    return _chaos_config


def should_inject_failure(step_name: str) -> bool:
    """
    Determine if a failure should be injected for the given step.
    
    Returns True if failure should be injected, False otherwise.
    """
    config = get_chaos_config()
    
    if not config.enabled:
        return False
    
    if config.fail_step and config.fail_step != step_name:
        return False
    
    probability = config.step_overrides.get(step_name, config.failure_probability)
    
    if config.failure_mode == FailureMode.ALWAYS:
        should_fail = True
    elif config.failure_mode == FailureMode.NEVER:
        should_fail = False
    else:
        should_fail = random.random() < probability
    
    if should_fail:
        logger.warning(
            "Chaos: Injecting failure",
            step_name=step_name,
            failure_mode=config.failure_mode.value,
            probability=probability,
        )
    
    return should_fail


class ChaosException(Exception):
    """Exception raised by chaos injection."""
    pass


def maybe_fail(step_name: str) -> None:
    """
    Check if failure should be injected and raise exception if so.
    
    Call this at the beginning of saga steps to inject failures.
    """
    if should_inject_failure(step_name):
        raise ChaosException(f"Chaos injection: {step_name} failed intentionally")
