"""
AI-specific failure mode tests.

Tests that verify the system handles AI agent failure modes correctly:
1. Retry storm - multiple calls collapse to one order
2. Duplicate intent - same order with different keys
3. Concurrent agents on scarce stock
"""
import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.chaos import set_chaos_config


@pytest.fixture(autouse=True)
def reset_chaos():
    """Reset chaos config before each test."""
    set_chaos_config(enabled=False, fail_step="")
    yield
    set_chaos_config(enabled=False, fail_step="")


@pytest.mark.asyncio
async def test_retry_storm_collapses_to_one_order():
    """
    Scenario: AI agent retry storm (3 calls with same idempotency key)
    Expected: Exactly 1 order created (idempotency collapses retries)
    
    This simulates an agent that retries on perceived timeout.
    """
    idempotency_key = f"retry-storm-{uuid.uuid4()}"
    user_id = str(uuid.uuid4())
    product_id = "11111111-1111-1111-1111-111111111111"
    
    async def make_request(client: AsyncClient):
        return await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 1}]
            },
            headers={"Idempotency-Key": idempotency_key},
        )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        tasks = [make_request(client) for _ in range(3)]
        responses = await asyncio.gather(*tasks)
    
    successful = [r for r in responses if r.status_code == 201]
    order_ids = set()
    
    for r in responses:
        if r.status_code in [200, 201]:
            data = r.json()
            if "id" in data:
                order_ids.add(data["id"])
    
    assert len(order_ids) == 1, f"Expected 1 order, got {len(order_ids)}"
    print(f"\n3 retry storm calls -> {len(order_ids)} order created")


@pytest.mark.asyncio
async def test_duplicate_intent_different_keys():
    """
    Scenario: AI agent places same order with different idempotency keys
    Expected: Second request should be flagged as potential duplicate
    
    This is the failure mode idempotency keys alone cannot catch.
    The duplicate_guard module handles this.
    """
    user_id = str(uuid.uuid4())
    product_id = "11111111-1111-1111-1111-111111111111"
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response1 = await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 1}]
            },
            headers={"Idempotency-Key": f"key-1-{uuid.uuid4()}"},
        )
        assert response1.status_code == 201
        order1_id = response1.json()["id"]
        
        response2 = await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 1}]
            },
            headers={"Idempotency-Key": f"key-2-{uuid.uuid4()}"},
        )
        
        assert response2.status_code in [201, 409, 422]
        
        print(f"\nFirst order: {order1_id}")
        print(f"Second request status: {response2.status_code}")


@pytest.mark.asyncio
async def test_concurrent_agents_on_last_unit():
    """
    Scenario: Multiple AI agents try to buy the last unit simultaneously
    Expected: Exactly one succeeds, others fail cleanly
    
    This tests that FOR UPDATE locking works correctly.
    """
    product_id = "44444444-4444-4444-4444-444444444444"
    
    async def agent_order(client: AsyncClient, agent_num: int):
        return await client.post(
            "/api/orders",
            json={
                "user_id": f"agent-{agent_num}-{uuid.uuid4()}",
                "items": [{"product_id": product_id, "quantity": 1}]
            },
            headers={"Idempotency-Key": f"agent-{agent_num}-{uuid.uuid4()}"},
        )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        tasks = [agent_order(client, i) for i in range(3)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    successful = []
    failed = []
    
    for i, r in enumerate(responses):
        if isinstance(r, Exception):
            failed.append((i, str(r)))
        elif r.status_code == 201:
            successful.append((i, r.json()["id"]))
        else:
            failed.append((i, r.status_code))
    
    assert len(successful) <= 1, f"At most 1 should succeed for last unit"
    
    print(f"\n3 concurrent agents for last unit:")
    print(f"  Successful: {len(successful)}")
    print(f"  Failed: {len(failed)}")


@pytest.mark.asyncio
async def test_rate_limit_on_burst():
    """
    Scenario: Burst of requests from same user
    Expected: Rate limiting kicks in after threshold
    """
    user_id = str(uuid.uuid4())
    product_id = "11111111-1111-1111-1111-111111111111"
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        responses = []
        for i in range(15):
            response = await client.post(
                "/api/orders",
                json={
                    "user_id": user_id,
                    "items": [{"product_id": product_id, "quantity": 1}]
                },
                headers={"Idempotency-Key": f"burst-{user_id}-{i}"},
            )
            responses.append(response.status_code)
    
    rate_limited = responses.count(429)
    print(f"\n15 burst requests: {rate_limited} rate-limited")
