"""
Integrations Module - Zapier Webhooks, CRM Sync & Email Drip Campaigns
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import logging
import asyncio
import uuid
import resend

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

# Resend email configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email client configured")
else:
    logger.warning("Resend API key not configured - email campaigns disabled")

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

class WebhookConfig(BaseModel):
    webhook_url: str
    name: str = "Zapier"
    events: List[str] = ["new_lead", "lead_updated", "estimate_viewed"]
    active: bool = True

class WebhookPayload(BaseModel):
    event: str
    timestamp: str
    data: dict

# Supported CRM integrations
SUPPORTED_CRMS = [
    {"id": "zapier", "name": "Zapier", "description": "Connect to 5000+ apps"},
    {"id": "hubspot", "name": "HubSpot", "description": "Marketing & Sales CRM"},
    {"id": "salesforce", "name": "Salesforce", "description": "Enterprise CRM"},
    {"id": "pipedrive", "name": "Pipedrive", "description": "Sales Pipeline CRM"},
    {"id": "custom", "name": "Custom Webhook", "description": "Your own endpoint"},
]


async def send_webhook(webhook_url: str, event: str, data: dict) -> dict:
    """Send data to webhook endpoint (Zapier, CRM, etc.)"""
    payload = {
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "solar_empire",
        "data": data
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            result = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response": response.text[:200] if response.text else None
            }
            
            # Log the webhook call
            await db.webhook_logs.insert_one({
                "webhook_url": webhook_url[:50] + "...",
                "event": event,
                "success": result["success"],
                "status_code": response.status_code,
                "sent_at": datetime.utcnow()
            })
            
            return result
            
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        await db.webhook_logs.insert_one({
            "webhook_url": webhook_url[:50] + "...",
            "event": event,
            "success": False,
            "error": str(e),
            "sent_at": datetime.utcnow()
        })
        return {"success": False, "error": str(e)}


async def trigger_webhooks(event: str, data: dict):
    """Trigger all active webhooks for an event"""
    webhooks = await db.webhooks.find({
        "active": True,
        "events": event
    }).to_list(50)
    
    results = []
    for webhook in webhooks:
        result = await send_webhook(webhook["webhook_url"], event, data)
        results.append({
            "name": webhook.get("name", "Unknown"),
            "result": result
        })
    
    return results


@router.get("/supported")
async def get_supported_integrations():
    """Get list of supported CRM integrations"""
    return {"integrations": SUPPORTED_CRMS}


@router.post("/webhook/configure")
async def configure_webhook(config: WebhookConfig):
    """Configure a webhook for lead notifications"""
    doc = {
        "webhook_url": config.webhook_url,
        "name": config.name,
        "events": config.events,
        "active": config.active,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Upsert by name
    await db.webhooks.update_one(
        {"name": config.name},
        {"$set": doc},
        upsert=True
    )
    
    logger.info(f"Webhook configured: {config.name}")
    return {"success": True, "message": f"Webhook '{config.name}' configured"}


@router.delete("/webhook/{name}")
async def delete_webhook(name: str):
    """Delete a webhook configuration"""
    result = await db.webhooks.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"success": True, "message": f"Webhook '{name}' deleted"}


@router.get("/webhooks")
async def list_webhooks():
    """List all configured webhooks"""
    webhooks = await db.webhooks.find({}, {"_id": 0}).to_list(50)
    
    # Mask webhook URLs for security
    for w in webhooks:
        if w.get("webhook_url"):
            url = w["webhook_url"]
            w["webhook_url"] = url[:30] + "..." if len(url) > 30 else url
        if isinstance(w.get('created_at'), datetime):
            w['created_at'] = w['created_at'].isoformat()
        if isinstance(w.get('updated_at'), datetime):
            w['updated_at'] = w['updated_at'].isoformat()
    
    return {"webhooks": webhooks}


@router.post("/webhook/test")
async def test_webhook(webhook_url: str):
    """Test a webhook with sample data"""
    test_data = {
        "lead_name": "Test Lead",
        "lead_phone": "+1234567890",
        "lead_email": "test@example.com",
        "estimated_savings": 2500,
        "system_size": 10.5,
        "roof_area": 2000,
        "scan_id": "test-123",
        "estimate_url": "https://example.com/solar-estimate/test-123"
    }
    
    result = await send_webhook(webhook_url, "test", test_data)
    return result


@router.get("/webhook/logs")
async def get_webhook_logs(limit: int = 20):
    """Get recent webhook logs"""
    logs = await db.webhook_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log.get('sent_at'), datetime):
            log['sent_at'] = log['sent_at'].isoformat()
    
    return {"logs": logs}


# Function to be called when a new lead is captured
async def notify_crm_new_lead(lead_data: dict):
    """Notify all configured CRMs about a new lead"""
    # Format lead data for CRM
    crm_data = {
        "lead_name": lead_data.get("name") or "Unknown",
        "lead_phone": lead_data.get("phone"),
        "lead_email": lead_data.get("email"),
        "scan_id": lead_data.get("scan_id"),
        "estimated_savings": lead_data.get("estimated_savings"),
        "estimated_cost": lead_data.get("estimated_cost"),
        "system_size": lead_data.get("system_size"),
        "roof_area": lead_data.get("roof_area"),
        "panel_count": lead_data.get("panel_count"),
        "payback_years": lead_data.get("payback_years"),
        "estimate_url": lead_data.get("estimate_url"),
        "source": "qr_scan",
        "captured_at": datetime.utcnow().isoformat()
    }
    
    results = await trigger_webhooks("new_lead", crm_data)
    logger.info(f"CRM notifications sent: {len(results)} webhooks triggered")
    return results


# Zapier sample payloads for trigger setup
@router.get("/zapier/sample-payload")
async def get_zapier_sample():
    """Get sample payload for Zapier trigger setup"""
    return {
        "event": "new_lead",
        "timestamp": datetime.utcnow().isoformat(),
        "source": "solar_empire",
        "data": {
            "lead_name": "John Smith",
            "lead_phone": "+15551234567",
            "lead_email": "john@example.com",
            "scan_id": "abc12345",
            "estimated_savings": 2500,
            "estimated_cost": 25000,
            "system_size": 10.5,
            "roof_area": 2000,
            "panel_count": 28,
            "payback_years": 7.2,
            "estimate_url": "https://app.solarempire.com/solar-estimate/abc12345",
            "source": "qr_scan",
            "captured_at": datetime.utcnow().isoformat()
        }
    }



# ============== EMAIL DRIP CAMPAIGN SYSTEM ==============

# Email Campaign Models
class EmailTemplate(BaseModel):
    id: str = None
    name: str
    subject: str
    html_content: str
    delay_days: int = 0  # Days after enrollment to send
    active: bool = True
    created_at: datetime = None

class DripCampaign(BaseModel):
    id: str = None
    name: str
    description: str = ""
    templates: List[str] = []  # List of template IDs in order
    active: bool = True
    lead_source: str = "all"  # Filter by lead source: all, qr_scan, web_form, referral
    created_at: datetime = None
    updated_at: datetime = None

class CampaignEnrollment(BaseModel):
    id: str = None
    lead_id: str
    lead_email: str
    lead_name: str
    campaign_id: str
    current_step: int = 0
    next_send_at: datetime = None
    status: str = "active"  # active, completed, unsubscribed, bounced
    emails_sent: int = 0
    emails_opened: int = 0
    enrolled_at: datetime = None
    completed_at: datetime = None

class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    lead_id: str = None

class CreateTemplateRequest(BaseModel):
    name: str
    subject: str
    html_content: str
    delay_days: int = 0

class CreateCampaignRequest(BaseModel):
    name: str
    description: str = ""
    template_ids: List[str] = []
    lead_source: str = "all"

class EnrollLeadRequest(BaseModel):
    lead_id: str
    campaign_id: str


# Solar-themed email templates
DEFAULT_TEMPLATES = [
    {
        "name": "Welcome - Day 0",
        "subject": "Welcome to Solar Empire - Your Solar Journey Begins! ☀️",
        "delay_days": 0,
        "html_content": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">Welcome to Solar Empire! ☀️</h1>
    <p>Hi {{lead_name}},</p>
    <p>Thank you for your interest in going solar! We're excited to help you save money and reduce your carbon footprint.</p>
    <p><strong>What happens next?</strong></p>
    <ul>
        <li>One of our solar experts will review your roof analysis</li>
        <li>We'll prepare a personalized savings estimate</li>
        <li>You'll receive a call to discuss your options</li>
    </ul>
    <p>Based on our initial analysis, you could save up to <strong>${{estimated_savings}}/year</strong> on electricity!</p>
    <p style="margin-top: 30px;">
        <a href="{{estimate_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Your Estimate</a>
    </p>
    <p style="margin-top: 30px; color: #666;">Best regards,<br>The Solar Empire Team</p>
</div>
"""
    },
    {
        "name": "Educational - Day 3",
        "subject": "Did you know? 5 Solar Myths Busted 💡",
        "delay_days": 3,
        "html_content": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">5 Solar Myths - BUSTED! 💡</h1>
    <p>Hi {{lead_name}},</p>
    <p>Many homeowners have questions about solar. Let's clear up some common misconceptions:</p>
    <ol>
        <li><strong>"Solar is too expensive"</strong> - With $0 down financing and tax credits, most homeowners pay less than their current electric bill from day one!</li>
        <li><strong>"My roof isn't suitable"</strong> - 85% of homes in the US are suitable for solar. We'll assess yours for free.</li>
        <li><strong>"What about cloudy days?"</strong> - Solar panels work even on cloudy days, and you stay connected to the grid for backup.</li>
        <li><strong>"Solar panels require a lot of maintenance"</strong> - Modern panels are virtually maintenance-free and last 25+ years.</li>
        <li><strong>"It takes forever to see ROI"</strong> - Most systems pay for themselves in 5-7 years, then it's pure savings!</li>
    </ol>
    <p style="margin-top: 30px;">
        <a href="{{estimate_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Check Your Savings Again</a>
    </p>
    <p style="margin-top: 30px; color: #666;">Questions? Just reply to this email!<br>The Solar Empire Team</p>
</div>
"""
    },
    {
        "name": "Urgency - Day 7",
        "subject": "⚡ Tax credits are changing - Lock in your savings!",
        "delay_days": 7,
        "html_content": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">Don't Miss Out on 30% Tax Credit! ⚡</h1>
    <p>Hi {{lead_name}},</p>
    <p>Quick reminder: The Federal Solar Tax Credit is currently at <strong>30%</strong> - that's a significant chunk of your system cost back in your pocket!</p>
    <div style="background: #fef3cd; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
        <strong>Your potential savings:</strong><br>
        System cost: ~${{system_cost}}<br>
        Tax credit (30%): ~${{tax_credit}}<br>
        <strong style="color: #f97316;">Annual savings: ~${{estimated_savings}}</strong>
    </div>
    <p>These incentives won't last forever. The sooner you go solar, the more you save!</p>
    <p style="margin-top: 30px;">
        <a href="{{estimate_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Schedule Free Consultation</a>
    </p>
    <p style="margin-top: 30px; color: #666;">Ready when you are,<br>The Solar Empire Team</p>
</div>
"""
    },
    {
        "name": "Social Proof - Day 14",
        "subject": "See what your neighbors are saying about solar 🏠",
        "delay_days": 14,
        "html_content": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">Join Thousands of Happy Solar Homeowners! 🏠</h1>
    <p>Hi {{lead_name}},</p>
    <p>Here's what homeowners in your area are saying after going solar with us:</p>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><em>"Best decision we ever made! Our electric bill went from $280 to $12. Wish we'd done it sooner!"</em></p>
        <p style="text-align: right;">- Sarah M., {{city}}</p>
    </div>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><em>"The installation was quick and professional. Now I'm producing more energy than I use!"</em></p>
        <p style="text-align: right;">- Mike T., {{city}}</p>
    </div>
    <p><strong>Fun fact:</strong> Over 50 homes in your ZIP code ({{zip_code}}) have already gone solar!</p>
    <p style="margin-top: 30px;">
        <a href="{{estimate_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Get Your Free Quote</a>
    </p>
    <p style="margin-top: 30px; color: #666;">Here when you need us,<br>The Solar Empire Team</p>
</div>
"""
    },
    {
        "name": "Final Follow-up - Day 21",
        "subject": "Last chance: Special offer just for you 🎁",
        "delay_days": 21,
        "html_content": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">We've Got a Special Offer For You! 🎁</h1>
    <p>Hi {{lead_name}},</p>
    <p>We noticed you haven't scheduled your solar consultation yet. To make it even easier to get started, we're offering you:</p>
    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h2 style="margin: 0;">$500 OFF</h2>
        <p style="margin: 5px 0;">Your Solar Installation</p>
        <p style="font-size: 12px; margin: 0;">Use code: SOLAREMPIRE500</p>
    </div>
    <p>This offer expires in 7 days. Don't miss out on:</p>
    <ul>
        <li>$500 discount on installation</li>
        <li>30% federal tax credit</li>
        <li>~${{estimated_savings}}/year in energy savings</li>
        <li>25-year warranty on panels</li>
    </ul>
    <p style="margin-top: 30px;">
        <a href="{{estimate_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Claim Your Discount Now</a>
    </p>
    <p style="margin-top: 30px; color: #666;">Your energy independence awaits,<br>The Solar Empire Team</p>
</div>
"""
    }
]


