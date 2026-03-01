"""
Scan Results API - Shareable AR Roof Scanner Results with SMS Follow-up
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from twilio.rest import Client as TwilioClient
import os
import uuid
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

# Twilio setup
twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_token = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
twilio_client = None

if twilio_sid and twilio_token:
    try:
        twilio_client = TwilioClient(twilio_sid, twilio_token)
        logger.info("Twilio client initialized for SMS follow-ups")
    except Exception as e:
        logger.error(f"Twilio init error: {e}")

router = APIRouter(prefix="/api/scan-results", tags=["scan-results"])

class ScanResult(BaseModel):
    roof_area: int
    panel_count: int
    system_size: float
    estimated_savings: int
    estimated_cost: int
    payback_years: float
    address: Optional[str] = None
    rep_name: Optional[str] = None
    rep_phone: Optional[str] = None
    rep_email: Optional[str] = None

class ScanResultResponse(BaseModel):
    id: str
    share_url: str
    qr_data: str
    created_at: str

@router.post("/create", response_model=ScanResultResponse)
async def create_scan_result(scan: ScanResult):
    """Create a shareable scan result and return share URL"""
    scan_id = str(uuid.uuid4())[:8]  # Short ID for easy sharing
    
    result_doc = {
        "id": scan_id,
        "roof_area": scan.roof_area,
        "panel_count": scan.panel_count,
        "system_size": scan.system_size,
        "estimated_savings": scan.estimated_savings,
        "estimated_cost": scan.estimated_cost,
        "payback_years": scan.payback_years,
        "twenty_five_year_savings": scan.estimated_savings * 25,
        "address": scan.address,
        "rep_name": scan.rep_name,
        "rep_phone": scan.rep_phone,
        "rep_email": scan.rep_email,
        "created_at": datetime.utcnow(),
        "views": 0
    }
    
    await db.scan_results.insert_one(result_doc)
    
    # Generate share URL (will be handled by frontend routing)
    base_url = os.environ.get('FRONTEND_URL', 'https://elite-solar-rep.preview.emergentagent.com')
    share_url = f"{base_url}/solar-estimate/{scan_id}"
    
    return {
        "id": scan_id,
        "share_url": share_url,
        "qr_data": share_url,
        "created_at": result_doc["created_at"].isoformat()
    }

@router.get("/{scan_id}")
async def get_scan_result(scan_id: str):
    """Get a scan result by ID (for the shareable page)"""
    result = await db.scan_results.find_one({"id": scan_id}, {"_id": 0})
    
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found")
    
    # Increment view count
    await db.scan_results.update_one(
        {"id": scan_id},
        {"$inc": {"views": 1}}
    )
    
    # Convert datetime to string
    if isinstance(result.get('created_at'), datetime):
        result['created_at'] = result['created_at'].isoformat()
    
    return result


class SMSFollowUpRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None  # Optional email for drip campaigns

@router.post("/{scan_id}/send-sms")
async def send_sms_followup(scan_id: str, request: SMSFollowUpRequest):
    """Send SMS follow-up with estimate link to homeowner"""
    if not twilio_client:
        raise HTTPException(status_code=503, detail="SMS service not configured")
    
    # Get the scan result
    result = await db.scan_results.find_one({"id": scan_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found")
    
    # Format phone number
    phone = request.phone.strip()
    if not phone.startswith('+'):
        phone = '+1' + phone.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
    
    # Build personalized SMS message
    savings = result.get('estimated_savings', 0)
    savings_25yr = result.get('twenty_five_year_savings', savings * 25)
    rep_name = result.get('rep_name', 'Your Solar Consultant')
    
    base_url = os.environ.get('FRONTEND_URL', 'https://elite-solar-rep.preview.emergentagent.com')
    share_url = f"{base_url}/solar-estimate/{scan_id}"
    
    greeting = f"Hi {request.name}! " if request.name else ""
    message = f"""{greeting}Thanks for your interest in solar! 🌞

Your custom estimate shows you could save ${savings:,}/year (${savings_25yr:,} over 25 years)!

View your full estimate: {share_url}

Questions? Reply to this text or call {rep_name}.

- Solar Empire"""
    
    try:
        # Send SMS via Twilio
        sms = twilio_client.messages.create(
            body=message,
            from_=twilio_phone,
            to=phone
        )
        
        # Log the lead capture
        lead_capture = {
            "scan_id": scan_id,
            "phone": phone,
            "name": request.name,
            "sms_sid": sms.sid,
            "sent_at": datetime.utcnow(),
            "estimate_url": share_url,
            "status": "sent"
        }
        await db.sms_followups.insert_one(lead_capture)
        
        # Update scan result with lead info
        await db.scan_results.update_one(
            {"id": scan_id},
            {
                "$set": {
                    "lead_captured": True,
                    "lead_phone": phone,
                    "lead_name": request.name,
                    "sms_sent_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"SMS sent to {phone} for scan {scan_id}")
        
        # Send push notification to reps
        try:
            from routes.notifications import notify_new_lead
            await notify_new_lead(
                lead_name=request.name or "Homeowner",
                lead_phone=phone,
                scan_id=scan_id,
                savings=savings
            )
        except Exception as push_err:
            logger.warning(f"Push notification failed (SMS still sent): {push_err}")
        
        # Trigger CRM webhooks (Zapier, etc.)
        try:
            from routes.integrations import notify_crm_new_lead
            await notify_crm_new_lead({
                "name": request.name,
                "phone": phone,
                "scan_id": scan_id,
                "estimated_savings": savings,
                "estimated_cost": result.get('estimated_cost'),
                "system_size": result.get('system_size'),
                "roof_area": result.get('roof_area'),
                "panel_count": result.get('panel_count'),
                "payback_years": result.get('payback_years'),
                "estimate_url": share_url
            })
        except Exception as crm_err:
            logger.warning(f"CRM webhook failed (SMS still sent): {crm_err}")
        
        # Auto-enroll in email drip campaign if email provided
        if request.email:
            try:
                # Create a lead record for campaign enrollment
                import uuid as uuid_module
                lead_id = str(uuid_module.uuid4())
                lead_doc = {
                    "id": lead_id,
                    "name": request.name or "Homeowner",
                    "phone": phone,
                    "email": request.email,
                    "source": "qr_scan",
                    "scan_id": scan_id,
                    "estimated_savings": savings,
                    "estimated_cost": result.get('estimated_cost'),
                    "created_at": datetime.utcnow()
                }
                await db.leads.insert_one(lead_doc)
                
                # Auto-enroll in matching campaigns
                from routes.integrations import auto_enroll_lead_in_campaigns
                campaigns_enrolled = await auto_enroll_lead_in_campaigns(lead_id, "qr_scan")
                if campaigns_enrolled:
                    logger.info(f"Lead {lead_id} auto-enrolled in campaigns: {campaigns_enrolled}")
            except Exception as email_err:
                logger.warning(f"Email campaign enrollment failed (SMS still sent): {email_err}")
        
        return {
            "success": True,
            "message": "SMS sent successfully!",
            "phone": phone
        }
        
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.get("/leads/captured")
async def get_captured_leads():
    """Get all leads captured via SMS follow-up"""
    leads = await db.sms_followups.find({}, {"_id": 0}).sort("sent_at", -1).to_list(100)
    
    # Convert datetime to string
    for lead in leads:
        if isinstance(lead.get('sent_at'), datetime):
            lead['sent_at'] = lead['sent_at'].isoformat()
    
    return {"leads": leads, "total": len(leads)}
