"""
Saga Orchestrator: coordinates the order processing saga.

Steps executed in order:
1. reserve_inventory - Reserve stock for the order
2. charge_payment - Charge the customer via Stripe
3. confirm_order - Finalize the order

On failure at any step, compensating actions are executed in reverse order.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Callable, Awaitable, Any
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Order, SagaStep, SagaStepStatus, OrderStatus
from app.outbox import EventType, publish_saga_event
from app.saga.steps import (
    reserve_inventory,
    release_inventory,
    charge_payment,
    refund_payment,
    confirm_order,
    cancel_order,
    PaymentGateway,
    MockPaymentGateway,
)
import structlog

logger = structlog.get_logger()


@dataclass
class StepDefinition:
    """Definition of a saga step with its forward and compensate actions."""
    name: str
    forward: Callable[..., Awaitable[Any]]
    compensate: Optional[Callable[..., Awaitable[Any]]] = None


class SagaOrchestrator:
    """
    Orchestrates the order processing saga.
    
    The orchestrator:
    1. Executes steps in sequence
    2. Logs each step transition to saga_steps table
    3. On failure, executes compensating actions in reverse order
    4. Ensures order status is never left in an inconsistent state
    """
    
    def __init__(
        self,
        db: AsyncSession,
        payment_gateway: Optional[PaymentGateway] = None,
    ):
        self.db = db
        self.payment_gateway = payment_gateway or MockPaymentGateway()
        self.completed_steps: List[str] = []
        self._order: Optional[Order] = None

    async def _load_order(self, order_id: uuid.UUID) -> Order:
        if self._order is None or self._order.id != order_id:
            result = await self.db.execute(select(Order).where(Order.id == order_id))
            self._order = result.scalar_one()
        return self._order

    async def _emit_step_event(self, order_id: uuid.UUID, step_name: str) -> None:
        order = await self._load_order(order_id)
        event_map = {
            "reserve_inventory": EventType.INVENTORY_RESERVED,
            "charge_payment": EventType.PAYMENT_SUCCEEDED,
            "confirm_order": EventType.ORDER_CONFIRMED,
        }
        event_type = event_map.get(step_name)
        if event_type:
            await publish_saga_event(
                self.db,
                event_type,
                order_id,
                order.user_id,
                step_name=step_name,
            )
    
    async def execute(
        self,
        order_id: uuid.UUID,
        idempotency_key: str,
    ) -> bool:
        """
        Execute the order saga.
        
        Returns True if saga completed successfully, False if compensated.
        """
        steps = self._get_steps(order_id, idempotency_key)
        await self._load_order(order_id)
        
        try:
            for step in steps:
                await self._execute_step(order_id, step)
                await self._emit_step_event(order_id, step.name)

            await publish_saga_event(
                self.db,
                EventType.SAGA_COMPLETED,
                order_id,
                self._order.user_id,
            )
            await self.db.commit()
            logger.info(
                "Saga completed successfully",
                order_id=str(order_id),
                steps=self.completed_steps,
            )
            return True
            
        except Exception as e:
            logger.error(
                "Saga step failed, starting compensation",
                order_id=str(order_id),
                error=str(e),
                completed_steps=self.completed_steps,
            )
            
            await self._compensate(order_id, idempotency_key, str(e))
            return False
    
    def _get_steps(
        self,
        order_id: uuid.UUID,
        idempotency_key: str,
    ) -> List[StepDefinition]:
        """Define the saga steps."""
        return [
            StepDefinition(
                name="reserve_inventory",
                forward=lambda: reserve_inventory(order_id, self.db),
                compensate=lambda: release_inventory(order_id, self.db),
            ),
            StepDefinition(
                name="charge_payment",
                forward=lambda: charge_payment(
                    order_id, self.db, self.payment_gateway, idempotency_key
                ),
                compensate=lambda: refund_payment(
                    order_id, self.db, self.payment_gateway, idempotency_key
                ),
            ),
            StepDefinition(
                name="confirm_order",
                forward=lambda: confirm_order(order_id, self.db),
                compensate=lambda: cancel_order(order_id, self.db),
            ),
        ]
    
    async def _execute_step(
        self,
        order_id: uuid.UUID,
        step: StepDefinition,
    ) -> Any:
        """Execute a single saga step with logging."""
        saga_step = SagaStep(
            order_id=order_id,
            step_name=step.name,
            status=SagaStepStatus.STARTED.value,
        )
        self.db.add(saga_step)
        await self.db.flush()
        
        logger.info(
            "Executing saga step",
            order_id=str(order_id),
            step=step.name,
        )
        
        try:
            result = await step.forward()
            
            saga_step.status = SagaStepStatus.SUCCEEDED.value
            saga_step.completed_at = datetime.utcnow()
            await self.db.flush()
            
            self.completed_steps.append(step.name)
            
            logger.info(
                "Saga step succeeded",
                order_id=str(order_id),
                step=step.name,
            )
            
            return result
            
        except Exception as e:
            saga_step.status = SagaStepStatus.FAILED.value
            saga_step.error_message = str(e)
            saga_step.completed_at = datetime.utcnow()
            await self.db.flush()
            
            logger.error(
                "Saga step failed",
                order_id=str(order_id),
                step=step.name,
                error=str(e),
            )
            raise
    
    async def _compensate(
        self,
        order_id: uuid.UUID,
        idempotency_key: str,
        failure_reason: str,
    ) -> None:
        """Execute compensating actions in reverse order."""
        order = await self._load_order(order_id)
        order.status = OrderStatus.COMPENSATING.value
        await self.db.flush()

        await publish_saga_event(
            self.db,
            EventType.SAGA_COMPENSATING,
            order_id,
            order.user_id,
            error_message=failure_reason,
        )
        
        steps = self._get_steps(order_id, idempotency_key)
        
        for step in reversed(steps):
            if step.name not in self.completed_steps:
                continue
            
            if step.compensate is None:
                continue
            
            saga_step = SagaStep(
                order_id=order_id,
                step_name=f"compensate_{step.name}",
                status=SagaStepStatus.STARTED.value,
            )
            self.db.add(saga_step)
            await self.db.flush()
            
            logger.info(
                "Executing compensation",
                order_id=str(order_id),
                step=step.name,
            )
            
            try:
                await step.compensate()
                
                saga_step.status = SagaStepStatus.COMPENSATED.value
                saga_step.completed_at = datetime.utcnow()
                await self.db.flush()
                
                logger.info(
                    "Compensation succeeded",
                    order_id=str(order_id),
                    step=step.name,
                )
                
            except Exception as e:
                saga_step.status = SagaStepStatus.FAILED.value
                saga_step.error_message = str(e)
                saga_step.completed_at = datetime.utcnow()
                await self.db.flush()
                
                logger.error(
                    "Compensation failed",
                    order_id=str(order_id),
                    step=step.name,
                    error=str(e),
                )
        
        order.status = OrderStatus.CANCELLED.value
        await publish_saga_event(
            self.db,
            EventType.ORDER_CANCELLED,
            order_id,
            order.user_id,
            error_message=failure_reason,
        )
        await self.db.commit()
        
        logger.info(
            "Saga compensation completed",
            order_id=str(order_id),
            failure_reason=failure_reason,
        )