# Email Service Functions
async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """Send email via Resend API"""
    if not RESEND_API_KEY:
        logger.warning("Resend not configured - email not sent")
        return {"success": False, "error": "Email service not configured"}
    
    try:
        params = {
            "from": f"Solar Empire <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        
        logger.info(f"Email sent successfully to {to_email}: {email.get('id')}")
        return {"success": True, "email_id": email.get("id")}
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}


def personalize_template(html_content: str, lead_data: dict) -> str:
    """Replace template variables with actual lead data"""
    replacements = {
        "{{lead_name}}": lead_data.get("name", "Valued Customer"),
        "{{estimated_savings}}": str(lead_data.get("estimated_savings", "2,000")),
        "{{system_cost}}": str(lead_data.get("system_cost", "25,000")),
        "{{tax_credit}}": str(int(lead_data.get("system_cost", 25000) * 0.3)),
        "{{estimate_url}}": lead_data.get("estimate_url", "#"),
        "{{city}}": lead_data.get("city", "your area"),
        "{{zip_code}}": lead_data.get("zip_code", "your area"),
        "{{scan_id}}": lead_data.get("scan_id", ""),
    }
    
    result = html_content
    for key, value in replacements.items():
        result = result.replace(key, str(value))
    
    return result


async def process_drip_campaigns():
    """Background task to process and send scheduled drip emails"""
    logger.info("Processing drip campaigns...")
    
    now = datetime.utcnow()
    
    # Find enrollments that need emails sent
    enrollments = await db.campaign_enrollments.find({
        "status": "active",
        "next_send_at": {"$lte": now}
    }).to_list(100)
    
    for enrollment in enrollments:
        try:
            # Get campaign and templates
            campaign = await db.drip_campaigns.find_one({"id": enrollment["campaign_id"]})
            if not campaign or not campaign.get("active"):
                continue
            
            template_ids = campaign.get("templates", [])
            current_step = enrollment.get("current_step", 0)
            
            if current_step >= len(template_ids):
                # Campaign complete
                await db.campaign_enrollments.update_one(
                    {"id": enrollment["id"]},
                    {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
                )
                continue
            
            # Get current template
            template = await db.email_templates.find_one({"id": template_ids[current_step]})
            if not template or not template.get("active"):
                continue
            
            # Get lead data for personalization
            lead = await db.leads.find_one({"id": enrollment["lead_id"]})
            lead_data = lead if lead else {"name": enrollment["lead_name"]}
            
            # Add estimate URL if we have scan data
            scan = await db.scan_results.find_one({"id": enrollment.get("scan_id")})
            if scan:
                lead_data["estimate_url"] = f"https://app.solarempire.com/view-estimate/{scan.get('id')}"
                lead_data["estimated_savings"] = scan.get("data", {}).get("estimatedSavings", 2000)
                lead_data["system_cost"] = scan.get("data", {}).get("estimatedCost", 25000)
            
            # Personalize and send email
            html = personalize_template(template["html_content"], lead_data)
            result = await send_email(enrollment["lead_email"], template["subject"], html)
            
            if result.get("success"):
                # Log email sent
                await db.email_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "enrollment_id": enrollment["id"],
                    "template_id": template["id"],
                    "to_email": enrollment["lead_email"],
                    "subject": template["subject"],
                    "email_id": result.get("email_id"),
                    "sent_at": datetime.utcnow()
                })
                
                # Update enrollment
                next_step = current_step + 1
                next_template = None
                
                if next_step < len(template_ids):
                    next_template = await db.email_templates.find_one({"id": template_ids[next_step]})
                
                update_data = {
                    "current_step": next_step,
                    "emails_sent": enrollment.get("emails_sent", 0) + 1
                }
                
                if next_template:
                    update_data["next_send_at"] = datetime.utcnow() + timedelta(days=next_template.get("delay_days", 1))
                else:
                    update_data["status"] = "completed"
                    update_data["completed_at"] = datetime.utcnow()
                
                await db.campaign_enrollments.update_one(
                    {"id": enrollment["id"]},
                    {"$set": update_data}
                )
                
                logger.info(f"Drip email sent to {enrollment['lead_email']}, step {current_step + 1}")
            else:
                logger.error(f"Failed to send drip email: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error processing enrollment {enrollment.get('id')}: {e}")
    
    logger.info(f"Processed {len(enrollments)} campaign enrollments")


