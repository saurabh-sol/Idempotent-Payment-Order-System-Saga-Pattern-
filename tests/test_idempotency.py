import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_idempotency_20_concurrent_requests():
    """
    Test that 20 concurrent identical requests with the same idempotency key
    result in exactly 1 order being created.
    """
    idempotency_key = f"test-key-{uuid.uuid4()}"
    user_id = str(uuid.uuid4())
    product_id = "11111111-1111-1111-1111-111111111111"
    
    request_body = {
        "user_id": user_id,
        "items": [
            {"product_id": product_id, "quantity": 1}
        ]
    }
    
    async def make_request(client: AsyncClient, req_num: int):
        """Make a single order request."""
        try:
            response = await client.post(
                "/api/orders",
                json=request_body,
                headers={"Idempotency-Key": idempotency_key},
            )
            return {
                "request_num": req_num,
                "status_code": response.status_code,
                "body": response.json() if response.status_code in [200, 201] else None,
            }
        except Exception as e:
            return {
                "request_num": req_num,
                "error": str(e),
            }
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        tasks = [make_request(client, i) for i in range(20)]
        results = await asyncio.gather(*tasks)
    
    successful_responses = [r for r in results if r.get("status_code") in [200, 201]]
    
    assert len(successful_responses) >= 1, "At least one request should succeed"
    
    order_ids = set()
    for r in successful_responses:
        if r.get("body") and "id" in r["body"]:
            order_ids.add(r["body"]["id"])
    
    assert len(order_ids) == 1, f"Expected exactly 1 unique order, got {len(order_ids)}"
    
    print(f"\n20 concurrent requests -> {len(order_ids)} order created")
    print(f"Successful responses: {len(successful_responses)}")
    print(f"Order ID: {list(order_ids)[0]}")


@pytest.mark.asyncio
async def test_idempotency_key_required():
    """Test that Idempotency-Key header is required for POST /api/orders."""
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
        )
        assert response.status_code == 400
        assert "Idempotency-Key" in response.json()["detail"]


@pytest.mark.asyncio
async def test_idempotency_conflict_different_body():
    """Test that reusing an idempotency key with different body returns 409."""
    idempotency_key = f"conflict-test-{uuid.uuid4()}"
    user_id = str(uuid.uuid4())
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response1 = await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 1}]
            },
            headers={"Idempotency-Key": idempotency_key},
        )
        assert response1.status_code == 201
        
        response2 = await client.post(
            "/api/orders",
            json={
                "user_id": user_id,
                "items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 2}]
            },
            headers={"Idempotency-Key": idempotency_key},
        )
        assert response2.status_code == 409
        assert "different request body" in response2.json()["detail"]
