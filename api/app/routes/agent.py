"""
Agent API endpoint for the shopping agent.

Provides a REST API for the LLM-powered shopping agent.
"""
import uuid
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    provider: str = Field(default="anthropic", pattern="^(anthropic|openai)$")


class ChatResponse(BaseModel):
    response: str
    session_id: str


_sessions = {}


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(request: ChatRequest) -> ChatResponse:
    """
    Chat with the shopping agent.
    
    The agent can search products, get details, and place orders.
    Idempotency keys are generated server-side, not by the LLM.
    """
    try:
        from agent.agent import ShoppingAgent
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Agent module not available. Install agent dependencies.",
        )
    
    session_id = request.session_id or str(uuid.uuid4())
    
    if session_id not in _sessions:
        _sessions[session_id] = ShoppingAgent(provider=request.provider)
    
    agent = _sessions[session_id]
    
    try:
        response = await agent.chat(request.message)
        return ChatResponse(response=response, session_id=session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent error: {str(e)}",
        )


@router.delete("/chat/{session_id}")
async def reset_session(session_id: str) -> dict:
    """Reset an agent session."""
    if session_id in _sessions:
        del _sessions[session_id]
    return {"status": "Session reset"}
