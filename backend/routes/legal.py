"""
Legal Agreement Routes - NDA, Terms of Service, Privacy Policy
Supports version tracking and re-acceptance when documents are updated
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime
from database import db

router = APIRouter(prefix="/legal", tags=["legal"])

# Current legal document version - increment this when documents are updated
# Format: MAJOR.MINOR (e.g., "1.0" -> "1.1" for minor changes, "2.0" for major changes)
LEGAL_VERSION = "1.0"

# Version history for audit purposes
VERSION_HISTORY = {
    "1.0": {
        "release_date": "2026-02-20",
        "changes": ["Initial version - Terms of Service, Privacy Policy, NDA, Acceptable Use Policy"]
    }
}


@router.post("/accept")
async def accept_legal_agreements(request: Request):
    """Record user's acceptance of legal agreements"""
    data = await request.json()
    user_id = data.get("user_id")
    
    acceptance_record = {
        "user_id": user_id,
        "accepted_at": data.get("accepted_at", datetime.utcnow().isoformat()),
        "agreements": data.get("agreements", []),
        "version": data.get("version", LEGAL_VERSION),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "created_at": datetime.utcnow()
    }
    
    # Upsert - update if exists, insert if not
    await db.legal_acceptances.update_one(
        {"user_id": user_id},
        {"$set": acceptance_record},
        upsert=True
    )
    
    return {"success": True, "message": "Legal agreements accepted", "version": LEGAL_VERSION}


@router.get("/status/{user_id}")
async def get_legal_status(user_id: str):
    """Check if user has accepted all required legal agreements and if re-acceptance is needed"""
    acceptance = await db.legal_acceptances.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if acceptance:
        user_version = acceptance.get("version", "1.0")
        needs_reaccept = user_version != LEGAL_VERSION
        
        return {
            "accepted": True,
            "accepted_at": acceptance.get("accepted_at"),
            "version": acceptance.get("version"),
            "agreements": acceptance.get("agreements", []),
            "needs_reaccept": needs_reaccept,
            "current_version": LEGAL_VERSION,
            "version_changes": VERSION_HISTORY.get(LEGAL_VERSION, {}).get("changes", []) if needs_reaccept else []
        }
    
    return {
        "accepted": False, 
        "current_version": LEGAL_VERSION,
        "needs_reaccept": False
    }


@router.get("/version")
async def get_legal_version():
    """Get current legal document version and history"""
    return {
        "version": LEGAL_VERSION,
        "history": VERSION_HISTORY
    }


@router.get("/history/{user_id}")
async def get_acceptance_history(user_id: str):
    """Get user's acceptance history for audit purposes"""
    history = await db.legal_acceptance_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("accepted_at", -1).to_list(50)
    
    return {"user_id": user_id, "history": history}