# Email Campaign API Endpoints

@router.get("/email/status")
async def get_email_status():
    """Check email service configuration status"""
    return {
        "configured": RESEND_API_KEY is not None,
        "sender_email": SENDER_EMAIL if RESEND_API_KEY else None,
        "scheduler": {
            "enabled": True,
            "interval": "Every 1 hour",
            "description": "Automatically processes email drip campaigns"
        }
    }


@router.post("/email/send")
async def send_single_email(request: EmailSendRequest):
    """Send a single email"""
    result = await send_email(request.to_email, request.subject, request.html_content)
    
    if result.get("success"):
        # Log the email
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_email": request.to_email,
            "subject": request.subject,
            "email_id": result.get("email_id"),
            "lead_id": request.lead_id,
            "type": "manual",
            "sent_at": datetime.utcnow()
        })
    
    return result


@router.post("/email/test")
async def send_test_email(to_email: EmailStr):
    """Send a test email to verify configuration"""
    html = """
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316;">Solar Empire Email Test ✅</h1>
        <p>If you're reading this, your email integration is working perfectly!</p>
        <p>You're all set to start your email drip campaigns.</p>
        <p style="color: #666;">- Solar Empire Team</p>
    </div>
    """
    return await send_email(to_email, "Solar Empire - Email Test ✅", html)


