"""
Email Drip Campaign System - Automated Lead Nurturing
Works with Zapier webhooks OR direct email API (Resend/SendGrid)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import logging

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

router = APIRouter(prefix="/api/email-campaigns", tags=["email-campaigns"])

# ============ EMAIL TEMPLATES ============

EMAIL_TEMPLATES = {
    "welcome": {
        "subject": "Welcome to Solar Empire - Your Solar Journey Starts Here! ☀️",
        "delay_hours": 0,
        "template": """
Hi {name},

Thanks for checking out your solar savings estimate!

You could save ${annual_savings}/year with solar panels. That's ${lifetime_savings} over 25 years!

Here's what you need to know:
• Federal Tax Credit: Save 30% on installation costs
• Your estimated system: {system_size} kW ({panel_count} panels)
• Payback period: Just {payback_years} years

Ready to take the next step? Reply to this email or call me directly.

{rep_name}
{rep_phone}
Solar Empire
"""
    },
    "day_3_benefits": {
        "subject": "3 Reasons Homeowners Are Going Solar in 2026",
        "delay_hours": 72,
        "template": """
Hi {name},

Still thinking about solar? Here's why now is the perfect time:

1. LOCK IN SAVINGS - Utility rates are rising 5% annually. Solar locks in your rate forever.

2. 30% TAX CREDIT - The federal tax credit won't last forever. Claim it while you can.

3. HOME VALUE BOOST - Solar homes sell for 4.1% more on average.

Your estimate showed ${annual_savings}/year in savings. Let's make that happen!

Want to learn more? Just reply to this email.

{rep_name}
Solar Empire
"""
    },
    "day_7_urgency": {
        "subject": "Your Solar Quote is Expiring Soon ⏰",
        "delay_hours": 168,
        "template": """
Hi {name},

I wanted to follow up on your solar estimate from last week.

Your numbers:
• System Size: {system_size} kW
• Annual Savings: ${annual_savings}
• 25-Year Savings: ${lifetime_savings}

Pricing is locked for the next 7 days. After that, material costs may change.

Can we schedule a quick 15-minute call this week? I'll answer any questions you have.

{rep_name}
{rep_phone}
Solar Empire
"""
    },
    "day_14_testimonial": {
        "subject": "How the Martinez Family Cut Their Electric Bill by 90%",
        "delay_hours": 336,
        "template": """
Hi {name},

I wanted to share a quick success story...

The Martinez family in your area was paying $350/month for electricity. After going solar:
• Monthly payment: $180 (including their solar loan!)
• Net savings: $170/month
• 25-year savings: Over $50,000

They said: "We wish we had done this years ago. The process was so easy."

You could have similar results with your {system_size} kW system.

Ready to join them? Let's talk!

{rep_name}
Solar Empire
"""
    },
    "day_30_lastchance": {
        "subject": "Last Call: Your Personalized Solar Offer",
        "delay_hours": 720,
        "template": """
Hi {name},

This is my final follow-up about your solar estimate.

I don't want you to miss out on:
✓ ${annual_savings}/year in savings
✓ 30% Federal Tax Credit (${tax_credit} value)
✓ Protection from rising utility rates

If now isn't the right time, I understand. But if you have any questions at all, I'm here to help.

Just reply "INTERESTED" and I'll reach out with next steps.

