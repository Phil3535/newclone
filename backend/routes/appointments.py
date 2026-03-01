"""
Appointment Routes - Appointment scheduling and management
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from database import db
from models import Appointment, AppointmentCreate
from typing import List, Optional

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("/", response_model=Appointment)
async def create_appointment(appt_input: AppointmentCreate, send_sms_reminder: bool = True):
    """Create a new appointment"""
    appt_dict = appt_input.model_dump()
    appt_obj = Appointment(**appt_dict)
    
    # Get lead info
    lead = await db.leads.find_one({"id": appt_input.lead_id})
    if lead:
        appt_obj.lead_name = lead.get("name")
        appt_obj.lead_address = lead.get("address")
        await db.leads.update_one(
            {"id": appt_input.lead_id},
            {"$set": {"status": "appointment_set", "updated_at": datetime.utcnow()}}
        )
    
    await db.appointments.insert_one(appt_obj.model_dump())
    
    # Update rep stats
    await db.reps.update_one(
        {"id": appt_input.rep_id},
        {"$inc": {"appointments_scheduled": 1}}
    )
    
    return appt_obj


@router.get("/", response_model=List[Appointment])
async def get_appointments(
    rep_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None
):
    """Get appointments with optional filters"""
    query = {}
    if rep_id:
        query["rep_id"] = rep_id
    if status:
        query["status"] = status
    if date:
        try:
            target_date = datetime.fromisoformat(date)
            next_day = target_date + timedelta(days=1)
            query["scheduled_time"] = {"$gte": target_date, "$lt": next_day}
        except:
            pass
    
    appointments = await db.appointments.find(query).sort("scheduled_time", 1).to_list(100)
    return [Appointment(**a) for a in appointments]


@router.get("/today/{rep_id}")
async def get_todays_appointments(rep_id: str):
    """Get today's appointments for a rep"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    appointments = await db.appointments.find({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": tomorrow}
    }).sort("scheduled_time", 1).to_list(50)
    
    return {"appointments": [Appointment(**a).model_dump() for a in appointments]}


@router.get("/week/{rep_id}")
async def get_week_appointments(rep_id: str):
    """Get this week's appointments for a rep"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today + timedelta(days=7)
    
    appointments = await db.appointments.find({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": week_end}
    }).sort("scheduled_time", 1).to_list(100)
    
    return {"appointments": [Appointment(**a).model_dump() for a in appointments]}


@router.get("/{appt_id}", response_model=Appointment)
async def get_appointment(appt_id: str):
    """Get a single appointment"""
    appointment = await db.appointments.find_one({"id": appt_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return Appointment(**appointment)


@router.put("/{appt_id}", response_model=Appointment)
async def update_appointment(appt_id: str, updates: dict):
    """Update an appointment"""
    result = await db.appointments.update_one({"id": appt_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment = await db.appointments.find_one({"id": appt_id})
    return Appointment(**appointment)


@router.post("/{appt_id}/complete")
async def complete_appointment(appt_id: str, outcome: str = "completed"):
    """Mark an appointment as completed"""
    appointment = await db.appointments.find_one({"id": appt_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.appointments.update_one(
        {"id": appt_id},
        {"$set": {"status": "completed", "outcome": outcome}}
    )
    
    # Update rep stats
    await db.reps.update_one(
        {"id": appointment.get("rep_id")},
        {"$inc": {"appointments_completed": 1}}
    )
    
    return {"success": True, "outcome": outcome}


@router.delete("/{appt_id}")
async def delete_appointment(appt_id: str):
    """Delete an appointment"""
    result = await db.appointments.delete_one({"id": appt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True}