# Template Management

@router.post("/email/templates")
async def create_email_template(request: CreateTemplateRequest):
    """Create a new email template"""
    template = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "subject": request.subject,
        "html_content": request.html_content,
        "delay_days": request.delay_days,
        "active": True,
        "created_at": datetime.utcnow()
    }
    
    await db.email_templates.insert_one(template)
    template["created_at"] = template["created_at"].isoformat()
    template.pop("_id", None)
    return template


@router.get("/email/templates")
async def list_email_templates():
    """List all email templates"""
    templates = await db.email_templates.find({}, {"_id": 0}).sort("delay_days", 1).to_list(100)
    
    for t in templates:
        if isinstance(t.get("created_at"), datetime):
            t["created_at"] = t["created_at"].isoformat()
    
    return {"templates": templates}


@router.get("/email/templates/{template_id}")
async def get_email_template(template_id: str):
    """Get a single email template"""
    template = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if isinstance(template.get("created_at"), datetime):
        template["created_at"] = template["created_at"].isoformat()
    
    return template


@router.put("/email/templates/{template_id}")
async def update_email_template(template_id: str, updates: dict):
    """Update an email template"""
    allowed_fields = ["name", "subject", "html_content", "delay_days", "active"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    result = await db.email_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"success": True, "message": "Template updated"}


