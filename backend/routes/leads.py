"""
Lead Routes - Lead management, AI scoring, import/export
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from datetime import datetime
from database import db
from models import Lead, LeadCreate
from typing import List, Optional
import asyncio
import uuid
import csv
import io

router = APIRouter(prefix="/leads", tags=["leads"])


# Helper function for AI scoring (simplified - uses main server's implementation)
async def calculate_ai_score(lead_data: dict) -> dict:
    """Calculate AI score for a lead based on multiple factors"""
    score = 50.0  # Base score
    
    # Bill amount factor (higher bill = more savings potential)
    bill = lead_data.get('bill_amount', 150)
    if bill >= 300:
        score += 25
    elif bill >= 200:
        score += 15
    elif bill >= 150:
        score += 10
    
    # Homeowner factor
    if lead_data.get('homeowner', True):
        score += 10
    
    # Timeline factor
    timeline = lead_data.get('timeline', '3-6 months')
    if timeline == '0-3 months':
        score += 15
    elif timeline == '3-6 months':
        score += 10
    elif timeline == '6-12 months':
        score += 5
    
    # Roof type factor
    roof = lead_data.get('roof_type', 'asphalt')
    if roof in ['asphalt', 'metal']:
        score += 5
    
    score = min(100, max(0, score))
    probability = score / 100
    
    insights = []
    if bill >= 200:
        insights.append(f"High electric bill (${bill}/mo) indicates strong savings potential")
    if timeline == '0-3 months':
        insights.append("Ready to buy - prioritize immediate follow-up")
    if lead_data.get('homeowner'):
        insights.append("Homeowner - can make purchase decision")
    
    return {
        "ai_score": round(score, 1),
        "probability_to_close": round(probability, 2),
        "ai_insights": ". ".join(insights) if insights else "Standard lead profile"
    }


@router.post("/", response_model=Lead)
async def create_lead(lead_input: LeadCreate, send_sms_followup: bool = True):
    """Create a new lead with AI scoring"""
    lead_dict = lead_input.model_dump()
    lead_obj = Lead(**lead_dict)
    
    # Calculate AI score
    ai_result = await calculate_ai_score(lead_dict)
    lead_obj.ai_score = ai_result["ai_score"]
    lead_obj.probability_to_close = ai_result["probability_to_close"]
    lead_obj.ai_insights = ai_result["ai_insights"]
    
    # Find matching territory
    territory = await db.territories.find_one({"zip_codes": lead_obj.zip_code})
    if territory:
        lead_obj.territory_id = territory.get("id")
        lead_obj.assigned_rep_id = territory.get("assigned_rep_id")
        await db.territories.update_one(
            {"id": territory.get("id")},
            {"$inc": {"lead_count": 1}}
        )
    
    await db.leads.insert_one(lead_obj.model_dump())
    
    # Update rep stats if assigned
    if lead_obj.assigned_rep_id:
        await db.reps.update_one(
            {"id": lead_obj.assigned_rep_id},
            {"$inc": {"leads_assigned": 1}}
        )
    
    return lead_obj


@router.get("/", response_model=List[Lead])
async def get_leads(
    status: Optional[str] = None,
    rep_id: Optional[str] = None,
    territory_id: Optional[str] = None,
    min_score: Optional[float] = None,
    limit: int = 100
):
    """Get leads with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if rep_id:
        query["assigned_rep_id"] = rep_id
    if territory_id:
        query["territory_id"] = territory_id
    if min_score:
        query["ai_score"] = {"$gte": min_score}
    
    leads = await db.leads.find(query).sort("ai_score", -1).limit(limit).to_list(limit)
    return [Lead(**lead) for lead in leads]


@router.get("/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    """Get a single lead by ID"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return Lead(**lead)


@router.put("/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, updates: dict):
    """Update a lead"""
    updates["updated_at"] = datetime.utcnow()
    result = await db.leads.update_one({"id": lead_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.leads.find_one({"id": lead_id})
    return Lead(**lead)


@router.post("/{lead_id}/rescore", response_model=Lead)
async def rescore_lead(lead_id: str):
    """Re-calculate AI score for a lead"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    ai_result = await calculate_ai_score(lead)
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "ai_score": ai_result["ai_score"],
            "probability_to_close": ai_result["probability_to_close"],
            "ai_insights": ai_result["ai_insights"],
            "updated_at": datetime.utcnow()
        }}
    )
    
    lead = await db.leads.find_one({"id": lead_id})
    return Lead(**lead)


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead"""
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}
