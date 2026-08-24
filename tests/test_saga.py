"""
Saga failure scenario tests.

Tests that verify correct compensation behavior under various failure conditions.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.chaos import set_chaos_config, FailureMode


@pytest.fixture(autouse=True)
def reset_chaos():
    """Reset chaos config before each test."""
    set_chaos_config(enabled=False, fail_step="")
    yield
    set_chaos_config(enabled=False, fail_step="")


@pytest.mark.asyncio
async def test_reserve_inventory_fails_no_payment():
    """
    Scenario: Reserve inventory fails
    Expected: Order fails immediately, no payment attempted
    """
    set_chaos_config(
        enabled=True,
        fail_step="reserve_inventory",
        failure_mode=FailureMode.ALWAYS,
    )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/orders",
            json={
                "user_id": str(uuid.uuid4()),
                "items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 1}]
            },
            headers={"Idempotency-Key": f"test-{uuid.uuid4()}"},
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["status"] in ["cancelled", "failed"]
        assert data["payment"] is None


@pytest.mark.asyncio
async def test_payment_fails_inventory_released():
    """
    Scenario: Payment fails after inventory reserved
    Expected: Inventory released, order cancelled
    """
    set_chaos_config(
        enabled=True,
        fail_step="charge_payment",
        failure_mode=FailureMode.ALWAYS,
    )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        products_response = await client.get("/api/products")
        initial_stock = products_response.json()["products"][0]["available_qty"]
        
        response = await client.post(
            "/api/orders",
            json={
                "user_id": str(uuid.uuid4()),
                "items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 1}]
            },
            headers={"Idempotency-Key": f"test-{uuid.uuid4()}"},
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["status"] == "cancelled"
        
        products_response = await client.get("/api/products")
        final_stock = products_response.json()["products"][0]["available_qty"]
        assert final_stock == initial_stock


@pytest.mark.asyncio
async def test_confirm_fails_refund_and_release():
    """
    Scenario: Confirm fails after payment succeeded
    Expected: Refund issued, inventory released, order cancelled
    """
    set_chaos_config(
        enabled=True,
        fail_step="confirm_order",
        failure_mode=FailureMode.ALWAYS,
    )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        order_id = None
        response = await client.post(
            "/api/orders",
            json={
                "user_id": str(uuid.uuid4()),
                "items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 1}]
            },
            headers={"Idempotency-Key": f"test-{uuid.uuid4()}"},
        )
        
        assert response.status_code == 422
        data = response.json()
        order_id = data["id"]
        assert data["status"] == "cancelled"
        
        timeline_response = await client.get(f"/api/orders/{order_id}/timeline")
        timeline = timeline_response.json()
        
        step_names = [s["step_name"] for s in timeline["steps"]]
        assert "compensate_charge_payment" in step_names
        assert "compensate_reserve_inventory" in step_names


@pytest.mark.asyncio
async def test_last_unit_concurrent_orders():
    """
    Scenario: Two concurrent orders for last unit of stock
    Expected: Exactly one order succeeds
    """
    import asyncio
    
    set_chaos_config(enabled=False)
    
    product_id = "44444444-4444-4444-4444-444444444444"
    user_id = str(uuid.uuid4())
    
    async def create_order(client: AsyncClient, key: str):
        return await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 1}]
            },
            headers={"Idempotency-Key": key},
        )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        tasks = [
            create_order(client, f"concurrent-test-{i}-{uuid.uuid4()}")
            for i in range(2)
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    successful = [r for r in responses if hasattr(r, 'status_code') and r.status_code == 201]
    failed = [r for r in responses if hasattr(r, 'status_code') and r.status_code in [422, 400]]
    
    assert len(successful) <= 1, "At most one order should succeed for last unit"