@router.delete("/email/templates/{template_id}")
async def delete_email_template(template_id: str):
    """Delete an email template"""
    result = await db.email_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True, "message": "Template deleted"}


@router.post("/email/templates/seed-defaults")
async def seed_default_templates():
    """Seed the database with default solar email templates"""
    created = []
    
    for template_data in DEFAULT_TEMPLATES:
        existing = await db.email_templates.find_one({"name": template_data["name"]})
        if not existing:
            template = {
                "id": str(uuid.uuid4()),
                "name": template_data["name"],
                "subject": template_data["subject"],
                "html_content": template_data["html_content"],
                "delay_days": template_data["delay_days"],
                "active": True,
                "created_at": datetime.utcnow()
            }
            await db.email_templates.insert_one(template)
            created.append(template_data["name"])
    
    return {"success": True, "created": created, "message": f"Created {len(created)} templates"}


# Campaign Management

@router.post("/email/campaigns")
async def create_drip_campaign(request: CreateCampaignRequest):
    """Create a new drip campaign"""
    campaign = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "description": request.description,
        "templates": request.template_ids,
        "active": True,
        "lead_source": request.lead_source,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.drip_campaigns.insert_one(campaign)
    campaign["created_at"] = campaign["created_at"].isoformat()
    campaign["updated_at"] = campaign["updated_at"].isoformat()
    campaign.pop("_id", None)
    return campaign


