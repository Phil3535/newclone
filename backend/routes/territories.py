"""
Territory Routes - Territory management and heatmap data
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import db
from models import Territory, TerritoryCreate
from typing import List, Optional

router = APIRouter(prefix="/territories", tags=["territories"])


async def calculate_territory_priority(territory_data: dict) -> float:
    """Calculate territory priority score"""
    priority = 50.0
    
    close_rate = territory_data.get('close_rate', 0.15)
    priority += close_rate * 100
    
    home_value = territory_data.get('avg_home_value', 350000)
    if home_value >= 500000:
        priority += 20
    elif home_value >= 350000:
        priority += 10
    
    utility_rate = territory_data.get('utility_rate', 0.12)
    priority += utility_rate * 100
    
    incentives = territory_data.get('incentives_available', 0)
    priority += min(incentives / 1000, 10)
    
    return round(min(100, priority), 1)


@router.post("/", response_model=Territory)
async def create_territory(territory_input: TerritoryCreate):
    """Create a new territory"""
    territory_dict = territory_input.model_dump()
    territory_obj = Territory(**territory_dict)
    territory_obj.priority_score = await calculate_territory_priority(territory_dict)
    
    await db.territories.insert_one(territory_obj.model_dump())
    return territory_obj


@router.get("/", response_model=List[Territory])
async def get_territories(rep_id: Optional[str] = None):
    """Get all territories"""
    query = {}
    if rep_id:
        query["assigned_rep_id"] = rep_id
    
    territories = await db.territories.find(query).sort("priority_score", -1).to_list(100)
    return [Territory(**t) for t in territories]


@router.get("/heatmap/data")
async def get_heatmap_data():
    """Get territory data for heat map visualization"""
    territories = await db.territories.find().to_list(100)
    
    heatmap_data = []
    for t in territories:
        for zip_code in t.get("zip_codes", []):
            heatmap_data.append({
                "zip_code": zip_code,
                "territory_id": t.get("id"),
                "territory_name": t.get("name"),
                "priority_score": t.get("priority_score", 0),
                "close_rate": t.get("close_rate", 0),
                "lead_count": t.get("lead_count", 0),
                "assigned_rep": t.get("assigned_rep_id")
            })
    
    return {"heatmap": heatmap_data, "total_territories": len(territories)}


@router.get("/{territory_id}", response_model=Territory)
async def get_territory(territory_id: str):
    """Get a single territory"""
    territory = await db.territories.find_one({"id": territory_id})
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    return Territory(**territory)


@router.put("/{territory_id}", response_model=Territory)
async def update_territory(territory_id: str, updates: dict):
    """Update a territory"""
    if any(k in updates for k in ['close_rate', 'avg_home_value', 'utility_rate', 'incentives_available']):
        territory = await db.territories.find_one({"id": territory_id})
        if territory:
            merged = {**territory, **updates}
            updates["priority_score"] = await calculate_territory_priority(merged)
    
    result = await db.territories.update_one({"id": territory_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    territory = await db.territories.find_one({"id": territory_id})
    return Territory(**territory)


@router.delete("/{territory_id}")
async def delete_territory(territory_id: str):
    """Delete a territory"""
    result = await db.territories.delete_one({"id": territory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Territory not found")
    return {"success": True}
