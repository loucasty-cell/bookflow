import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("bookflow.social")

router = APIRouter(prefix="/api/social", tags=["social"])

# Pydantic models to define the schema without connecting a real DB yet
class ReactionBase(BaseModel):
    paragraph_hash: str
    quote: str
    user_id: str
    reflection: str
    resonance_score: int

class ReactionResponse(ReactionBase):
    id: str
    created_at: float

class SessionPulse(BaseModel):
    session_id: str
    book_id: str
    active_paragraph: str
    idle_time_ms: int

# Mock data store since database is not connected yet
MOCK_RESONANCES = [
    {
        "id": "res-1",
        "paragraph_hash": "mock-hash-1",
        "quote": "The cognitive load theory will finally meet its match.",
        "user_id": "reader-492",
        "reflection": "This completely changed how I view web architecture.",
        "resonance_score": 14,
        "created_at": 1700000000.0
    },
    {
        "id": "res-2",
        "paragraph_hash": "mock-hash-1",
        "quote": "chaotic reality of modern web design.",
        "user_id": "reader-105",
        "reflection": "A perfect metaphor for the JS ecosystem.",
        "resonance_score": 8,
        "created_at": 1700000100.0
    }
]

@router.get("/resonance/{paragraph_hash}", response_model=List[ReactionResponse])
async def get_resonance(paragraph_hash: str):
    """
    Fetch community reflections (whispers) for a specific paragraph.
    Currently returns mock data as the database is intentionally disconnected.
    """
    # In Phase 2 DB connection, we would do:
    # return db.query(Reaction).filter(Reaction.paragraph_hash == paragraph_hash).all()
    
    # Returning mock data to keep the frontend running smoothly
    return MOCK_RESONANCES

@router.post("/events/session-pulse", status_code=202)
async def track_session_pulse(pulse: SessionPulse):
    """
    Track reading idle time to feed into the Intervention Engine.
    """
    logger.info(f"Received session pulse for book {pulse.book_id}, idle: {pulse.idle_time_ms}ms")
    return {"status": "tracked"}