@router.get("/email/campaigns")
async def list_drip_campaigns():
    """List all drip campaigns"""
    campaigns = await db.drip_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for c in campaigns:
        if isinstance(c.get("created_at"), datetime):
            c["created_at"] = c["created_at"].isoformat()
        if isinstance(c.get("updated_at"), datetime):
            c["updated_at"] = c["updated_at"].isoformat()
        
        # Get enrollment stats
        enrolled = await db.campaign_enrollments.count_documents({"campaign_id": c["id"]})
        completed = await db.campaign_enrollments.count_documents({"campaign_id": c["id"], "status": "completed"})
        c["enrolled_count"] = enrolled
        c["completed_count"] = completed
    
    return {"campaigns": campaigns}


@router.get("/email/campaigns/{campaign_id}")
async def get_drip_campaign(campaign_id: str):
    """Get a single drip campaign with details"""
    campaign = await db.drip_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get templates in order
    templates = []
    for tid in campaign.get("templates", []):
        t = await db.email_templates.find_one({"id": tid}, {"_id": 0})
        if t:
            if isinstance(t.get("created_at"), datetime):
                t["created_at"] = t["created_at"].isoformat()
            templates.append(t)
    
    campaign["template_details"] = templates
    
    # Get stats
    campaign["enrolled_count"] = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id})
    campaign["active_count"] = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id, "status": "active"})
    campaign["completed_count"] = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id, "status": "completed"})
    
    if isinstance(campaign.get("created_at"), datetime):
        campaign["created_at"] = campaign["created_at"].isoformat()
    if isinstance(campaign.get("updated_at"), datetime):
        campaign["updated_at"] = campaign["updated_at"].isoformat()
    
    return campaign


@router.put("/email/campaigns/{campaign_id}")
async def update_drip_campaign(campaign_id: str, updates: dict):
    """Update a drip campaign"""
    allowed_fields = ["name", "description", "templates", "active", "lead_source"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.drip_campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"success": True, "message": "Campaign updated"}


@router.delete("/email/campaigns/{campaign_id}")
async def delete_drip_campaign(campaign_id: str):
    """Delete a drip campaign"""
    result = await db.drip_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Also remove enrollments
    await db.campaign_enrollments.delete_many({"campaign_id": campaign_id})
    
    return {"success": True, "message": "Campaign deleted"}


# Enrollment Management