Best,
{rep_name}
Solar Empire
"""
    }
}


# ============ MODELS ============

class CampaignEnrollment(BaseModel):
    lead_id: str
    email: EmailStr
    name: str
    estimated_savings: int = 0
    system_size: float = 0
    panel_count: int = 0
    payback_years: float = 0
    rep_name: str = "Your Solar Consultant"
    rep_phone: str = ""

class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    lead_id: Optional[str] = None


# ============ EMAIL SENDING ============

async def send_via_zapier(to_email: str, subject: str, body: str, lead_id: str = None) -> dict:
    """Send email via Zapier webhook"""
    webhooks = await db.webhooks.find({"active": True, "events": "email"}).to_list(10)
    
    if not webhooks:
        # Try to use any active webhook
        webhooks = await db.webhooks.find({"active": True}).to_list(10)
    
    results = []
    for webhook in webhooks:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook["webhook_url"],
                    json={
                        "event": "send_email",
                        "to_email": to_email,
                        "subject": subject,
                        "body": body,
                        "lead_id": lead_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                results.append({"success": response.status_code < 400})
        except Exception as e:
            logger.error(f"Zapier webhook error: {e}")
            results.append({"success": False, "error": str(e)})
    
    return {"sent_via": "zapier", "results": results}


async def send_via_resend(to_email: str, subject: str, body: str) -> dict:
    """Send email via Resend API (if configured)"""
    resend_key = os.environ.get('RESEND_API_KEY')
    if not resend_key:
        return {"success": False, "error": "Resend not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": os.environ.get('SENDER_EMAIL', 'Solar Empire <noreply@solarempire.com>'),
                    "to": [to_email],
                    "subject": subject,
                    "text": body
                }
            )
            return {"success": response.status_code < 400, "response": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_email(to_email: str, subject: str, body: str, lead_id: str = None) -> dict:
    """Send email using best available method"""
    # Try Zapier first (most flexible)
    result = await send_via_zapier(to_email, subject, body, lead_id)
    
    if not result.get("results") or not any(r.get("success") for r in result.get("results", [])):
        # Fall back to Resend
        result = await send_via_resend(to_email, subject, body)
    
    # Log the email send
    await db.email_logs.insert_one({
        "to_email": to_email,
        "subject": subject,
        "lead_id": lead_id,
        "result": result,
        "sent_at": datetime.utcnow()
    })
    
    return result


# ============ CAMPAIGN MANAGEMENT ============

@router.post("/enroll")
async def enroll_in_campaign(enrollment: CampaignEnrollment, background_tasks: BackgroundTasks):
    """Enroll a lead in the email drip campaign"""
    
    # Calculate email schedule
    now = datetime.utcnow()
    scheduled_emails = []
    
    for template_id, template in EMAIL_TEMPLATES.items():
        send_at = now + timedelta(hours=template["delay_hours"])
        scheduled_emails.append({
            "template_id": template_id,
            "scheduled_for": send_at,
            "status": "pending"
        })
    
    # Create campaign enrollment
    campaign = {
        "lead_id": enrollment.lead_id,
        "email": enrollment.email,
        "name": enrollment.name,
        "data": {
            "annual_savings": enrollment.estimated_savings,
            "lifetime_savings": enrollment.estimated_savings * 25,
            "system_size": enrollment.system_size,
            "panel_count": enrollment.panel_count,
            "payback_years": enrollment.payback_years,
            "tax_credit": int(enrollment.estimated_savings * 25 * 0.3 / 25),
            "rep_name": enrollment.rep_name,
            "rep_phone": enrollment.rep_phone
        },
        "scheduled_emails": scheduled_emails,
        "enrolled_at": now,
        "status": "active"
    }
    
    await db.email_campaigns.update_one(
        {"lead_id": enrollment.lead_id},
        {"$set": campaign},
        upsert=True
    )
    
    # Send welcome email immediately in background
    background_tasks.add_task(
        process_scheduled_email,
        enrollment.lead_id,
        "welcome"
    )
    
    return {
        "success": True,
        "message": f"Lead enrolled in 5-email drip campaign",
        "emails_scheduled": len(scheduled_emails),
        "next_email": "welcome (sending now)"
    }


async def process_scheduled_email(lead_id: str, template_id: str):
    """Process and send a scheduled email"""
    campaign = await db.email_campaigns.find_one({"lead_id": lead_id})
    if not campaign:
        return
    
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        return
    
    # Fill in template variables
    data = campaign.get("data", {})
    data["name"] = campaign.get("name", "there")
    
    body = template["template"]
    for key, value in data.items():
        body = body.replace("{" + key + "}", str(value))
    
    subject = template["subject"]
    for key, value in data.items():
        subject = subject.replace("{" + key + "}", str(value))
    
    # Send the email
    result = await send_email(
        campaign["email"],
        subject,
        body,
        lead_id
    )
    
    # Update campaign status
    await db.email_campaigns.update_one(
        {"lead_id": lead_id, "scheduled_emails.template_id": template_id},
        {"$set": {
            "scheduled_emails.$.status": "sent" if result.get("success") else "failed",
            "scheduled_emails.$.sent_at": datetime.utcnow()
        }}
    )


@router.post("/process-pending")
async def process_pending_emails():
    """Process all pending scheduled emails (run via cron)"""
    now = datetime.utcnow()
    
    # Find campaigns with pending emails
    campaigns = await db.email_campaigns.find({
        "status": "active",
        "scheduled_emails": {
            "$elemMatch": {
                "status": "pending",
                "scheduled_for": {"$lte": now}
            }
        }
    }).to_list(100)
    
    processed = 0
    for campaign in campaigns:
        for email in campaign.get("scheduled_emails", []):
            if email["status"] == "pending" and email["scheduled_for"] <= now:
                await process_scheduled_email(campaign["lead_id"], email["template_id"])
                processed += 1
    
    return {"processed": processed, "campaigns_checked": len(campaigns)}


@router.get("/campaign/{lead_id}")
async def get_campaign_status(lead_id: str):
    """Get campaign status for a lead"""
    campaign = await db.email_campaigns.find_one({"lead_id": lead_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Convert datetimes
    if isinstance(campaign.get("enrolled_at"), datetime):
        campaign["enrolled_at"] = campaign["enrolled_at"].isoformat()
    
    for email in campaign.get("scheduled_emails", []):
        if isinstance(email.get("scheduled_for"), datetime):
            email["scheduled_for"] = email["scheduled_for"].isoformat()
        if isinstance(email.get("sent_at"), datetime):
            email["sent_at"] = email["sent_at"].isoformat()
    
    return campaign


@router.delete("/campaign/{lead_id}")
async def unsubscribe(lead_id: str):
    """Unsubscribe a lead from campaign"""
    result = await db.email_campaigns.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": "unsubscribed", "unsubscribed_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Unsubscribed from email campaign"}


@router.get("/stats")
async def get_campaign_stats():
    """Get email campaign statistics"""
    total_enrolled = await db.email_campaigns.count_documents({})
    active = await db.email_campaigns.count_documents({"status": "active"})
    unsubscribed = await db.email_campaigns.count_documents({"status": "unsubscribed"})
    
    # Email send stats
    total_sent = await db.email_logs.count_documents({})
    sent_today = await db.email_logs.count_documents({
        "sent_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0)}
    })
    
    return {
        "campaigns": {
            "total_enrolled": total_enrolled,
            "active": active,
            "unsubscribed": unsubscribed
        },
        "emails": {
            "total_sent": total_sent,
            "sent_today": sent_today
        },
        "templates": list(EMAIL_TEMPLATES.keys()),
        "sequence": [
            {"name": "Welcome", "delay": "Immediate"},
            {"name": "Benefits", "delay": "Day 3"},
            {"name": "Urgency", "delay": "Day 7"},
            {"name": "Testimonial", "delay": "Day 14"},
            {"name": "Last Chance", "delay": "Day 30"},
        ]
    }


@router.post("/send-manual")
async def send_manual_email(request: EmailSendRequest):
    """Send a manual email to a lead"""
    result = await send_email(
        request.to_email,
        request.subject,
        request.body,
        request.lead_id
    )
    return result


@router.get("/templates")
async def get_email_templates():
    """Get all email templates"""
    templates = []
    for template_id, template in EMAIL_TEMPLATES.items():
        templates.append({
            "id": template_id,
            "subject": template["subject"],
            "delay_hours": template["delay_hours"],
            "delay_description": f"Day {template['delay_hours'] // 24}" if template["delay_hours"] >= 24 else "Immediate"
        })
    return {"templates": templates}
