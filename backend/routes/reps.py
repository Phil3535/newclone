"""
Rep Routes - Sales rep management and leaderboard
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import db
from models import Rep, RepCreate, LeaderboardEntry
from typing import List, Optional

router = APIRouter(prefix="/reps", tags=["reps"])


@router.post("/", response_model=Rep)
async def create_rep(rep_input: RepCreate):
    """Create a new sales rep"""
    rep_dict = rep_input.model_dump()
    rep_obj = Rep(**rep_dict)
    await db.reps.insert_one(rep_obj.model_dump())
    return rep_obj


@router.get("/", response_model=List[Rep])
async def get_reps():
    """Get all reps"""
    reps = await db.reps.find().sort("revenue_achieved", -1).to_list(100)
    return [Rep(**r) for r in reps]


@router.get("/{rep_id}", response_model=Rep)
async def get_rep(rep_id: str):
    """Get a single rep"""
    rep = await db.reps.find_one({"id": rep_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    return Rep(**rep)


@router.put("/{rep_id}", response_model=Rep)
async def update_rep(rep_id: str, updates: dict):
    """Update a rep"""
    result = await db.reps.update_one({"id": rep_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Rep not found")
    
    rep = await db.reps.find_one({"id": rep_id})
    return Rep(**rep)


@router.delete("/{rep_id}")
async def delete_rep(rep_id: str):
    """Delete a rep"""
    result = await db.reps.delete_one({"id": rep_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rep not found")
    return {"success": True}