@router.post("/email/campaigns/{campaign_id}/enroll")
async def enroll_lead_in_campaign(campaign_id: str, request: EnrollLeadRequest):
    """Enroll a lead in a drip campaign"""
    # Verify campaign exists
    campaign = await db.drip_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if not campaign.get("active"):
        raise HTTPException(status_code=400, detail="Campaign is not active")
    
    # Get lead info
    lead = await db.leads.find_one({"id": request.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.get("email"):
        raise HTTPException(status_code=400, detail="Lead has no email address")
    
    # Check if already enrolled
    existing = await db.campaign_enrollments.find_one({
        "lead_id": request.lead_id,
        "campaign_id": campaign_id,
        "status": "active"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Lead already enrolled in this campaign")
    
    # Get first template for timing
    templates = campaign.get("templates", [])
    first_template = None
    if templates:
        first_template = await db.email_templates.find_one({"id": templates[0]})
    
    enrollment = {
        "id": str(uuid.uuid4()),
        "lead_id": request.lead_id,
        "lead_email": lead["email"],
        "lead_name": lead.get("name", "Customer"),
        "campaign_id": campaign_id,
        "current_step": 0,
        "next_send_at": datetime.utcnow() + timedelta(days=first_template.get("delay_days", 0) if first_template else 0),
        "status": "active",
        "emails_sent": 0,
        "emails_opened": 0,
        "enrolled_at": datetime.utcnow()
    }
    
    await db.campaign_enrollments.insert_one(enrollment)
    
    enrollment["enrolled_at"] = enrollment["enrolled_at"].isoformat()
    enrollment["next_send_at"] = enrollment["next_send_at"].isoformat()
    enrollment.pop("_id", None)
    
    logger.info(f"Lead {request.lead_id} enrolled in campaign {campaign_id}")
    return enrollment


@router.get("/email/campaigns/{campaign_id}/enrollments")
async def list_campaign_enrollments(campaign_id: str, status: str = None):
    """List all enrollments for a campaign"""
    query = {"campaign_id": campaign_id}
    if status:
        query["status"] = status
    
    enrollments = await db.campaign_enrollments.find(query, {"_id": 0}).sort("enrolled_at", -1).to_list(100)
    
    for e in enrollments:
        if isinstance(e.get("enrolled_at"), datetime):
            e["enrolled_at"] = e["enrolled_at"].isoformat()
        if isinstance(e.get("next_send_at"), datetime):
            e["next_send_at"] = e["next_send_at"].isoformat()
        if isinstance(e.get("completed_at"), datetime):
            e["completed_at"] = e["completed_at"].isoformat()
    
    return {"enrollments": enrollments}


@router.delete("/email/enrollments/{enrollment_id}")
async def cancel_enrollment(enrollment_id: str):
    """Cancel/unsubscribe an enrollment"""
    result = await db.campaign_enrollments.update_one(
        {"id": enrollment_id},
        {"$set": {"status": "unsubscribed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return {"success": True, "message": "Enrollment cancelled"}


@router.post("/email/campaigns/process")
async def trigger_campaign_processing(background_tasks: BackgroundTasks):
    """Manually trigger drip campaign processing (for testing)"""
    background_tasks.add_task(process_drip_campaigns)
    return {"success": True, "message": "Campaign processing triggered"}


# Email Logs & Analytics

@router.get("/email/logs")
async def get_email_logs(limit: int = 50, lead_id: str = None):
    """Get email sending logs"""
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    logs = await db.email_logs.find(query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log.get("sent_at"), datetime):
            log["sent_at"] = log["sent_at"].isoformat()
    
    return {"logs": logs}


@router.get("/email/analytics")
async def get_email_analytics():
    """Get email campaign analytics"""
    total_sent = await db.email_logs.count_documents({})
    total_enrollments = await db.campaign_enrollments.count_documents({})
    active_enrollments = await db.campaign_enrollments.count_documents({"status": "active"})
    completed_enrollments = await db.campaign_enrollments.count_documents({"status": "completed"})
    
    # Get campaign performance
    campaigns = await db.drip_campaigns.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    campaign_stats = []
    
    for c in campaigns:
        enrolled = await db.campaign_enrollments.count_documents({"campaign_id": c["id"]})
        completed = await db.campaign_enrollments.count_documents({"campaign_id": c["id"], "status": "completed"})
        campaign_stats.append({
            "campaign_id": c["id"],
            "campaign_name": c["name"],
            "enrolled": enrolled,
            "completed": completed,
            "completion_rate": round(completed / enrolled * 100, 1) if enrolled > 0 else 0
        })
    
    return {
        "total_emails_sent": total_sent,
        "total_enrollments": total_enrollments,
        "active_enrollments": active_enrollments,
        "completed_enrollments": completed_enrollments,
        "completion_rate": round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments > 0 else 0,
        "campaigns": campaign_stats
    }


# Auto-enroll new leads (called from other routes)
async def auto_enroll_lead_in_campaigns(lead_id: str, lead_source: str = "qr_scan"):
    """Automatically enroll a new lead in matching active campaigns"""
    # Find matching campaigns
    campaigns = await db.drip_campaigns.find({
        "active": True,
        "$or": [
            {"lead_source": "all"},
            {"lead_source": lead_source}
        ]
    }).to_list(10)
    
    enrolled_in = []
    for campaign in campaigns:
        try:
            request = EnrollLeadRequest(lead_id=lead_id, campaign_id=campaign["id"])
            await enroll_lead_in_campaign(campaign["id"], request)
            enrolled_in.append(campaign["name"])
        except Exception as e:
            logger.warning(f"Could not auto-enroll lead {lead_id} in campaign {campaign['id']}: {e}")
    
    return enrolled_in
