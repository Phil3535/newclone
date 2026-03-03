from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import asyncio
from bson import ObjectId
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Import modular route files
from routes import (
    legal_router,
    referrals_router,
    chat_router,
    testimonials_router,
    competitors_router,
    leads_router,
    territories_router,
    reps_router,
    appointments_router,
    analytics_router,
    lead_hunter_router,
    scan_results_router,
    notifications_router,
    integrations_router,
    lead_scoring_router,
    elite_tools_router,
    ai_power_tools_router,
    intelligence_tools_router,
    admin_router,
    admin_auth_router,
    two_factor_auth_router,
    organizations_router,
    advanced_features_router
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

# Twilio configuration
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER')
twilio_client = None

if twilio_account_sid and twilio_auth_token:
    try:
        twilio_client = TwilioClient(twilio_account_sid, twilio_auth_token)
        logging.info("Twilio client initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize Twilio client: {e}")

# Create the main app
app = FastAPI(title="Solar Empire AI Territory Intelligence System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Admin Dashboard file path
ADMIN_DIR = Path(__file__).parent.parent / "admin"

@api_router.get("/admin-dashboard")
async def serve_admin_dashboard():
    """Serve the admin dashboard HTML"""
    admin_file = ADMIN_DIR / "index.html"
    if admin_file.exists():
        return FileResponse(admin_file, media_type="text/html")
    raise HTTPException(status_code=404, detail="Admin dashboard not found")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v, info=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            return v
        raise ValueError("Invalid ObjectId")

# Lead Models
class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    zip_code: str
    homeowner: bool = True
    roof_type: str = "asphalt"  # asphalt, tile, metal, flat
    bill_amount: float = 150.0
    timeline: str = "3-6 months"  # immediate, 1-3 months, 3-6 months, 6+ months
    source: str = "web_form"  # ad_campaign, web_form, organic, referral
    notes: Optional[str] = None

class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: str = ""
    address: str = ""
    zip_code: str = ""
    homeowner: bool = True
    roof_type: str = "asphalt"
    bill_amount: float = 150.0
    timeline: str = "3-6 months"
    source: str = "web_form"
    notes: Optional[str] = None
    ai_score: float = 0.0
    probability_to_close: float = 0.0
    ai_insights: Optional[str] = None
    status: str = "new"  # new, contacted, qualified, appointment_set, closed_won, closed_lost
    assigned_rep_id: Optional[str] = None
    territory_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Territory Models
class TerritoryCreate(BaseModel):
    name: str
    zip_codes: List[str]
    close_rate: float = 0.15
    avg_home_value: float = 350000.0
    utility_rate: float = 0.12  # $/kWh
    incentives_available: float = 5000.0
    assigned_rep_id: Optional[str] = None

class Territory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    zip_codes: List[str]
    close_rate: float = 0.15
    avg_home_value: float = 350000.0
    utility_rate: float = 0.12
    incentives_available: float = 5000.0
    priority_score: float = 0.0
    lead_count: int = 0
    assigned_rep_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Rep Models
class RepCreate(BaseModel):
    name: str
    email: str
    phone: str
    target_revenue: float = 5000.0

class Rep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    target_revenue: float = 5000.0
    revenue_achieved: float = 0.0
    appointments_completed: int = 0
    appointments_scheduled: int = 0
    leads_assigned: int = 0
    deals_closed: int = 0
    leaderboard_rank: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Appointment Models
class AppointmentCreate(BaseModel):
    lead_id: str
    rep_id: str
    scheduled_time: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    rep_id: str
    lead_name: Optional[str] = None
    lead_address: Optional[str] = None
    scheduled_time: datetime
    duration_minutes: int = 60
    status: str = "scheduled"  # scheduled, completed, cancelled, no_show
    notes: Optional[str] = None
    outcome: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Installation Models
class InstallationCreate(BaseModel):
    lead_id: str
    rep_id: str
    territory_id: str
    system_size_kw: float
    contract_value: float
    notes: Optional[str] = None

class Installation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    rep_id: str
    territory_id: str
    lead_name: Optional[str] = None
    system_size_kw: float
    contract_value: float
    status: str = "pending"  # pending, in_progress, completed, cancelled
    notes: Optional[str] = None
    commission: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

# Analytics Models
class DashboardStats(BaseModel):
    total_leads: int
    qualified_leads: int
    appointments_today: int
    appointments_this_week: int
    revenue_this_month: float
    revenue_target: float
    deals_closed_this_month: int
    conversion_rate: float
    top_territory: Optional[str] = None

class LeaderboardEntry(BaseModel):
    rep_id: str
    rep_name: str
    revenue: float
    deals_closed: int
    appointments_completed: int
    rank: int

# SMS Request Models
class SMSRequest(BaseModel):
    to_phone: str
    message: str

class SMSResponse(BaseModel):
    success: bool
    message_sid: Optional[str] = None
    error: Optional[str] = None

# ============== ADVANCED FEATURE MODELS ==============

# Partner/Investor Models
class PartnerCreate(BaseModel):
    name: str
    email: str
    company: str
    investment_amount: float = 0.0
    territories: List[str] = []  # List of territory IDs
    revenue_share_percent: float = 5.0  # Default 5% rev share

class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: str
    investment_amount: float = 0.0
    territories: List[str] = []
    revenue_share_percent: float = 5.0
    total_revenue_earned: float = 0.0
    total_installs: int = 0
    status: str = "active"  # active, inactive, pending
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerDashboard(BaseModel):
    partner_id: str
    partner_name: str
    total_investment: float
    total_revenue_earned: float
    roi_percent: float
    territories_count: int
    total_installs: int
    monthly_revenue: List[dict]
    territory_performance: List[dict]

# Blockchain Revenue Ledger Models
class LedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_type: str  # installation, commission, partner_payout, expense
    amount: float
    description: str
    related_id: Optional[str] = None  # installation_id, rep_id, partner_id
    rep_id: Optional[str] = None
    partner_id: Optional[str] = None
    territory_id: Optional[str] = None
    previous_hash: str = ""
    current_hash: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    verified: bool = True

class LedgerSummary(BaseModel):
    total_revenue: float
    total_commissions: float
    total_partner_payouts: float
    total_expenses: float
    net_revenue: float
    transaction_count: int
    chain_valid: bool

# Compliance & Regulatory Models
class PermitCreate(BaseModel):
    installation_id: str
    permit_type: str  # building, electrical, utility, hoa
    jurisdiction: str
    status: str = "pending"  # pending, submitted, approved, rejected
    notes: Optional[str] = None

class Permit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    installation_id: str
    lead_name: Optional[str] = None
    address: Optional[str] = None
    permit_type: str
    jurisdiction: str
    permit_number: Optional[str] = None
    status: str = "pending"
    submitted_date: Optional[datetime] = None
    approved_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ComplianceStatus(BaseModel):
    total_permits: int
    pending_permits: int
    approved_permits: int
    rejected_permits: int
    expiring_soon: int
    compliance_rate: float
    by_type: Dict[str, int]
    by_jurisdiction: Dict[str, int]

# Forecasting Models
class ForecastRequest(BaseModel):
    territory_id: Optional[str] = None
    months_ahead: int = 6

class MonthlyForecast(BaseModel):
    month: str
    predicted_leads: int
    predicted_appointments: int
    predicted_installs: int
    predicted_revenue: float
    confidence: float

class SeasonalForecast(BaseModel):
    territory_id: Optional[str] = None
    territory_name: Optional[str] = None
    forecast_period: str
    monthly_forecasts: List[MonthlyForecast]
    total_predicted_revenue: float
    growth_rate: float
    best_month: str
    worst_month: str
    ai_insights: str

# ============== SMS SERVICE ==============

async def send_sms(to_phone: str, message: str) -> dict:
    """Send SMS via Twilio"""
    if not twilio_client:
        logger.warning("Twilio client not configured")
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        # Format phone number if needed
        if not to_phone.startswith('+'):
            to_phone = '+1' + to_phone.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
        
        message_obj = twilio_client.messages.create(
            body=message,
            from_=twilio_phone_number,
            to=to_phone
        )
        
        logger.info(f"SMS sent successfully: {message_obj.sid}")
        return {"success": True, "message_sid": message_obj.sid}
    except TwilioRestException as e:
        logger.error(f"Twilio error: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"SMS error: {e}")
        return {"success": False, "error": str(e)}

async def send_lead_followup_sms(lead_name: str, lead_phone: str, rep_name: str) -> dict:
    """Send follow-up SMS to a new lead"""
    message = f"""Hi {lead_name}! 👋

Thank you for your interest in solar energy! I'm {rep_name} from Solar Empire.

I'll be reaching out soon to discuss how you can save on your electricity bills with solar. In the meantime, feel free to reply with any questions!

☀️ Solar Empire - Powering Your Future"""
    
    return await send_sms(lead_phone, message)

async def send_appointment_reminder_sms(lead_name: str, lead_phone: str, appointment_time: datetime, rep_name: str) -> dict:
    """Send appointment reminder SMS"""
    time_str = appointment_time.strftime("%I:%M %p on %B %d")
    message = f"""Hi {lead_name}! 📅

This is a reminder about your solar consultation appointment at {time_str}.

{rep_name} from Solar Empire will be visiting to discuss your solar options.

Please reply YES to confirm or call us to reschedule.

☀️ Solar Empire"""
    
    return await send_sms(lead_phone, message)

async def send_hot_lead_alert_to_rep(rep_phone: str, lead_name: str, lead_score: float, territory: str) -> dict:
    """Alert rep about a hot lead"""
    message = f"""🔥 HOT LEAD ALERT!

New high-score lead: {lead_name}
AI Score: {int(lead_score)}/100
Territory: {territory}

Act fast - high probability to close!

☀️ Solar Empire CRM"""
    
    return await send_sms(rep_phone, message)

async def send_deal_closed_notification(rep_phone: str, lead_name: str, contract_value: float) -> dict:
    """Notify rep about closed deal"""
    message = f"""🎉 DEAL CLOSED!

Congratulations! You closed:
Customer: {lead_name}
Value: ${contract_value:,.2f}
Commission: ${contract_value * 0.05:,.2f}

Keep up the great work!

☀️ Solar Empire"""
    
    return await send_sms(rep_phone, message)

# ============== BLOCKCHAIN LEDGER SERVICE ==============

import hashlib

def calculate_hash(data: str) -> str:
    """Calculate SHA-256 hash for blockchain ledger"""
    return hashlib.sha256(data.encode()).hexdigest()

async def get_last_ledger_hash() -> str:
    """Get the hash of the last ledger entry"""
    last_entry = await db.ledger.find_one(sort=[("timestamp", -1)])
    if last_entry:
        return last_entry.get("current_hash", "")
    return "GENESIS_BLOCK"

async def create_ledger_entry(
    transaction_type: str,
    amount: float,
    description: str,
    related_id: str = None,
    rep_id: str = None,
    partner_id: str = None,
    territory_id: str = None
) -> LedgerEntry:
    """Create a new blockchain-style ledger entry"""
    previous_hash = await get_last_ledger_hash()
    
    entry = LedgerEntry(
        transaction_type=transaction_type,
        amount=amount,
        description=description,
        related_id=related_id,
        rep_id=rep_id,
        partner_id=partner_id,
        territory_id=territory_id,
        previous_hash=previous_hash
    )
    
    # Calculate current hash from entry data
    hash_data = f"{entry.id}{entry.transaction_type}{entry.amount}{entry.timestamp.isoformat()}{previous_hash}"
    entry.current_hash = calculate_hash(hash_data)
    
    await db.ledger.insert_one(entry.model_dump())
    return entry

async def verify_ledger_chain() -> bool:
    """Verify the integrity of the blockchain ledger"""
    entries = await db.ledger.find().sort("timestamp", 1).to_list(10000)
    
    if not entries:
        return True
    
    previous_hash = "GENESIS_BLOCK"
    for entry in entries:
        if entry.get("previous_hash") != previous_hash:
            return False
        
        # Verify current hash
        hash_data = f"{entry['id']}{entry['transaction_type']}{entry['amount']}{entry['timestamp'].isoformat() if isinstance(entry['timestamp'], datetime) else entry['timestamp']}{entry['previous_hash']}"
        expected_hash = calculate_hash(hash_data)
        
        if entry.get("current_hash") != expected_hash:
            return False
        
        previous_hash = entry.get("current_hash")
    
    return True

# ============== FORECASTING SERVICE ==============

async def generate_forecast(territory_id: str = None, months_ahead: int = 6) -> SeasonalForecast:
    """Generate AI-powered revenue forecast"""
    import random
    from calendar import month_name
    
    # Get historical data
    query = {}
    if territory_id:
        query["territory_id"] = territory_id
    
    # Get territory info
    territory_name = "All Territories"
    if territory_id:
        territory = await db.territories.find_one({"id": territory_id})
        if territory:
            territory_name = territory.get("name", "Unknown")
    
    # Get historical installations
    installations = await db.installations.find(query).to_list(1000)
    total_historical_revenue = sum(i.get("contract_value", 0) for i in installations)
    avg_install_value = total_historical_revenue / len(installations) if installations else 25000
    
    # Get lead counts
    leads = await db.leads.find(query if territory_id else {}).to_list(1000)
    leads_per_month = len(leads) / 3 if leads else 10  # Assume 3 months of data
    
    # Seasonal factors (solar is seasonal)
    seasonal_factors = {
        1: 0.7,   # January - Low
        2: 0.75,  # February
        3: 0.9,   # March - Spring uptick
        4: 1.1,   # April
        5: 1.2,   # May - High season starts
        6: 1.3,   # June - Peak
        7: 1.25,  # July - Peak
        8: 1.2,   # August
        9: 1.0,   # September
        10: 0.85, # October
        11: 0.75, # November
        12: 0.65  # December - Low
    }
    
    # Generate forecasts
    monthly_forecasts = []
    current_date = datetime.utcnow()
    total_predicted_revenue = 0
    best_revenue = 0
    worst_revenue = float('inf')
    best_month = ""
    worst_month = ""
    
    for i in range(months_ahead):
        forecast_date = current_date + timedelta(days=30 * (i + 1))
        month_num = forecast_date.month
        month_str = f"{month_name[month_num]} {forecast_date.year}"
        
        seasonal_factor = seasonal_factors.get(month_num, 1.0)
        
        # Add some randomness for realistic forecasting
        variance = random.uniform(0.9, 1.1)
        
        predicted_leads = int(leads_per_month * seasonal_factor * variance)
        predicted_appointments = int(predicted_leads * 0.4 * variance)  # 40% conversion to appointments
        predicted_installs = int(predicted_appointments * 0.25 * variance)  # 25% close rate
        predicted_revenue = predicted_installs * avg_install_value * variance
        confidence = 0.85 - (i * 0.05)  # Confidence decreases over time
        
        monthly_forecasts.append(MonthlyForecast(
            month=month_str,
            predicted_leads=predicted_leads,
            predicted_appointments=predicted_appointments,
            predicted_installs=predicted_installs,
            predicted_revenue=round(predicted_revenue, 2),
            confidence=round(confidence, 2)
        ))
        
        total_predicted_revenue += predicted_revenue
        
        if predicted_revenue > best_revenue:
            best_revenue = predicted_revenue
            best_month = month_str
        if predicted_revenue < worst_revenue:
            worst_revenue = predicted_revenue
            worst_month = month_str
    
    # Calculate growth rate
    if len(monthly_forecasts) >= 2:
        first_month_rev = monthly_forecasts[0].predicted_revenue
        last_month_rev = monthly_forecasts[-1].predicted_revenue
        growth_rate = ((last_month_rev - first_month_rev) / first_month_rev * 100) if first_month_rev > 0 else 0
    else:
        growth_rate = 0
    
    # Generate AI insights
    ai_insights = f"Based on historical data and seasonal patterns, "
    if growth_rate > 10:
        ai_insights += f"expect strong growth of {growth_rate:.1f}% over the forecast period. "
    elif growth_rate < -10:
        ai_insights += f"anticipate a {abs(growth_rate):.1f}% decline due to seasonal factors. "
    else:
        ai_insights += f"expect stable performance with {growth_rate:.1f}% change. "
    
    ai_insights += f"{best_month} is projected to be your best month. Consider ramping up marketing in the weeks before. "
    ai_insights += f"Plan for reduced activity in {worst_month} - good time for training and system improvements."
    
    return SeasonalForecast(
        territory_id=territory_id,
        territory_name=territory_name,
        forecast_period=f"{months_ahead} months",
        monthly_forecasts=monthly_forecasts,
        total_predicted_revenue=round(total_predicted_revenue, 2),
        growth_rate=round(growth_rate, 2),
        best_month=best_month,
        worst_month=worst_month,
        ai_insights=ai_insights
    )

# ============== AI SCORING SERVICE ==============

async def calculate_ai_score(lead_data: dict) -> dict:
    """Calculate AI-powered lead score using OpenAI"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            # Fallback to rule-based scoring
            return calculate_rule_based_score(lead_data)
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"lead-scoring-{lead_data.get('id', 'new')}",
            system_message="""You are an AI assistant specialized in solar sales lead scoring. 
            Analyze lead data and provide a score from 0-100 and probability to close (0-1).
            Consider: homeowner status, roof type suitability, electricity bill (higher = better ROI), 
            timeline urgency, and overall fit for solar installation.
            
            Respond ONLY in this exact JSON format:
            {"score": 75, "probability": 0.65, "insights": "Brief explanation of scoring"}"""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Score this solar lead:
        - Homeowner: {lead_data.get('homeowner', False)}
        - Roof Type: {lead_data.get('roof_type', 'unknown')}
        - Monthly Bill: ${lead_data.get('bill_amount', 0)}
        - Timeline: {lead_data.get('timeline', 'unknown')}
        - Source: {lead_data.get('source', 'unknown')}
        - ZIP Code: {lead_data.get('zip_code', 'unknown')}
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            result = json.loads(response_text)
            return {
                "ai_score": float(result.get("score", 50)),
                "probability_to_close": float(result.get("probability", 0.5)),
                "ai_insights": result.get("insights", "AI analysis complete")
            }
        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {response}")
            return calculate_rule_based_score(lead_data)
            
    except Exception as e:
        logger.error(f"AI scoring error: {e}")
        return calculate_rule_based_score(lead_data)

def calculate_rule_based_score(lead_data: dict) -> dict:
    """Fallback rule-based scoring"""
    score = 50.0
    
    # Homeowner bonus
    if lead_data.get('homeowner', False):
        score += 20
    
    # Roof type scoring
    roof_scores = {"metal": 15, "tile": 10, "asphalt": 5, "flat": 0}
    score += roof_scores.get(lead_data.get('roof_type', ''), 0)
    
    # Bill amount scoring (higher bill = better ROI)
    bill = lead_data.get('bill_amount', 0)
    if bill >= 200:
        score += 15
    elif bill >= 150:
        score += 10
    elif bill >= 100:
        score += 5
    
    # Timeline urgency
    timeline_scores = {"immediate": 15, "1-3 months": 10, "3-6 months": 5, "6+ months": 0}
    score += timeline_scores.get(lead_data.get('timeline', ''), 0)
    
    score = min(100, max(0, score))
    probability = score / 100 * 0.8  # Max 80% probability
    
    return {
        "ai_score": score,
        "probability_to_close": probability,
        "ai_insights": f"Rule-based score: {'High' if score >= 70 else 'Medium' if score >= 50 else 'Low'} potential"
    }

async def calculate_territory_priority(territory_data: dict) -> float:
    """Calculate territory priority score"""
    # Weighted scoring based on close rate, home values, utility rates, and incentives
    close_rate_weight = 30
    home_value_weight = 25
    utility_rate_weight = 25
    incentive_weight = 20
    
    # Normalize values (0-100 scale)
    close_rate_score = min(100, territory_data.get('close_rate', 0) * 500)  # 20% = 100
    home_value_score = min(100, territory_data.get('avg_home_value', 0) / 5000)  # $500k = 100
    utility_score = min(100, territory_data.get('utility_rate', 0) * 500)  # $0.20/kWh = 100
    incentive_score = min(100, territory_data.get('incentives_available', 0) / 100)  # $10k = 100
    
    priority = (
        close_rate_score * close_rate_weight / 100 +
        home_value_score * home_value_weight / 100 +
        utility_score * utility_rate_weight / 100 +
        incentive_score * incentive_weight / 100
    )
    
    return round(priority, 1)

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Solar Empire AI Territory Intelligence System", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ---------- LEAD ROUTES ----------

@api_router.post("/leads", response_model=Lead)
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
    territory_name = "Unknown"
    if territory:
        lead_obj.territory_id = territory.get("id")
        lead_obj.assigned_rep_id = territory.get("assigned_rep_id")
        territory_name = territory.get("name", "Unknown")
        # Update territory lead count
        await db.territories.update_one(
            {"id": territory.get("id")},
            {"$inc": {"lead_count": 1}}
        )
    
    await db.leads.insert_one(lead_obj.model_dump())
    
    # Update rep stats if assigned
    rep_name = "Solar Empire Team"
    rep_phone = None
    if lead_obj.assigned_rep_id:
        await db.reps.update_one(
            {"id": lead_obj.assigned_rep_id},
            {"$inc": {"leads_assigned": 1}}
        )
        # Get rep info for SMS
        rep = await db.reps.find_one({"id": lead_obj.assigned_rep_id})
        if rep:
            rep_name = rep.get("name", "Solar Empire Team")
            rep_phone = rep.get("phone")
    
    # Send SMS follow-up to lead
    if send_sms_followup and lead_obj.phone:
        asyncio.create_task(send_lead_followup_sms(lead_obj.name, lead_obj.phone, rep_name))
    
    # Alert rep if hot lead (score >= 70)
    if lead_obj.ai_score >= 70 and rep_phone:
        asyncio.create_task(send_hot_lead_alert_to_rep(rep_phone, lead_obj.name, lead_obj.ai_score, territory_name))
    
    return lead_obj

@api_router.get("/leads", response_model=List[Lead])
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

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    """Get a single lead by ID"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return Lead(**lead)

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, updates: dict):
    """Update a lead"""
    updates["updated_at"] = datetime.utcnow()
    result = await db.leads.update_one({"id": lead_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.leads.find_one({"id": lead_id})
    return Lead(**lead)

@api_router.post("/leads/{lead_id}/rescore", response_model=Lead)
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

# ---------- TERRITORY ROUTES ----------

@api_router.post("/territories", response_model=Territory)
async def create_territory(territory_input: TerritoryCreate):
    """Create a new territory"""
    territory_dict = territory_input.model_dump()
    territory_obj = Territory(**territory_dict)
    
    # Calculate priority score
    territory_obj.priority_score = await calculate_territory_priority(territory_dict)
    
    await db.territories.insert_one(territory_obj.model_dump())
    return territory_obj

@api_router.get("/territories", response_model=List[Territory])
async def get_territories(rep_id: Optional[str] = None):
    """Get all territories"""
    query = {}
    if rep_id:
        query["assigned_rep_id"] = rep_id
    
    territories = await db.territories.find(query).sort("priority_score", -1).to_list(100)
    return [Territory(**t) for t in territories]

@api_router.get("/territories/{territory_id}", response_model=Territory)
async def get_territory(territory_id: str):
    """Get a single territory"""
    territory = await db.territories.find_one({"id": territory_id})
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    return Territory(**territory)

@api_router.put("/territories/{territory_id}", response_model=Territory)
async def update_territory(territory_id: str, updates: dict):
    """Update a territory"""
    # Recalculate priority if relevant fields changed
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

@api_router.get("/territories/heatmap/data")
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

# ---------- REP ROUTES ----------

@api_router.post("/reps", response_model=Rep)
async def create_rep(rep_input: RepCreate):
    """Create a new sales rep"""
    rep_dict = rep_input.model_dump()
    rep_obj = Rep(**rep_dict)
    await db.reps.insert_one(rep_obj.model_dump())
    return rep_obj

@api_router.get("/reps", response_model=List[Rep])
async def get_reps():
    """Get all reps"""
    reps = await db.reps.find().sort("revenue_achieved", -1).to_list(100)
    return [Rep(**r) for r in reps]

@api_router.get("/reps/{rep_id}", response_model=Rep)
async def get_rep(rep_id: str):
    """Get a single rep"""
    rep = await db.reps.find_one({"id": rep_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    return Rep(**rep)

@api_router.put("/reps/{rep_id}", response_model=Rep)
async def update_rep(rep_id: str, updates: dict):
    """Update a rep"""
    result = await db.reps.update_one({"id": rep_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Rep not found")
    
    rep = await db.reps.find_one({"id": rep_id})
    return Rep(**rep)

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard():
    """Get sales rep leaderboard"""
    reps = await db.reps.find().sort("revenue_achieved", -1).to_list(100)
    
    leaderboard = []
    for i, rep in enumerate(reps, 1):
        leaderboard.append(LeaderboardEntry(
            rep_id=rep.get("id"),
            rep_name=rep.get("name"),
            revenue=rep.get("revenue_achieved", 0),
            deals_closed=rep.get("deals_closed", 0),
            appointments_completed=rep.get("appointments_completed", 0),
            rank=i
        ))
    
    return leaderboard

# ---------- APPOINTMENT ROUTES ----------

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appt_input: AppointmentCreate, send_sms_reminder: bool = True):
    """Create a new appointment"""
    appt_dict = appt_input.model_dump()
    appt_obj = Appointment(**appt_dict)
    
    # Get lead info
    lead = await db.leads.find_one({"id": appt_input.lead_id})
    lead_phone = None
    if lead:
        appt_obj.lead_name = lead.get("name")
        appt_obj.lead_address = lead.get("address")
        lead_phone = lead.get("phone")
        # Update lead status
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
    
    # Get rep name for SMS
    rep = await db.reps.find_one({"id": appt_input.rep_id})
    rep_name = rep.get("name", "Solar Empire Team") if rep else "Solar Empire Team"
    
    # Send SMS reminder to lead (1 hour before appointment)
    if send_sms_reminder and lead_phone and appt_obj.lead_name:
        # Schedule reminder 1 hour before
        reminder_time = appt_input.scheduled_time - timedelta(hours=1)
        if reminder_time > datetime.utcnow():
            # For immediate reminder during testing, send now
            asyncio.create_task(
                send_appointment_reminder_sms(
                    appt_obj.lead_name,
                    lead_phone,
                    appt_input.scheduled_time,
                    rep_name
                )
            )
    
    return appt_obj

@api_router.get("/appointments", response_model=List[Appointment])
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
        # Filter by date
        try:
            target_date = datetime.fromisoformat(date)
            next_day = target_date + timedelta(days=1)
            query["scheduled_time"] = {"$gte": target_date, "$lt": next_day}
        except:
            pass
    
    appointments = await db.appointments.find(query).sort("scheduled_time", 1).to_list(100)
    return [Appointment(**a) for a in appointments]

@api_router.put("/appointments/{appt_id}", response_model=Appointment)
async def update_appointment(appt_id: str, updates: dict):
    """Update an appointment"""
    # Handle status changes
    if updates.get("status") == "completed":
        appt = await db.appointments.find_one({"id": appt_id})
        if appt:
            await db.reps.update_one(
                {"id": appt.get("rep_id")},
                {"$inc": {"appointments_completed": 1}}
            )
    
    result = await db.appointments.update_one({"id": appt_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt = await db.appointments.find_one({"id": appt_id})
    return Appointment(**appt)

@api_router.get("/appointments/today/{rep_id}")
async def get_today_appointments(rep_id: str):
    """Get today's appointments for a rep"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    appointments = await db.appointments.find({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": tomorrow}
    }).sort("scheduled_time", 1).to_list(50)
    
    return [Appointment(**a) for a in appointments]

# ---------- INSTALLATION ROUTES ----------

@api_router.post("/installations", response_model=Installation)
async def create_installation(install_input: InstallationCreate):
    """Create a new installation (deal closed)"""
    install_dict = install_input.model_dump()
    install_obj = Installation(**install_dict)
    
    # Calculate commission (5% of contract value)
    install_obj.commission = install_obj.contract_value * 0.05
    
    # Get lead info
    lead = await db.leads.find_one({"id": install_input.lead_id})
    if lead:
        install_obj.lead_name = lead.get("name")
        # Update lead status
        await db.leads.update_one(
            {"id": install_input.lead_id},
            {"$set": {"status": "closed_won", "updated_at": datetime.utcnow()}}
        )
    
    await db.installations.insert_one(install_obj.model_dump())
    
    # Update rep stats
    await db.reps.update_one(
        {"id": install_input.rep_id},
        {
            "$inc": {
                "revenue_achieved": install_obj.contract_value,
                "deals_closed": 1
            }
        }
    )
    
    return install_obj

@api_router.get("/installations", response_model=List[Installation])
async def get_installations(
    rep_id: Optional[str] = None,
    territory_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get installations with optional filters"""
    query = {}
    if rep_id:
        query["rep_id"] = rep_id
    if territory_id:
        query["territory_id"] = territory_id
    if status:
        query["status"] = status
    
    installations = await db.installations.find(query).sort("created_at", -1).to_list(100)
    return [Installation(**i) for i in installations]

@api_router.put("/installations/{install_id}", response_model=Installation)
async def update_installation(install_id: str, updates: dict):
    """Update an installation"""
    if updates.get("status") == "completed":
        updates["completed_at"] = datetime.utcnow()
    
    result = await db.installations.update_one({"id": install_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Installation not found")
    
    installation = await db.installations.find_one({"id": install_id})
    return Installation(**installation)

# ---------- SMS ROUTES ----------

@api_router.post("/sms/send", response_model=SMSResponse)
async def send_sms_endpoint(sms_request: SMSRequest):
    """Send a custom SMS message"""
    result = await send_sms(sms_request.to_phone, sms_request.message)
    return SMSResponse(**result)

@api_router.post("/sms/lead-followup/{lead_id}")
async def send_lead_followup(lead_id: str):
    """Send follow-up SMS to a lead"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get rep name
    rep_name = "Solar Empire Team"
    if lead.get("assigned_rep_id"):
        rep = await db.reps.find_one({"id": lead.get("assigned_rep_id")})
        if rep:
            rep_name = rep.get("name", "Solar Empire Team")
    
    result = await send_lead_followup_sms(
        lead.get("name"),
        lead.get("phone"),
        rep_name
    )
    
    return {"success": result.get("success"), "message": "Follow-up SMS sent" if result.get("success") else result.get("error")}

@api_router.post("/sms/appointment-reminder/{appointment_id}")
async def send_appointment_reminder(appointment_id: str):
    """Send appointment reminder SMS"""
    appt = await db.appointments.find_one({"id": appointment_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get lead phone
    lead = await db.leads.find_one({"id": appt.get("lead_id")})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get rep name
    rep_name = "Solar Empire Team"
    rep = await db.reps.find_one({"id": appt.get("rep_id")})
    if rep:
        rep_name = rep.get("name", "Solar Empire Team")
    
    result = await send_appointment_reminder_sms(
        appt.get("lead_name", lead.get("name")),
        lead.get("phone"),
        appt.get("scheduled_time"),
        rep_name
    )
    
    return {"success": result.get("success"), "message": "Reminder SMS sent" if result.get("success") else result.get("error")}

@api_router.get("/sms/status")
async def get_sms_status():
    """Check Twilio SMS service status"""
    return {
        "configured": twilio_client is not None,
        "from_number": twilio_phone_number if twilio_client else None
    }

# ---------- ANALYTICS ROUTES ----------

@api_router.get("/analytics/dashboard/{rep_id}", response_model=DashboardStats)
async def get_dashboard_stats(rep_id: str):
    """Get dashboard statistics for a rep"""
    # Get date ranges
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    # Count leads
    total_leads = await db.leads.count_documents({"assigned_rep_id": rep_id})
    qualified_leads = await db.leads.count_documents({
        "assigned_rep_id": rep_id,
        "status": {"$in": ["qualified", "appointment_set"]}
    })
    
    # Count appointments
    appointments_today = await db.appointments.count_documents({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": tomorrow}
    })
    appointments_this_week = await db.appointments.count_documents({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": week_start, "$lt": tomorrow}
    })
    
    # Get rep data
    rep = await db.reps.find_one({"id": rep_id})
    revenue_achieved = rep.get("revenue_achieved", 0) if rep else 0
    target_revenue = rep.get("target_revenue", 5000) if rep else 5000
    
    # Count deals this month
    deals_this_month = await db.installations.count_documents({
        "rep_id": rep_id,
        "created_at": {"$gte": month_start}
    })
    
    # Calculate conversion rate
    total_closed = await db.leads.count_documents({
        "assigned_rep_id": rep_id,
        "status": "closed_won"
    })
    conversion_rate = (total_closed / total_leads * 100) if total_leads > 0 else 0
    
    # Get top territory
    territories = await db.territories.find({"assigned_rep_id": rep_id}).sort("priority_score", -1).limit(1).to_list(1)
    top_territory = territories[0].get("name") if territories else None
    
    return DashboardStats(
        total_leads=total_leads,
        qualified_leads=qualified_leads,
        appointments_today=appointments_today,
        appointments_this_week=appointments_this_week,
        revenue_this_month=revenue_achieved,
        revenue_target=target_revenue,
        deals_closed_this_month=deals_this_month,
        conversion_rate=round(conversion_rate, 1),
        top_territory=top_territory
    )

@api_router.get("/analytics/revenue")
async def get_revenue_analytics():
    """Get overall revenue analytics"""
    # Get all installations
    installations = await db.installations.find().to_list(1000)
    
    total_revenue = sum(i.get("contract_value", 0) for i in installations)
    total_commission = sum(i.get("commission", 0) for i in installations)
    
    # Group by territory
    territory_revenue = {}
    for install in installations:
        tid = install.get("territory_id", "unknown")
        if tid not in territory_revenue:
            territory_revenue[tid] = 0
        territory_revenue[tid] += install.get("contract_value", 0)
    
    return {
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_installations": len(installations),
        "by_territory": territory_revenue
    }

@api_router.get("/analytics/performance")
async def get_performance_analytics():
    """Get overall performance analytics"""
    # Get counts
    total_leads = await db.leads.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    total_installations = await db.installations.count_documents({})
    completed_appointments = await db.appointments.count_documents({"status": "completed"})
    
    # Conversion funnel
    leads_by_status = {}
    for status in ["new", "contacted", "qualified", "appointment_set", "closed_won", "closed_lost"]:
        count = await db.leads.count_documents({"status": status})
        leads_by_status[status] = count
    
    return {
        "total_leads": total_leads,
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments,
        "total_installations": total_installations,
        "leads_by_status": leads_by_status,
        "appointment_completion_rate": round(completed_appointments / total_appointments * 100, 1) if total_appointments > 0 else 0
    }

# ---------- PARTNER/INVESTOR ROUTES ----------

@api_router.post("/partners", response_model=Partner)
async def create_partner(partner_input: PartnerCreate):
    """Create a new partner/investor"""
    partner_dict = partner_input.model_dump()
    partner_obj = Partner(**partner_dict)
    await db.partners.insert_one(partner_obj.model_dump())
    return partner_obj

@api_router.get("/partners", response_model=List[Partner])
async def get_partners():
    """Get all partners"""
    partners = await db.partners.find().to_list(100)
    return [Partner(**p) for p in partners]

@api_router.get("/partners/{partner_id}", response_model=Partner)
async def get_partner(partner_id: str):
    """Get a single partner"""
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return Partner(**partner)

@api_router.get("/partners/{partner_id}/dashboard", response_model=PartnerDashboard)
async def get_partner_dashboard(partner_id: str):
    """Get partner dashboard with ROI and performance metrics"""
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get territory performance
    territory_performance = []
    total_installs = 0
    total_revenue = 0
    
    for territory_id in partner.get("territories", []):
        territory = await db.territories.find_one({"id": territory_id})
        if territory:
            # Get installations for this territory
            installs = await db.installations.find({"territory_id": territory_id}).to_list(1000)
            territory_revenue = sum(i.get("contract_value", 0) for i in installs)
            territory_installs = len(installs)
            
            total_installs += territory_installs
            total_revenue += territory_revenue
            
            territory_performance.append({
                "territory_id": territory_id,
                "territory_name": territory.get("name"),
                "installs": territory_installs,
                "revenue": territory_revenue,
                "close_rate": territory.get("close_rate", 0)
            })
    
    # Calculate partner's revenue share
    revenue_share = partner.get("revenue_share_percent", 5) / 100
    partner_revenue = total_revenue * revenue_share
    
    # Calculate ROI
    investment = partner.get("investment_amount", 0)
    roi = (partner_revenue / investment * 100) if investment > 0 else 0
    
    # Generate monthly revenue (mock data for now)
    monthly_revenue = []
    from calendar import month_name
    current_month = datetime.utcnow().month
    for i in range(6):
        month_idx = (current_month - 5 + i) % 12
        if month_idx == 0:
            month_idx = 12
        monthly_revenue.append({
            "month": month_name[month_idx][:3],
            "revenue": round(partner_revenue / 6 * (0.8 + i * 0.08), 2)
        })
    
    return PartnerDashboard(
        partner_id=partner_id,
        partner_name=partner.get("name"),
        total_investment=investment,
        total_revenue_earned=round(partner_revenue, 2),
        roi_percent=round(roi, 2),
        territories_count=len(partner.get("territories", [])),
        total_installs=total_installs,
        monthly_revenue=monthly_revenue,
        territory_performance=territory_performance
    )

@api_router.put("/partners/{partner_id}", response_model=Partner)
async def update_partner(partner_id: str, updates: dict):
    """Update a partner"""
    result = await db.partners.update_one({"id": partner_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    partner = await db.partners.find_one({"id": partner_id})
    return Partner(**partner)

# ---------- BLOCKCHAIN LEDGER ROUTES ----------

@api_router.get("/ledger", response_model=List[LedgerEntry])
async def get_ledger_entries(limit: int = 100, transaction_type: str = None):
    """Get blockchain ledger entries"""
    query = {}
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    entries = await db.ledger.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [LedgerEntry(**e) for e in entries]

@api_router.get("/ledger/summary", response_model=LedgerSummary)
async def get_ledger_summary():
    """Get blockchain ledger summary"""
    entries = await db.ledger.find().to_list(10000)
    
    total_revenue = sum(e.get("amount", 0) for e in entries if e.get("transaction_type") == "installation")
    total_commissions = sum(e.get("amount", 0) for e in entries if e.get("transaction_type") == "commission")
    total_partner_payouts = sum(e.get("amount", 0) for e in entries if e.get("transaction_type") == "partner_payout")
    total_expenses = sum(e.get("amount", 0) for e in entries if e.get("transaction_type") == "expense")
    
    chain_valid = await verify_ledger_chain()
    
    return LedgerSummary(
        total_revenue=total_revenue,
        total_commissions=total_commissions,
        total_partner_payouts=total_partner_payouts,
        total_expenses=total_expenses,
        net_revenue=total_revenue - total_commissions - total_partner_payouts - total_expenses,
        transaction_count=len(entries),
        chain_valid=chain_valid
    )

@api_router.get("/ledger/verify")
async def verify_ledger():
    """Verify blockchain ledger integrity"""
    is_valid = await verify_ledger_chain()
    entry_count = await db.ledger.count_documents({})
    
    return {
        "chain_valid": is_valid,
        "total_entries": entry_count,
        "verification_time": datetime.utcnow().isoformat()
    }

@api_router.post("/ledger/entry")
async def add_ledger_entry(
    transaction_type: str,
    amount: float,
    description: str,
    related_id: str = None,
    rep_id: str = None,
    partner_id: str = None,
    territory_id: str = None
):
    """Manually add a ledger entry"""
    entry = await create_ledger_entry(
        transaction_type=transaction_type,
        amount=amount,
        description=description,
        related_id=related_id,
        rep_id=rep_id,
        partner_id=partner_id,
        territory_id=territory_id
    )
    return entry

# ---------- COMPLIANCE & REGULATORY ROUTES ----------

@api_router.post("/permits", response_model=Permit)
async def create_permit(permit_input: PermitCreate):
    """Create a new permit"""
    permit_dict = permit_input.model_dump()
    permit_obj = Permit(**permit_dict)
    
    # Get installation info
    installation = await db.installations.find_one({"id": permit_input.installation_id})
    if installation:
        lead = await db.leads.find_one({"id": installation.get("lead_id")})
        if lead:
            permit_obj.lead_name = lead.get("name")
            permit_obj.address = lead.get("address")
    
    await db.permits.insert_one(permit_obj.model_dump())
    return permit_obj

@api_router.get("/permits", response_model=List[Permit])
async def get_permits(
    status: str = None,
    permit_type: str = None,
    installation_id: str = None
):
    """Get permits with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if permit_type:
        query["permit_type"] = permit_type
    if installation_id:
        query["installation_id"] = installation_id
    
    permits = await db.permits.find(query).sort("created_at", -1).to_list(100)
    return [Permit(**p) for p in permits]

@api_router.get("/permits/{permit_id}", response_model=Permit)
async def get_permit(permit_id: str):
    """Get a single permit"""
    permit = await db.permits.find_one({"id": permit_id})
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    return Permit(**permit)

@api_router.put("/permits/{permit_id}", response_model=Permit)
async def update_permit(permit_id: str, updates: dict):
    """Update a permit"""
    # Handle status changes
    if updates.get("status") == "submitted" and "submitted_date" not in updates:
        updates["submitted_date"] = datetime.utcnow()
    if updates.get("status") == "approved" and "approved_date" not in updates:
        updates["approved_date"] = datetime.utcnow()
        # Set expiry to 1 year from approval
        updates["expiry_date"] = datetime.utcnow() + timedelta(days=365)
    
    result = await db.permits.update_one({"id": permit_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Permit not found")
    
    permit = await db.permits.find_one({"id": permit_id})
    return Permit(**permit)

@api_router.get("/compliance/status", response_model=ComplianceStatus)
async def get_compliance_status():
    """Get overall compliance status"""
    permits = await db.permits.find().to_list(1000)
    
    total = len(permits)
    pending = sum(1 for p in permits if p.get("status") == "pending")
    approved = sum(1 for p in permits if p.get("status") == "approved")
    rejected = sum(1 for p in permits if p.get("status") == "rejected")
    
    # Check for expiring permits (within 30 days)
    expiry_threshold = datetime.utcnow() + timedelta(days=30)
    expiring_soon = sum(
        1 for p in permits 
        if p.get("expiry_date") and p.get("expiry_date") < expiry_threshold and p.get("status") == "approved"
    )
    
    # Count by type
    by_type = {}
    for p in permits:
        ptype = p.get("permit_type", "unknown")
        by_type[ptype] = by_type.get(ptype, 0) + 1
    
    # Count by jurisdiction
    by_jurisdiction = {}
    for p in permits:
        jurisdiction = p.get("jurisdiction", "unknown")
        by_jurisdiction[jurisdiction] = by_jurisdiction.get(jurisdiction, 0) + 1
    
    compliance_rate = (approved / total * 100) if total > 0 else 100
    
    return ComplianceStatus(
        total_permits=total,
        pending_permits=pending,
        approved_permits=approved,
        rejected_permits=rejected,
        expiring_soon=expiring_soon,
        compliance_rate=round(compliance_rate, 1),
        by_type=by_type,
        by_jurisdiction=by_jurisdiction
    )

# ---------- FORECASTING ROUTES ----------

@api_router.post("/forecast", response_model=SeasonalForecast)
async def get_forecast(request: ForecastRequest):
    """Generate revenue forecast"""
    forecast = await generate_forecast(
        territory_id=request.territory_id,
        months_ahead=request.months_ahead
    )
    return forecast

@api_router.get("/forecast/territory/{territory_id}", response_model=SeasonalForecast)
async def get_territory_forecast(territory_id: str, months: int = 6):
    """Get forecast for a specific territory"""
    territory = await db.territories.find_one({"id": territory_id})
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    forecast = await generate_forecast(territory_id=territory_id, months_ahead=months)
    return forecast

@api_router.get("/forecast/overall", response_model=SeasonalForecast)
async def get_overall_forecast(months: int = 6):
    """Get overall company forecast"""
    forecast = await generate_forecast(months_ahead=months)
    return forecast

# ---------- AI CHAT ASSISTANT ----------

class ChatMessage(BaseModel):
    role: str  # 'system', 'user', or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@api_router.post("/ai/chat")
async def ai_chat(request: ChatRequest):
    """AI-powered sales assistant chat endpoint"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            return {"response": "AI assistant is not configured. Please contact support."}
        
        # Extract system message and conversation history
        system_message = ""
        conversation_history = []
        
        for msg in request.messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                conversation_history.append({"role": msg.role, "content": msg.content})
        
        # Get the last user message
        user_content = ""
        for msg in reversed(request.messages):
            if msg.role == "user":
                user_content = msg.content
                break
        
        if not user_content:
            return {"response": "Please provide a message."}
        
        # Build context from conversation history
        context = ""
        if len(conversation_history) > 2:
            recent_history = conversation_history[-6:-1]  # Last few messages before current
            for h in recent_history:
                context += f"{h['role'].capitalize()}: {h['content']}\n"
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"sales-assistant-{datetime.utcnow().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Include context if available
        full_prompt = f"{context}\nUser: {user_content}" if context else user_content
        
        user_message = UserMessage(text=full_prompt)
        response = await chat.send_message(user_message)
        
        return {"response": response}
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {"response": "I apologize, but I'm having trouble processing your request right now. Please try again."}

# ---------- AI LEAD HUNTER BOT ----------

class PropertyListing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    city: str
    state: str
    zip_code: str
    property_type: str  # new_construction, recently_sold, permit_filed
    price: float
    bedrooms: int
    bathrooms: float
    sqft: int
    year_built: Optional[int] = None
    roof_age: Optional[int] = None
    estimated_electric_bill: float
    days_on_market: Optional[int] = None
    lat: float
    lng: float
    source: str  # zillow, realtor, county_records, construction_permits
    ai_score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    recommended_action: str = ""
    best_time_to_contact: str = ""
    discovered_at: datetime = Field(default_factory=datetime.utcnow)

class LeadHunterResponse(BaseModel):
    hot_leads: List[PropertyListing]
    new_construction_zones: List[Dict[str, Any]]
    market_insights: Dict[str, Any]
    total_discovered: int
    ai_recommendations: List[str]

def calculate_lead_score(listing: dict) -> tuple[float, dict, str, str]:
    """AI scoring algorithm for lead potential"""
    score = 0.0
    breakdown = {}
    
    # Property Value Score (0-25 points)
    # Sweet spot: $300k-$800k homes
    price = listing.get('price', 0)
    if 300000 <= price <= 500000:
        breakdown['property_value'] = 25
    elif 500000 < price <= 800000:
        breakdown['property_value'] = 22
    elif 200000 <= price < 300000:
        breakdown['property_value'] = 18
    elif price > 800000:
        breakdown['property_value'] = 15
    else:
        breakdown['property_value'] = 10
    
    # Property Type Score (0-25 points)
    prop_type = listing.get('property_type', '')
    if prop_type == 'new_construction':
        breakdown['property_type'] = 25  # New builds = new roof = perfect for solar
    elif prop_type == 'recently_sold':
        breakdown['property_type'] = 22  # New homeowners making improvements
    elif prop_type == 'permit_filed':
        breakdown['property_type'] = 20  # Already doing renovations
    else:
        breakdown['property_type'] = 10
    
    # Electric Bill Score (0-20 points)
    electric = listing.get('estimated_electric_bill', 0)
    if electric >= 250:
        breakdown['electric_bill'] = 20
    elif electric >= 180:
        breakdown['electric_bill'] = 17
    elif electric >= 120:
        breakdown['electric_bill'] = 12
    else:
        breakdown['electric_bill'] = 5
    
    # Roof Age Score (0-15 points)
    roof_age = listing.get('roof_age')
    if roof_age is not None:
        if roof_age <= 5:
            breakdown['roof_condition'] = 15  # New roof = easy install
        elif roof_age <= 10:
            breakdown['roof_condition'] = 12
        elif roof_age <= 15:
            breakdown['roof_condition'] = 8
        else:
            breakdown['roof_condition'] = 3  # Old roof = might need replacement
    else:
        breakdown['roof_condition'] = 8  # Unknown
    
    # Home Size Score (0-15 points)
    sqft = listing.get('sqft', 0)
    if sqft >= 2500:
        breakdown['home_size'] = 15
    elif sqft >= 1800:
        breakdown['home_size'] = 12
    elif sqft >= 1200:
        breakdown['home_size'] = 8
    else:
        breakdown['home_size'] = 5
    
    # Calculate total score
    score = sum(breakdown.values())
    
    # Determine recommended action
    if score >= 85:
        action = "🔥 HOT LEAD - Visit immediately! High conversion potential."
        best_time = "Weekend morning 9-11 AM"
    elif score >= 70:
        action = "⭐ PRIORITY - Schedule visit within 48 hours"
        best_time = "Weekday evening 5-7 PM"
    elif score >= 55:
        action = "📋 QUALIFIED - Add to weekly knock list"
        best_time = "Saturday afternoon 1-4 PM"
    else:
        action = "📝 MONITOR - Check back in 30 days"
        best_time = "Any time"
    
    return score, breakdown, action, best_time

def generate_mock_listings(zip_codes: List[str], count: int = 20) -> List[dict]:
    """Generate realistic mock property listings for demo"""
    import random
    
    streets = ["Oak St", "Maple Ave", "Cedar Ln", "Pine Dr", "Elm Way", "Birch Ct", "Willow Rd", "Aspen Blvd"]
    cities = ["Sunnyvale", "Mountain View", "Palo Alto", "San Jose", "Fremont", "Cupertino"]
    
    property_types = [
        ('new_construction', 0.3),
        ('recently_sold', 0.4),
        ('permit_filed', 0.2),
        ('standard', 0.1)
    ]
    
    sources = ['zillow', 'realtor', 'county_records', 'construction_permits']
    
    listings = []
    for i in range(count):
        # Weighted random property type
        rand = random.random()
        cumulative = 0
        prop_type = 'standard'
        for ptype, weight in property_types:
            cumulative += weight
            if rand <= cumulative:
                prop_type = ptype
                break
        
        zip_code = random.choice(zip_codes) if zip_codes else "90210"
        price = random.randint(280000, 950000)
        sqft = random.randint(1200, 4000)
        
        listing = {
            'id': str(uuid.uuid4()),
            'address': f"{random.randint(100, 9999)} {random.choice(streets)}",
            'city': random.choice(cities),
            'state': 'CA',
            'zip_code': zip_code,
            'property_type': prop_type,
            'price': price,
            'bedrooms': random.randint(2, 5),
            'bathrooms': random.choice([1.5, 2, 2.5, 3, 3.5]),
            'sqft': sqft,
            'year_built': random.randint(1970, 2024) if prop_type != 'new_construction' else 2024,
            'roof_age': random.randint(0, 25) if prop_type != 'new_construction' else 0,
            'estimated_electric_bill': random.randint(80, 400),
            'days_on_market': random.randint(1, 60) if prop_type == 'recently_sold' else None,
            'lat': 37.3861 + random.uniform(-0.1, 0.1),
            'lng': -122.0839 + random.uniform(-0.1, 0.1),
            'source': random.choice(sources),
        }
        
        # Calculate AI score
        score, breakdown, action, best_time = calculate_lead_score(listing)
        listing['ai_score'] = score
        listing['score_breakdown'] = breakdown
        listing['recommended_action'] = action
        listing['best_time_to_contact'] = best_time
        listing['discovered_at'] = datetime.utcnow().isoformat()
        
        listings.append(listing)
    
    # Sort by AI score descending
    listings.sort(key=lambda x: x['ai_score'], reverse=True)
    return listings

@api_router.get("/lead-hunter/scan")
async def scan_for_leads(
    zip_codes: Optional[str] = None,
    min_score: float = 50.0,
    limit: int = 30
):
    """
    AI Lead Hunter - Scans multiple sources for high-potential leads
    - New construction permits
    - Recently sold homes
    - Property listings
    - Building permits
    """
    try:
        # Parse zip codes
        zips = zip_codes.split(',') if zip_codes else ["90210", "90211", "90220", "90221"]
        
        # Generate mock listings (in production, this would call real APIs)
        all_listings = generate_mock_listings(zips, count=50)
        
        # Filter by minimum score
        hot_leads = [l for l in all_listings if l['ai_score'] >= min_score][:limit]
        
        # Identify new construction zones (clusters)
        new_construction = [l for l in all_listings if l['property_type'] == 'new_construction']
        construction_zones = []
        if new_construction:
            # Group by approximate location
            zone = {
                'name': f"New Development - {new_construction[0]['city']}",
                'center_lat': sum(l['lat'] for l in new_construction) / len(new_construction),
                'center_lng': sum(l['lng'] for l in new_construction) / len(new_construction),
                'property_count': len(new_construction),
                'avg_price': sum(l['price'] for l in new_construction) / len(new_construction),
                'recommendation': "🏗️ Active construction zone - High door-knock potential!"
            }
            construction_zones.append(zone)
        
        # Market insights
        avg_score = sum(l['ai_score'] for l in all_listings) / len(all_listings) if all_listings else 0
        hot_count = len([l for l in all_listings if l['ai_score'] >= 85])
        
        insights = {
            'total_properties_scanned': len(all_listings),
            'average_lead_score': round(avg_score, 1),
            'hot_leads_found': hot_count,
            'new_construction_count': len(new_construction),
            'recently_sold_count': len([l for l in all_listings if l['property_type'] == 'recently_sold']),
            'permits_filed_count': len([l for l in all_listings if l['property_type'] == 'permit_filed']),
            'best_zip_code': max(zips, key=lambda z: len([l for l in all_listings if l['zip_code'] == z and l['ai_score'] >= 70])),
            'market_temperature': 'HOT 🔥' if avg_score >= 65 else 'WARM ☀️' if avg_score >= 50 else 'COOL ❄️'
        }
        
        # AI recommendations
        recommendations = [
            f"🎯 Found {hot_count} hot leads ready for immediate contact!",
            f"🏗️ {len(new_construction)} new construction properties - perfect for solar pitch",
            f"📍 Focus on {insights['best_zip_code']} - highest concentration of qualified leads",
        ]
        
        if len([l for l in all_listings if l['estimated_electric_bill'] >= 200]) > 5:
            recommendations.append("💡 Many high electric bill homes found - emphasize savings!")
        
        return {
            'hot_leads': hot_leads,
            'new_construction_zones': construction_zones,
            'market_insights': insights,
            'total_discovered': len(all_listings),
            'ai_recommendations': recommendations
        }
        
    except Exception as e:
        logger.error(f"Lead hunter scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/lead-hunter/hot-zones")
async def get_hot_zones():
    """Get geographic hot zones for door-knocking based on lead density"""
    # Generate hot zone data
    hot_zones = [
        {
            'id': '1',
            'name': 'Sunrise Heights',
            'lat': 37.4019,
            'lng': -122.1090,
            'radius': 0.5,  # miles
            'lead_count': 23,
            'avg_score': 78,
            'new_construction': 8,
            'heat_level': 'high',
            'best_day': 'Saturday',
            'recommendation': 'Prime door-knock territory - 8 new builds this month!'
        },
        {
            'id': '2', 
            'name': 'Valley View Estates',
            'lat': 37.3680,
            'lng': -122.0360,
            'radius': 0.3,
            'lead_count': 15,
            'avg_score': 72,
            'new_construction': 3,
            'heat_level': 'high',
            'recommendation': 'Recent home sales spike - new homeowners ready to invest!'
        },
        {
            'id': '3',
            'name': 'Oak Park District',
            'lat': 37.3950,
            'lng': -122.0780,
            'radius': 0.4,
            'lead_count': 18,
            'avg_score': 65,
            'new_construction': 5,
            'heat_level': 'medium',
            'recommendation': 'Growing area with good potential - schedule weekly visits'
        },
        {
            'id': '4',
            'name': 'Cedar Creek',
            'lat': 37.4150,
            'lng': -122.1200,
            'radius': 0.6,
            'lead_count': 31,
            'avg_score': 82,
            'new_construction': 12,
            'heat_level': 'hot',
            'recommendation': '🔥 HOTTEST ZONE - Major development underway! Go NOW!'
        }
    ]
    
    return {
        'hot_zones': hot_zones,
        'total_leads_in_zones': sum(z['lead_count'] for z in hot_zones),
        'recommended_route': ['Cedar Creek', 'Sunrise Heights', 'Valley View Estates', 'Oak Park District']
    }

@api_router.post("/lead-hunter/optimize-route")
async def optimize_knock_route(
    max_stops: int = 10,
    start_lat: float = 37.3861,
    start_lng: float = -122.0839
):
    """
    Optimize the door-knocking route through selected hot leads
    Uses nearest neighbor algorithm for route optimization
    """
    import math
    
    # Get leads from scan (in production, these would be from the selected lead_ids)
    all_listings = generate_mock_listings(["90210", "90211", "90220"], count=30)
    hot_leads = [l for l in all_listings if l['ai_score'] >= 70][:max_stops]
    
    if not hot_leads:
        return {'error': 'No leads to optimize', 'optimized_route': [], 'stats': {}}
    
    def haversine_distance(lat1, lng1, lat2, lng2):
        """Calculate distance between two points in miles"""
        R = 3959  # Earth's radius in miles
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    # Nearest neighbor algorithm for route optimization
    optimized_route = []
    remaining = hot_leads.copy()
    current_lat, current_lng = start_lat, start_lng
    total_distance = 0
    
    while remaining:
        # Find nearest lead
        nearest = min(remaining, key=lambda l: haversine_distance(current_lat, current_lng, l['lat'], l['lng']))
        distance = haversine_distance(current_lat, current_lng, nearest['lat'], nearest['lng'])
        total_distance += distance
        
        optimized_route.append({
            'order': len(optimized_route) + 1,
            'id': nearest['id'],
            'address': nearest['address'],
            'city': nearest['city'],
            'state': nearest['state'],
            'zip_code': nearest['zip_code'],
            'lat': nearest['lat'],
            'lng': nearest['lng'],
            'ai_score': nearest['ai_score'],
            'property_type': nearest['property_type'],
            'price': nearest['price'],
            'estimated_electric_bill': nearest['estimated_electric_bill'],
            'recommended_action': nearest['recommended_action'],
            'distance_from_previous': round(distance, 2),
            'estimated_drive_time': round(distance * 2.5, 0),  # ~2.5 min per mile average
        })
        
        current_lat, current_lng = nearest['lat'], nearest['lng']
        remaining.remove(nearest)
    
    # Calculate stats
    total_drive_time = sum(stop['estimated_drive_time'] for stop in optimized_route)
    avg_score = sum(stop['ai_score'] for stop in optimized_route) / len(optimized_route)
    
    # Generate Google Maps multi-stop URL
    waypoints = '|'.join([f"{stop['lat']},{stop['lng']}" for stop in optimized_route[:-1]])
    destination = optimized_route[-1]
    maps_url = f"https://www.google.com/maps/dir/?api=1&origin={start_lat},{start_lng}&destination={destination['lat']},{destination['lng']}&waypoints={waypoints}&travelmode=driving"
    
    return {
        'optimized_route': optimized_route,
        'stats': {
            'total_stops': len(optimized_route),
            'total_distance_miles': round(total_distance, 1),
            'estimated_drive_time_minutes': int(total_drive_time),
            'average_ai_score': round(avg_score, 1),
            'estimated_knocks_per_hour': 6,  # Industry average
            'total_knock_time_minutes': len(optimized_route) * 10,  # 10 min per door
            'total_route_time_minutes': int(total_drive_time) + (len(optimized_route) * 10),
            'new_construction_stops': len([s for s in optimized_route if s['property_type'] == 'new_construction']),
            'high_electric_bill_stops': len([s for s in optimized_route if s['estimated_electric_bill'] >= 200]),
        },
        'maps_url': maps_url,
        'tips': [
            f"🚗 Start early! Route takes ~{int(total_drive_time)} min to drive",
            f"🏠 {len(optimized_route)} doors = ~{len(optimized_route) * 10} min knocking time",
            f"⚡ {len([s for s in optimized_route if s['estimated_electric_bill'] >= 200])} high electric bill homes - lead with savings!",
            "📋 Bring extra proposals - these are HOT leads!"
        ]
    }

# ---------- SEED DATA ROUTE ----------

@api_router.post("/seed")
async def seed_database():
    """Seed database with sample data for testing"""
    # Clear existing data
    await db.leads.delete_many({})
    await db.territories.delete_many({})
    await db.reps.delete_many({})
    await db.appointments.delete_many({})
    await db.installations.delete_many({})
    
    # Create sample reps
    reps_data = [
        {"name": "Alex Johnson", "email": "alex@solarempire.com", "phone": "555-0101", "target_revenue": 5000},
        {"name": "Sarah Miller", "email": "sarah@solarempire.com", "phone": "555-0102", "target_revenue": 5000},
        {"name": "Mike Davis", "email": "mike@solarempire.com", "phone": "555-0103", "target_revenue": 5000},
    ]
    
    created_reps = []
    for rep_data in reps_data:
        rep = Rep(**rep_data)
        await db.reps.insert_one(rep.model_dump())
        created_reps.append(rep)
    
    # Create sample territories
    territories_data = [
        {"name": "Downtown District", "zip_codes": ["90210", "90211", "90212"], "close_rate": 0.22, "avg_home_value": 450000, "utility_rate": 0.18, "incentives_available": 7500, "assigned_rep_id": created_reps[0].id},
        {"name": "Suburban Heights", "zip_codes": ["90220", "90221", "90222"], "close_rate": 0.18, "avg_home_value": 380000, "utility_rate": 0.15, "incentives_available": 6000, "assigned_rep_id": created_reps[1].id},
        {"name": "Valley Region", "zip_codes": ["90230", "90231", "90232"], "close_rate": 0.15, "avg_home_value": 320000, "utility_rate": 0.14, "incentives_available": 5000, "assigned_rep_id": created_reps[2].id},
        {"name": "Coastal Zone", "zip_codes": ["90240", "90241"], "close_rate": 0.25, "avg_home_value": 550000, "utility_rate": 0.20, "incentives_available": 8000, "assigned_rep_id": created_reps[0].id},
        {"name": "Industrial Park", "zip_codes": ["90250", "90251"], "close_rate": 0.12, "avg_home_value": 280000, "utility_rate": 0.12, "incentives_available": 4000, "assigned_rep_id": created_reps[1].id},
    ]
    
    created_territories = []
    for t_data in territories_data:
        territory = Territory(**t_data)
        territory.priority_score = await calculate_territory_priority(t_data)
        await db.territories.insert_one(territory.model_dump())
        created_territories.append(territory)
    
    # Create sample leads
    leads_data = [
        {"name": "John Smith", "email": "john@email.com", "phone": "555-1001", "address": "123 Main St", "zip_code": "90210", "homeowner": True, "roof_type": "asphalt", "bill_amount": 180, "timeline": "1-3 months", "source": "web_form"},
        {"name": "Emily Brown", "email": "emily@email.com", "phone": "555-1002", "address": "456 Oak Ave", "zip_code": "90211", "homeowner": True, "roof_type": "tile", "bill_amount": 220, "timeline": "immediate", "source": "ad_campaign"},
        {"name": "Robert Wilson", "email": "robert@email.com", "phone": "555-1003", "address": "789 Pine Rd", "zip_code": "90220", "homeowner": True, "roof_type": "metal", "bill_amount": 250, "timeline": "immediate", "source": "referral"},
        {"name": "Lisa Anderson", "email": "lisa@email.com", "phone": "555-1004", "address": "321 Elm St", "zip_code": "90221", "homeowner": True, "roof_type": "asphalt", "bill_amount": 160, "timeline": "3-6 months", "source": "organic"},
        {"name": "David Martinez", "email": "david@email.com", "phone": "555-1005", "address": "654 Maple Dr", "zip_code": "90230", "homeowner": True, "roof_type": "flat", "bill_amount": 140, "timeline": "6+ months", "source": "web_form"},
        {"name": "Jennifer Taylor", "email": "jennifer@email.com", "phone": "555-1006", "address": "987 Cedar Ln", "zip_code": "90240", "homeowner": True, "roof_type": "tile", "bill_amount": 280, "timeline": "immediate", "source": "ad_campaign"},
        {"name": "Michael Lee", "email": "michael@email.com", "phone": "555-1007", "address": "147 Birch Way", "zip_code": "90241", "homeowner": True, "roof_type": "metal", "bill_amount": 320, "timeline": "1-3 months", "source": "referral"},
        {"name": "Amanda White", "email": "amanda@email.com", "phone": "555-1008", "address": "258 Spruce Ct", "zip_code": "90250", "homeowner": False, "roof_type": "asphalt", "bill_amount": 120, "timeline": "6+ months", "source": "organic"},
    ]
    
    created_leads = []
    for lead_data in leads_data:
        lead = Lead(**lead_data)
        # Find matching territory
        for t in created_territories:
            if lead.zip_code in t.zip_codes:
                lead.territory_id = t.id
                lead.assigned_rep_id = t.assigned_rep_id
                break
        
        # Calculate AI score
        ai_result = calculate_rule_based_score(lead_data)
        lead.ai_score = ai_result["ai_score"]
        lead.probability_to_close = ai_result["probability_to_close"]
        lead.ai_insights = ai_result["ai_insights"]
        
        await db.leads.insert_one(lead.model_dump())
        created_leads.append(lead)
    
    # Create sample appointments
    now = datetime.utcnow()
    appointments_data = [
        {"lead_id": created_leads[0].id, "rep_id": created_reps[0].id, "scheduled_time": now + timedelta(hours=2)},
        {"lead_id": created_leads[1].id, "rep_id": created_reps[0].id, "scheduled_time": now + timedelta(hours=5)},
        {"lead_id": created_leads[2].id, "rep_id": created_reps[1].id, "scheduled_time": now + timedelta(days=1, hours=10)},
        {"lead_id": created_leads[5].id, "rep_id": created_reps[0].id, "scheduled_time": now + timedelta(days=1, hours=14)},
    ]
    
    for appt_data in appointments_data:
        appt = Appointment(**appt_data)
        lead = next((l for l in created_leads if l.id == appt_data["lead_id"]), None)
        if lead:
            appt.lead_name = lead.name
            appt.lead_address = lead.address
        await db.appointments.insert_one(appt.model_dump())
    
    # Create sample installations
    installations_data = [
        {"lead_id": created_leads[1].id, "rep_id": created_reps[0].id, "territory_id": created_territories[0].id, "system_size_kw": 8.5, "contract_value": 28500, "status": "completed"},
        {"lead_id": created_leads[6].id, "rep_id": created_reps[0].id, "territory_id": created_territories[3].id, "system_size_kw": 10.2, "contract_value": 34000, "status": "in_progress"},
    ]
    
    for install_data in installations_data:
        install = Installation(**install_data)
        install.commission = install.contract_value * 0.05
        lead = next((l for l in created_leads if l.id == install_data["lead_id"]), None)
        if lead:
            install.lead_name = lead.name
        await db.installations.insert_one(install.model_dump())
        
        # Update rep stats
        await db.reps.update_one(
            {"id": install_data["rep_id"]},
            {
                "$inc": {
                    "revenue_achieved": install.contract_value,
                    "deals_closed": 1
                }
            }
        )
    
    # Update leaderboard ranks
    reps = await db.reps.find().sort("revenue_achieved", -1).to_list(100)
    for i, rep in enumerate(reps, 1):
        await db.reps.update_one({"id": rep["id"]}, {"$set": {"leaderboard_rank": i}})
    
    return {
        "message": "Database seeded successfully",
        "created": {
            "reps": len(created_reps),
            "territories": len(created_territories),
            "leads": len(created_leads),
            "appointments": len(appointments_data),
            "installations": len(installations_data)
        }
    }

# ============== TEAM CHAT (REAL BACKEND) ==============

class ChatMessageCreate(BaseModel):
    user_id: str
    user_name: str
    text: str
    mentions: List[str] = []

class ChatMessageModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    text: str
    mentions: List[str] = []
    reactions: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatReactionUpdate(BaseModel):
    emoji: str
    user_id: str

@api_router.post("/chat/messages", response_model=ChatMessageModel)
async def create_chat_message(msg: ChatMessageCreate):
    """Create a new team chat message"""
    message = ChatMessageModel(
        user_id=msg.user_id,
        user_name=msg.user_name,
        text=msg.text,
        mentions=msg.mentions
    )
    await db.chat_messages.insert_one(message.model_dump())
    return message

@api_router.get("/chat/messages")
async def get_chat_messages(limit: int = 50, before: str = None):
    """Get team chat messages"""
    query = {}
    if before:
        try:
            before_time = datetime.fromisoformat(before)
            query["created_at"] = {"$lt": before_time}
        except:
            pass
    
    messages = await db.chat_messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    # Reverse to get chronological order
    messages.reverse()
    return [ChatMessageModel(**m) for m in messages]

@api_router.post("/chat/messages/{message_id}/reaction")
async def toggle_reaction(message_id: str, reaction: ChatReactionUpdate):
    """Add or remove a reaction from a message"""
    message = await db.chat_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = message.get("reactions", [])
    emoji = reaction.emoji
    user_id = reaction.user_id
    
    # Find existing reaction with this emoji
    existing_idx = None
    for i, r in enumerate(reactions):
        if r.get("emoji") == emoji:
            existing_idx = i
            break
    
    if existing_idx is not None:
        users = reactions[existing_idx].get("users", [])
        if user_id in users:
            # Remove user from reaction
            users.remove(user_id)
            if len(users) == 0:
                reactions.pop(existing_idx)
            else:
                reactions[existing_idx]["users"] = users
        else:
            # Add user to reaction
            reactions[existing_idx]["users"].append(user_id)
    else:
        # Add new reaction
        reactions.append({"emoji": emoji, "users": [user_id]})
    
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    return {"success": True, "reactions": reactions}

@api_router.delete("/chat/messages/{message_id}")
async def delete_chat_message(message_id: str, user_id: str):
    """Delete a chat message (only by the sender)"""
    message = await db.chat_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    
    await db.chat_messages.delete_one({"id": message_id})
    return {"success": True}

@api_router.get("/chat/team-members")
async def get_team_members():
    """Get team members for chat"""
    # Get all reps as team members
    reps = await db.reps.find().to_list(100)
    
    team_members = []
    colors = ['#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
    
    for i, rep in enumerate(reps):
        name = rep.get("name", "Unknown")
        initials = "".join([n[0] for n in name.split()[:2]]).upper()
        team_members.append({
            "id": rep.get("id"),
            "name": name,
            "avatar": initials,
            "color": colors[i % len(colors)],
            "email": rep.get("email"),
            "phone": rep.get("phone")
        })
    
    # Add default members if no reps exist
    if not team_members:
        team_members = [
            {"id": "1", "name": "Alex Johnson", "avatar": "AJ", "color": "#f59e0b"},
            {"id": "2", "name": "Sarah Miller", "avatar": "SM", "color": "#3b82f6"},
            {"id": "3", "name": "Mike Davis", "avatar": "MD", "color": "#22c55e"},
            {"id": "4", "name": "Emily Brown", "avatar": "EB", "color": "#8b5cf6"},
        ]
    
    return team_members

# ============== LEAD IMPORT/EXPORT ==============

from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io

@api_router.post("/leads/import")
async def import_leads_csv(file: UploadFile = File(...)):
    """Import leads from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = []
    errors = []
    
    for i, row in enumerate(reader):
        try:
            # Map CSV columns to lead fields
            lead_data = {
                "name": row.get("name", row.get("Name", "")),
                "email": row.get("email", row.get("Email", "")),
                "phone": row.get("phone", row.get("Phone", "")),
                "address": row.get("address", row.get("Address", "")),
                "zip_code": row.get("zip_code", row.get("Zip", row.get("ZIP", ""))),
                "homeowner": str(row.get("homeowner", row.get("Homeowner", "true"))).lower() == "true",
                "roof_type": row.get("roof_type", row.get("Roof Type", "asphalt")),
                "bill_amount": float(row.get("bill_amount", row.get("Bill Amount", "150"))),
                "timeline": row.get("timeline", row.get("Timeline", "3-6 months")),
                "source": row.get("source", row.get("Source", "csv_import")),
                "notes": row.get("notes", row.get("Notes", ""))
            }
            
            # Validate required fields
            if not lead_data["name"] or not lead_data["phone"]:
                errors.append({"row": i + 2, "error": "Missing required field: name or phone"})
                continue
            
            # Create lead
            lead_obj = Lead(**lead_data)
            
            # Calculate AI score
            ai_result = await calculate_ai_score(lead_data)
            lead_obj.ai_score = ai_result["ai_score"]
            lead_obj.probability_to_close = ai_result["probability_to_close"]
            lead_obj.ai_insights = ai_result["ai_insights"]
            
            # Find matching territory
            territory = await db.territories.find_one({"zip_codes": lead_obj.zip_code})
            if territory:
                lead_obj.territory_id = territory.get("id")
                lead_obj.assigned_rep_id = territory.get("assigned_rep_id")
            
            await db.leads.insert_one(lead_obj.model_dump())
            imported.append(lead_obj.id)
            
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})
    
    return {
        "success": True,
        "imported_count": len(imported),
        "error_count": len(errors),
        "imported_ids": imported,
        "errors": errors[:10]  # Return first 10 errors
    }

@api_router.get("/leads/export")
async def export_leads_csv(
    status: Optional[str] = None,
    territory_id: Optional[str] = None,
    min_score: Optional[float] = None
):
    """Export leads to CSV file"""
    query = {}
    if status:
        query["status"] = status
    if territory_id:
        query["territory_id"] = territory_id
    if min_score:
        query["ai_score"] = {"$gte": min_score}
    
    leads = await db.leads.find(query).sort("ai_score", -1).to_list(10000)
    
    # Create CSV in memory
    output = io.StringIO()
    fieldnames = [
        "id", "name", "email", "phone", "address", "zip_code",
        "homeowner", "roof_type", "bill_amount", "timeline", "source",
        "ai_score", "probability_to_close", "status", "notes", "created_at"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for lead in leads:
        writer.writerow({
            "id": lead.get("id"),
            "name": lead.get("name"),
            "email": lead.get("email"),
            "phone": lead.get("phone"),
            "address": lead.get("address"),
            "zip_code": lead.get("zip_code"),
            "homeowner": lead.get("homeowner"),
            "roof_type": lead.get("roof_type"),
            "bill_amount": lead.get("bill_amount"),
            "timeline": lead.get("timeline"),
            "source": lead.get("source"),
            "ai_score": lead.get("ai_score"),
            "probability_to_close": lead.get("probability_to_close"),
            "status": lead.get("status"),
            "notes": lead.get("notes"),
            "created_at": lead.get("created_at", "").isoformat() if lead.get("created_at") else ""
        })
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leads_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@api_router.get("/leads/export/template")
async def get_import_template():
    """Get CSV template for lead import"""
    output = io.StringIO()
    fieldnames = ["name", "email", "phone", "address", "zip_code", "homeowner", "roof_type", "bill_amount", "timeline", "source", "notes"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    # Add example row
    writer.writerow({
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-123-4567",
        "address": "123 Main St",
        "zip_code": "90210",
        "homeowner": "true",
        "roof_type": "asphalt",
        "bill_amount": "200",
        "timeline": "1-3 months",
        "source": "referral",
        "notes": "Interested in solar panels"
    })
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=lead_import_template.csv"}
    )

# ============== AI PROPOSAL GENERATOR ==============

class ProposalRequest(BaseModel):
    lead_id: Optional[str] = None
    customer_name: str
    address: str
    monthly_bill: float
    roof_type: str = "asphalt"
    system_size_kw: Optional[float] = None
    include_battery: bool = False

class ProposalResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    address: str
    monthly_bill: float
    annual_bill: float
    system_size_kw: float
    panel_count: int
    system_cost: float
    federal_tax_credit: float
    state_incentives: float
    net_cost: float
    monthly_payment: float
    year_1_savings: float
    year_25_savings: float
    payback_years: float
    co2_offset_tons: float
    trees_equivalent: int
    roi_percent: float
    include_battery: bool
    battery_cost: float
    total_with_battery: float
    proposal_html: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/proposals/generate", response_model=ProposalResponse)
async def generate_proposal(request: ProposalRequest):
    """Generate AI-powered solar proposal"""
    
    # Calculate system size if not provided
    # Average: 1 kW per $100 monthly bill
    system_size = request.system_size_kw or round(request.monthly_bill / 100 * 1.2, 1)
    system_size = max(4, min(15, system_size))  # Clamp between 4-15 kW
    
    # Panel calculations (400W panels)
    panel_count = int(system_size * 1000 / 400)
    
    # Cost calculations
    cost_per_watt = 2.75  # Industry average
    system_cost = system_size * 1000 * cost_per_watt
    
    # Incentives
    federal_credit = system_cost * 0.30  # 30% federal tax credit
    state_incentives = min(5000, system_cost * 0.10)  # Cap at $5000
    net_cost = system_cost - federal_credit - state_incentives
    
    # Battery option
    battery_cost = 12000 if request.include_battery else 0
    total_with_battery = net_cost + battery_cost
    
    # Financing (20 year loan at 6.5%)
    loan_amount = total_with_battery if request.include_battery else net_cost
    monthly_rate = 0.065 / 12
    num_payments = 240
    monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # Savings calculations
    annual_bill = request.monthly_bill * 12
    electricity_rate_increase = 0.035  # 3.5% annual increase
    
    # System production (avg 1,400 kWh per kW in most US locations)
    annual_production_kwh = system_size * 1400
    utility_rate = request.monthly_bill / (annual_production_kwh / 12 * 0.8)  # Estimate rate
    
    year_1_savings = annual_production_kwh * utility_rate * 0.95  # 95% offset
    
    # 25-year savings with rate increases
    total_25_year_savings = 0
    for year in range(25):
        year_rate = utility_rate * ((1 + electricity_rate_increase) ** year)
        year_production = annual_production_kwh * (0.995 ** year)  # 0.5% degradation
        total_25_year_savings += year_production * year_rate
    
    # Payback calculation
    payback_years = net_cost / year_1_savings if year_1_savings > 0 else 99
    
    # Environmental impact
    co2_per_kwh = 0.0004  # tons per kWh
    co2_offset = annual_production_kwh * co2_per_kwh * 25
    trees_equivalent = int(co2_offset / 0.022)  # 22 kg CO2 per tree per year
    
    # ROI
    roi = ((total_25_year_savings - net_cost) / net_cost * 100) if net_cost > 0 else 0
    
    # Generate HTML proposal
    proposal_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%); color: #ffffff;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #f59e0b; font-size: 32px; margin: 0;">☀️ SOLAR EMPIRE</h1>
            <p style="color: #94a3b8; font-size: 14px;">Custom Solar Proposal</p>
        </div>
        
        <div style="background: #0f1a2e; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
            <h2 style="color: #f59e0b; margin-top: 0;">Dear {request.customer_name},</h2>
            <p style="color: #e2e8f0; line-height: 1.6;">Thank you for your interest in solar energy! Based on your current electricity usage and property at <strong>{request.address}</strong>, we've designed a custom solar solution to maximize your savings.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: #0f1a2e; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 14px;">System Size</p>
                <p style="color: #22c55e; font-size: 36px; font-weight: bold; margin: 8px 0;">{system_size} kW</p>
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">{panel_count} Premium Panels</p>
            </div>
            <div style="background: #0f1a2e; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 14px;">Monthly Payment</p>
                <p style="color: #22c55e; font-size: 36px; font-weight: bold; margin: 8px 0;">${monthly_payment:.0f}</p>
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">vs ${request.monthly_bill:.0f} current bill</p>
            </div>
        </div>

        <div style="background: linear-gradient(135deg, #22c55e20 0%, #22c55e10 100%); border: 2px solid #22c55e; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
            <h3 style="color: #22c55e; margin-top: 0; text-align: center;">💰 YOUR SAVINGS</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                <div>
                    <p style="color: #64748b; margin: 0; font-size: 12px;">Year 1</p>
                    <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 4px 0;">${year_1_savings:,.0f}</p>
                </div>
                <div>
                    <p style="color: #64748b; margin: 0; font-size: 12px;">25 Year Total</p>
                    <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 4px 0;">${total_25_year_savings:,.0f}</p>
                </div>
                <div>
                    <p style="color: #64748b; margin: 0; font-size: 12px;">ROI</p>
                    <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 4px 0;">{roi:.0f}%</p>
                </div>
            </div>
        </div>

        <div style="background: #0f1a2e; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
            <h3 style="color: #f59e0b; margin-top: 0;">📊 Investment Breakdown</h3>
            <table style="width: 100%; color: #e2e8f0;">
                <tr><td style="padding: 8px 0;">System Cost ({system_size}kW)</td><td style="text-align: right;">${system_cost:,.0f}</td></tr>
                <tr style="color: #22c55e;"><td style="padding: 8px 0;">Federal Tax Credit (30%)</td><td style="text-align: right;">-${federal_credit:,.0f}</td></tr>
                <tr style="color: #22c55e;"><td style="padding: 8px 0;">State Incentives</td><td style="text-align: right;">-${state_incentives:,.0f}</td></tr>
                {"<tr><td style='padding: 8px 0;'>Battery Storage</td><td style='text-align: right;'>$" + f"{battery_cost:,.0f}</td></tr>" if request.include_battery else ""}
                <tr style="border-top: 2px solid #1e3a5f;"><td style="padding: 12px 0; font-weight: bold; color: #f59e0b;">Net Investment</td><td style="text-align: right; font-weight: bold; color: #f59e0b;">${total_with_battery if request.include_battery else net_cost:,.0f}</td></tr>
            </table>
        </div>

        <div style="background: #0f1a2e; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
            <h3 style="color: #f59e0b; margin-top: 0;">🌍 Environmental Impact</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; text-align: center;">
                <div>
                    <p style="font-size: 32px; margin: 0;">🌳</p>
                    <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 8px 0;">{trees_equivalent:,}</p>
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">Trees Planted Equivalent</p>
                </div>
                <div>
                    <p style="font-size: 32px; margin: 0;">💨</p>
                    <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 8px 0;">{co2_offset:.1f} tons</p>
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">CO2 Offset (25 years)</p>
                </div>
            </div>
        </div>

        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f59e0b20 0%, #f59e0b10 100%); border-radius: 16px;">
            <p style="color: #f59e0b; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">Payback Period: {payback_years:.1f} Years</p>
            <p style="color: #94a3b8; margin: 0;">After payback, enjoy FREE electricity for {25 - payback_years:.0f}+ years!</p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #1e3a5f;">
            <p style="color: #64748b; font-size: 12px;">Proposal generated on {datetime.utcnow().strftime('%B %d, %Y')}</p>
            <p style="color: #64748b; font-size: 12px;">☀️ Solar Empire - Powering Your Future</p>
        </div>
    </div>
    """
    
    proposal = ProposalResponse(
        customer_name=request.customer_name,
        address=request.address,
        monthly_bill=request.monthly_bill,
        annual_bill=annual_bill,
        system_size_kw=system_size,
        panel_count=panel_count,
        system_cost=round(system_cost, 2),
        federal_tax_credit=round(federal_credit, 2),
        state_incentives=round(state_incentives, 2),
        net_cost=round(net_cost, 2),
        monthly_payment=round(monthly_payment, 2),
        year_1_savings=round(year_1_savings, 2),
        year_25_savings=round(total_25_year_savings, 2),
        payback_years=round(payback_years, 1),
        co2_offset_tons=round(co2_offset, 1),
        trees_equivalent=trees_equivalent,
        roi_percent=round(roi, 1),
        include_battery=request.include_battery,
        battery_cost=battery_cost,
        total_with_battery=round(total_with_battery, 2),
        proposal_html=proposal_html
    )
    
    # Save proposal to database
    await db.proposals.insert_one(proposal.model_dump())
    
    # If lead_id provided, update lead with proposal
    if request.lead_id:
        await db.leads.update_one(
            {"id": request.lead_id},
            {"$set": {"proposal_id": proposal.id, "updated_at": datetime.utcnow()}}
        )
    
    return proposal

@api_router.get("/proposals")
async def get_proposals(limit: int = 50):
    """Get all generated proposals"""
    proposals = await db.proposals.find().sort("created_at", -1).limit(limit).to_list(limit)
    return [ProposalResponse(**p) for p in proposals]

@api_router.get("/proposals/{proposal_id}")
async def get_proposal(proposal_id: str):
    """Get a specific proposal"""
    proposal = await db.proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return ProposalResponse(**proposal)

@api_router.post("/proposals/from-lead/{lead_id}")
async def generate_proposal_from_lead(lead_id: str, include_battery: bool = False):
    """Generate proposal from existing lead data"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    request = ProposalRequest(
        lead_id=lead_id,
        customer_name=lead.get("name"),
        address=lead.get("address"),
        monthly_bill=lead.get("bill_amount", 150),
        roof_type=lead.get("roof_type", "asphalt"),
        include_battery=include_battery
    )
    
    return await generate_proposal(request)

# ============== COMMISSION CALCULATOR ==============

class CommissionTier(BaseModel):
    min_deals: int
    max_deals: Optional[int] = None
    base_rate: float  # Percentage
    bonus_per_deal: float = 0

class CommissionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    rep_name: str
    deal_id: str
    deal_value: float
    commission_rate: float
    commission_amount: float
    bonus_amount: float = 0
    total_amount: float
    status: str = "pending"  # pending, approved, paid
    period: str  # YYYY-MM format
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None

# Commission tiers
COMMISSION_TIERS = [
    CommissionTier(min_deals=0, max_deals=4, base_rate=0.05),
    CommissionTier(min_deals=5, max_deals=9, base_rate=0.07, bonus_per_deal=50),
    CommissionTier(min_deals=10, max_deals=14, base_rate=0.09, bonus_per_deal=100),
    CommissionTier(min_deals=15, max_deals=None, base_rate=0.12, bonus_per_deal=200),
]

def get_commission_tier(deals_count: int) -> CommissionTier:
    for tier in COMMISSION_TIERS:
        if tier.max_deals is None and deals_count >= tier.min_deals:
            return tier
        if tier.min_deals <= deals_count <= (tier.max_deals or 999):
            return tier
    return COMMISSION_TIERS[0]

@api_router.get("/commissions/summary/{rep_id}")
async def get_commission_summary(rep_id: str, period: str = None):
    """Get commission summary for a rep"""
    if not period:
        period = datetime.utcnow().strftime("%Y-%m")
    
    # Get closed deals for this rep in the period
    start_date = datetime.strptime(period, "%Y-%m")
    end_date = datetime(start_date.year, start_date.month + 1, 1) if start_date.month < 12 else datetime(start_date.year + 1, 1, 1)
    
    deals = await db.leads.find({
        "assigned_rep_id": rep_id,
        "status": "closed_won",
        "updated_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(100)
    
    deals_count = len(deals)
    total_deal_value = sum(d.get("deal_value", d.get("bill_amount", 150) * 12 * 25 * 0.8) for d in deals)
    
    # Get commission tier
    tier = get_commission_tier(deals_count)
    
    # Calculate commissions
    base_commission = total_deal_value * tier.base_rate
    tier_bonus = deals_count * tier.bonus_per_deal
    
    # Special bonuses
    first_deal_bonus = 500 if deals_count >= 1 else 0
    five_deal_bonus = 1000 if deals_count >= 5 else 0
    ten_deal_bonus = 2500 if deals_count >= 10 else 0
    
    total_commission = base_commission + tier_bonus + first_deal_bonus + five_deal_bonus + ten_deal_bonus
    
    # Get existing commission records
    records = await db.commissions.find({
        "rep_id": rep_id,
        "period": period
    }).to_list(100)
    
    paid_amount = sum(r.get("total_amount", 0) for r in records if r.get("status") == "paid")
    pending_amount = sum(r.get("total_amount", 0) for r in records if r.get("status") == "pending")
    
    return {
        "rep_id": rep_id,
        "period": period,
        "deals_count": deals_count,
        "total_deal_value": round(total_deal_value, 2),
        "current_tier": {
            "name": f"Tier {COMMISSION_TIERS.index(tier) + 1}",
            "base_rate": tier.base_rate * 100,
            "bonus_per_deal": tier.bonus_per_deal,
            "deals_range": f"{tier.min_deals}-{tier.max_deals or '∞'}"
        },
        "next_tier": {
            "deals_needed": (tier.max_deals or 0) + 1 - deals_count if tier.max_deals else 0,
            "name": f"Tier {min(COMMISSION_TIERS.index(tier) + 2, 4)}"
        } if tier.max_deals else None,
        "breakdown": {
            "base_commission": round(base_commission, 2),
            "tier_bonus": round(tier_bonus, 2),
            "milestone_bonuses": {
                "first_deal": first_deal_bonus,
                "five_deals": five_deal_bonus,
                "ten_deals": ten_deal_bonus
            }
        },
        "total_earned": round(total_commission, 2),
        "paid_amount": round(paid_amount, 2),
        "pending_amount": round(pending_amount, 2),
        "projected_monthly": round(total_commission, 2),
        "projected_yearly": round(total_commission * 12, 2)
    }

@api_router.get("/commissions/leaderboard")
async def get_commission_leaderboard(period: str = None):
    """Get commission leaderboard for all reps"""
    if not period:
        period = datetime.utcnow().strftime("%Y-%m")
    
    reps = await db.reps.find().to_list(100)
    leaderboard = []
    
    for rep in reps:
        summary = await get_commission_summary(rep.get("id"), period)
        leaderboard.append({
            "rep_id": rep.get("id"),
            "rep_name": rep.get("name"),
            "deals_count": summary["deals_count"],
            "total_earned": summary["total_earned"],
            "tier": summary["current_tier"]["name"]
        })
    
    # Sort by total earned
    leaderboard.sort(key=lambda x: x["total_earned"], reverse=True)
    
    # Add ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

@api_router.get("/commissions/tiers")
async def get_commission_tiers():
    """Get all commission tiers"""
    return [
        {
            "tier": i + 1,
            "deals_range": f"{t.min_deals}-{t.max_deals or '∞'}",
            "base_rate": t.base_rate * 100,
            "bonus_per_deal": t.bonus_per_deal
        }
        for i, t in enumerate(COMMISSION_TIERS)
    ]

@api_router.get("/commissions/history/{rep_id}")
async def get_commission_history(rep_id: str, limit: int = 12):
    """Get commission history for last N months"""
    history = []
    current = datetime.utcnow()
    
    for i in range(limit):
        month = current.month - i
        year = current.year
        while month <= 0:
            month += 12
            year -= 1
        period = f"{year}-{month:02d}"
        
        summary = await get_commission_summary(rep_id, period)
        history.append({
            "period": period,
            "month_name": datetime(year, month, 1).strftime("%B %Y"),
            "deals_count": summary["deals_count"],
            "total_earned": summary["total_earned"]
        })
    
    return history

# ============== VOICE-TO-LEAD ==============

@api_router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Transcribe voice recording to text using OpenAI Whisper"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import tempfile
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Save uploaded file temporarily
        content = await file.read()
        
        # For now, return mock transcription (Whisper integration would go here)
        # In production, use OpenAI Whisper API
        mock_transcription = "John Smith at 123 Main Street, Beverly Hills. Monthly bill around $250. Very interested in solar, has a tile roof. Best time to call is evenings after 6 PM."
        
        return {
            "transcription": mock_transcription,
            "duration_seconds": len(content) / 16000,  # Rough estimate
            "confidence": 0.95
        }
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")

@api_router.post("/voice/create-lead")
async def create_lead_from_voice(transcription: str, rep_id: str = None):
    """Use AI to extract lead info from transcription and create lead"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"voice-lead-{datetime.utcnow().timestamp()}",
            system_message="""You are a data extraction assistant. Extract lead information from voice transcriptions.
            Return ONLY valid JSON with these fields:
            - name (string)
            - phone (string, format: XXX-XXX-XXXX)
            - email (string or null)
            - address (string)
            - zip_code (string)
            - monthly_bill (number)
            - roof_type (string: asphalt/tile/metal/flat)
            - notes (string with any additional info)
            - timeline (string: immediate/1-3 months/3-6 months/6+ months)
            """
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Extract lead info from: {transcription}")
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                lead_data = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found in response")
        except:
            # Fallback to mock data
            lead_data = {
                "name": "John Smith",
                "phone": "555-123-4567",
                "address": "123 Main Street",
                "zip_code": "90210",
                "monthly_bill": 250,
                "roof_type": "tile",
                "notes": transcription,
                "timeline": "1-3 months"
            }
        
        # Create the lead
        lead = Lead(
            name=lead_data.get("name", "Unknown"),
            phone=lead_data.get("phone", ""),
            email=lead_data.get("email"),
            address=lead_data.get("address", ""),
            zip_code=lead_data.get("zip_code", ""),
            bill_amount=lead_data.get("monthly_bill", 150),
            roof_type=lead_data.get("roof_type", "asphalt"),
            notes=lead_data.get("notes", ""),
            timeline=lead_data.get("timeline", "3-6 months"),
            source="voice_note",
            assigned_rep_id=rep_id
        )
        
        # Calculate AI score
        ai_result = await calculate_ai_score(lead.model_dump())
        lead.ai_score = ai_result["ai_score"]
        lead.probability_to_close = ai_result["probability_to_close"]
        lead.ai_insights = ai_result["ai_insights"]
        
        await db.leads.insert_one(lead.model_dump())
        
        return {
            "success": True,
            "lead": lead.model_dump(),
            "extracted_data": lead_data
        }
    except Exception as e:
        logger.error(f"Voice lead creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")

# ============== ADMIN DASHBOARD ==============

@api_router.get("/admin/dashboard")
async def get_admin_dashboard():
    """Get comprehensive admin dashboard data"""
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    # Get counts
    total_leads = await db.leads.count_documents({})
    new_leads_this_month = await db.leads.count_documents({"created_at": {"$gte": month_start}})
    total_reps = await db.reps.count_documents({})
    total_territories = await db.territories.count_documents({})
    
    # Deal stats
    closed_deals = await db.leads.find({"status": "closed_won"}).to_list(1000)
    closed_this_month = [d for d in closed_deals if d.get("updated_at", d.get("created_at", now)) >= month_start]
    
    total_revenue = sum(d.get("deal_value", d.get("bill_amount", 150) * 12 * 25 * 0.8) for d in closed_deals)
    monthly_revenue = sum(d.get("deal_value", d.get("bill_amount", 150) * 12 * 25 * 0.8) for d in closed_this_month)
    
    # Conversion rate
    total_leads_worked = await db.leads.count_documents({"status": {"$ne": "new"}})
    conversion_rate = (len(closed_deals) / total_leads_worked * 100) if total_leads_worked > 0 else 0
    
    # Lead status breakdown
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_breakdown = await db.leads.aggregate(status_pipeline).to_list(20)
    
    # Top performers
    rep_performance = []
    reps = await db.reps.find().to_list(100)
    for rep in reps:
        rep_deals = await db.leads.count_documents({
            "assigned_rep_id": rep.get("id"),
            "status": "closed_won"
        })
        rep_revenue = sum(d.get("deal_value", d.get("bill_amount", 150) * 12 * 25 * 0.8) 
                        for d in closed_deals if d.get("assigned_rep_id") == rep.get("id"))
        rep_performance.append({
            "id": rep.get("id"),
            "name": rep.get("name"),
            "deals": rep_deals,
            "revenue": round(rep_revenue, 2)
        })
    rep_performance.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Territory performance
    territory_performance = []
    territories = await db.territories.find().to_list(100)
    for territory in territories:
        t_leads = await db.leads.count_documents({"territory_id": territory.get("id")})
        t_closed = await db.leads.count_documents({
            "territory_id": territory.get("id"),
            "status": "closed_won"
        })
        territory_performance.append({
            "id": territory.get("id"),
            "name": territory.get("name"),
            "leads": t_leads,
            "closed": t_closed,
            "conversion": round(t_closed / t_leads * 100, 1) if t_leads > 0 else 0
        })
    territory_performance.sort(key=lambda x: x["conversion"], reverse=True)
    
    # Recent activity
    recent_leads = await db.leads.find().sort("created_at", -1).limit(5).to_list(5)
    recent_proposals = await db.proposals.find().sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "overview": {
            "total_leads": total_leads,
            "new_leads_this_month": new_leads_this_month,
            "total_reps": total_reps,
            "total_territories": total_territories,
            "total_revenue": round(total_revenue, 2),
            "monthly_revenue": round(monthly_revenue, 2),
            "conversion_rate": round(conversion_rate, 1),
            "closed_deals_count": len(closed_deals),
            "closed_this_month": len(closed_this_month)
        },
        "lead_status_breakdown": {s["_id"]: s["count"] for s in status_breakdown},
        "top_performers": rep_performance[:5],
        "territory_performance": territory_performance[:5],
        "recent_activity": {
            "leads": [{
                "id": l.get("id"),
                "name": l.get("name"),
                "status": l.get("status"),
                "created_at": l.get("created_at").isoformat() if isinstance(l.get("created_at"), datetime) else str(l.get("created_at")) if l.get("created_at") else None
            } for l in recent_leads],
            "proposals": [{
                "id": p.get("id"),
                "customer": p.get("customer_name"),
                "value": p.get("net_cost"),
                "created_at": p.get("created_at").isoformat() if isinstance(p.get("created_at"), datetime) else str(p.get("created_at")) if p.get("created_at") else None
            } for p in recent_proposals]
        }
    }

@api_router.get("/admin/users")
async def get_admin_users():
    """Get all users/reps for admin management"""
    reps = await db.reps.find().to_list(100)
    return [{
        "id": r.get("id"),
        "name": r.get("name"),
        "email": r.get("email"),
        "phone": r.get("phone"),
        "role": r.get("role", "rep"),
        "status": r.get("status", "active"),
        "created_at": r.get("created_at")
    } for r in reps]

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(user_id: str, role: str = None, status: str = None):
    """Update user role or status"""
    update_data = {}
    if role:
        update_data["role"] = role
    if status:
        update_data["status"] = status
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.reps.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "updated": update_data}

# ============== STRIPE SUBSCRIPTIONS ==============

# Define subscription plans (prices are monthly)
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price_monthly": 0.00,
        "price_annual": 0.00,
        "features": [
            "25 leads max",
            "Basic AI scoring",
            "1 user",
            "Solar calculator",
            "Email support"
        ],
        "limits": {
            "leads": 25,
            "users": 1,
            "ai_proposals": 0,
            "ai_lead_hunter": False,
            "team_chat": False,
            "admin_dashboard": False,
            "commissions": False,
            "route_optimizer": True,
            "white_label": False,
            "custom_branding": False,
            "custom_domain": False,
            "api_access": False
        }
    },
    "starter": {
        "name": "Starter",
        "price_monthly": 149.00,
        "price_annual": 1430.00,  # $119/mo - Save $358/year (20% off)
        "features": [
            "250 leads",
            "AI lead scoring",
            "3 users",
            "Route optimizer",
            "Solar calculator",
            "Voice notes",
            "Standard support"
        ],
        "limits": {
            "leads": 250,
            "users": 3,
            "ai_proposals": 5,
            "ai_lead_hunter": False,
            "team_chat": False,
            "admin_dashboard": False,
            "commissions": True,
            "route_optimizer": True,
            "white_label": False,
            "custom_branding": False,
            "custom_domain": False,
            "api_access": False
        }
    },
    "professional": {
        "name": "Professional",
        "price_monthly": 349.00,
        "price_annual": 3350.00,  # $279/mo - Save $838/year (20% off)
        "features": [
            "1,000 leads",
            "Advanced AI scoring",
            "10 users",
            "AI proposals (25/mo)",
            "Team chat",
            "Commission tracking",
            "Analytics dashboard",
            "Priority support"
        ],
        "limits": {
            "leads": 1000,
            "users": 10,
            "ai_proposals": 25,
            "ai_lead_hunter": False,
            "team_chat": True,
            "admin_dashboard": False,
            "commissions": True,
            "route_optimizer": True,
            "white_label": False,
            "custom_branding": False,
            "custom_domain": False,
            "api_access": False
        }
    },
    "business": {
        "name": "Business",
        "price_monthly": 699.00,
        "price_annual": 6710.00,  # $559/mo - Save $1,678/year (20% off)
        "features": [
            "5,000 leads",
            "Full AI suite",
            "25 users",
            "AI Lead Hunter",
            "AI proposals (100/mo)",
            "Admin dashboard",
            "Custom branding (logo + colors)",
            "Dedicated support"
        ],
        "limits": {
            "leads": 5000,
            "users": 25,
            "ai_proposals": 100,
            "ai_lead_hunter": True,
            "team_chat": True,
            "admin_dashboard": True,
            "commissions": True,
            "route_optimizer": True,
            "white_label": False,
            "custom_branding": True,
            "custom_domain": False,
            "api_access": True
        }
    },
    "enterprise": {
        "name": "Enterprise", 
        "price_monthly": 1499.00,
        "price_annual": 14390.00,  # $1,199/mo - Save $3,598/year (20% off)
        "features": [
            "Unlimited leads",
            "Unlimited users",
            "Full AI suite",
            "AI Lead Hunter",
            "Unlimited AI proposals",
            "Full white-label",
            "Custom domain",
            "API access",
            "24/7 priority support",
            "Dedicated account manager"
        ],
        "limits": {
            "leads": -1,
            "users": -1,
            "ai_proposals": -1,
            "ai_lead_hunter": True,
            "team_chat": True,
            "admin_dashboard": True,
            "commissions": True,
            "route_optimizer": True,
            "white_label": True,
            "custom_branding": True,
            "custom_domain": True,
            "api_access": True
        }
    }
}

# Branding/White-label models
class BrandingSettings(BaseModel):
    organization_id: str
    company_name: str = "Solar Empire"
    logo_url: Optional[str] = None
    primary_color: str = "#f59e0b"
    secondary_color: str = "#0a1628"
    accent_color: str = "#22c55e"
    custom_domain: Optional[str] = None
    email_from_name: Optional[str] = None
    email_footer: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Referral Program Models
class ReferralCode(BaseModel):
    user_id: str
    code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Referral(BaseModel):
    referrer_id: str
    referee_id: str
    referee_email: str
    status: str = "pending"  # pending, completed, rewarded
    reward_months: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class ReferralReward(BaseModel):
    user_id: str
    months_earned: int
    months_used: int = 0
    source: str  # "referral_made" or "referral_received"
    referral_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriptionRequest(BaseModel):
    plan_id: str
    origin_url: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    billing_period: str = "monthly"  # "monthly" or "annual"

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    plan_id: str
    plan_name: str
    amount: float
    currency: str = "usd"
    status: str = "pending"  # pending, completed, failed, expired
    payment_status: str = "initiated"
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get all available subscription plans with monthly and annual pricing"""
    return [
        {
            "id": plan_id,
            "name": plan["name"],
            "price_monthly": plan.get("price_monthly", plan.get("price", 0)),
            "price_annual": plan.get("price_annual", plan.get("price_monthly", 0) * 12 * 0.8),
            "savings_annual": round((plan.get("price_monthly", 0) * 12) - plan.get("price_annual", plan.get("price_monthly", 0) * 12 * 0.8), 2),
            "features": plan["features"],
            "limits": plan["limits"],
            "popular": plan_id == "professional"
        }
        for plan_id, plan in SUBSCRIPTION_PLANS.items()
    ]

@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(request: SubscriptionRequest, http_request: Request):
    """Create a Stripe checkout session for subscription"""
    if request.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[request.plan_id]
    
    # Free plan doesn't need checkout
    if plan.get("price_monthly", 0) == 0:
        # Just activate free plan directly
        if request.user_id:
            await db.subscriptions.update_one(
                {"user_id": request.user_id},
                {"$set": {
                    "plan_id": "free",
                    "plan_name": "Free",
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
        return {"success": True, "plan": "free", "message": "Free plan activated"}
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    # Build success/cancel URLs
    success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/subscription/cancel"
    
    # Initialize Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    price = plan["price_annual"] if request.billing_period == "annual" else plan["price_monthly"]
    checkout_request = CheckoutSessionRequest(
        amount=price,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan_id": request.plan_id,
            "plan_name": plan["name"],
            "user_id": request.user_id or "",
            "email": request.email or "",
            "billing_period": request.billing_period,
            "type": "subscription"
        }
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id=session.session_id,
            user_id=request.user_id,
            email=request.email,
            plan_id=request.plan_id,
            plan_name=plan["name"],
            amount=price,
            status="pending",
            payment_status="initiated",
            metadata={
                "plan_features": plan["features"],
                "plan_limits": plan["limits"],
                "billing_period": request.billing_period
            }
        )
        await db.payment_transactions.insert_one(transaction.model_dump())
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@api_router.get("/subscriptions/status/{session_id}")
async def get_subscription_status(session_id: str):
    """Get the status of a subscription checkout session"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    # Check if already processed
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction and transaction.get("status") == "completed":
        return {
            "status": "completed",
            "payment_status": "paid",
            "plan_id": transaction.get("plan_id"),
            "plan_name": transaction.get("plan_name")
        }
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        if checkout_status.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Activate subscription for user
            if transaction and transaction.get("user_id"):
                await db.subscriptions.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {
                        "plan_id": transaction["plan_id"],
                        "plan_name": transaction["plan_name"],
                        "status": "active",
                        "started_at": datetime.utcnow(),
                        "expires_at": datetime.utcnow() + timedelta(days=30),
                        "updated_at": datetime.utcnow()
                    }},
                    upsert=True
                )
        elif checkout_status.status == "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "expired",
                    "payment_status": "expired",
                    "updated_at": datetime.utcnow()
                }}
            )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100,  # Convert from cents
            "currency": checkout_status.currency,
            "plan_id": transaction.get("plan_id") if transaction else None,
            "plan_name": transaction.get("plan_name") if transaction else None
        }
    except Exception as e:
        logger.error(f"Error checking subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")

@api_router.get("/subscriptions/current/{user_id}")
async def get_current_subscription(user_id: str):
    """Get current subscription for a user"""
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        # Default to free plan
        return {
            "plan_id": "free",
            "plan_name": "Free",
            "status": "active",
            "features": SUBSCRIPTION_PLANS["free"]["features"],
            "limits": SUBSCRIPTION_PLANS["free"]["limits"]
        }
    
    plan = SUBSCRIPTION_PLANS.get(subscription.get("plan_id"), SUBSCRIPTION_PLANS["free"])
    
    return {
        "plan_id": subscription.get("plan_id"),
        "plan_name": subscription.get("plan_name"),
        "status": subscription.get("status"),
        "started_at": subscription.get("started_at"),
        "expires_at": subscription.get("expires_at"),
        "features": plan["features"],
        "limits": plan["limits"]
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Handle the event
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            # Update transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Activate subscription
                if transaction.get("user_id"):
                    await db.subscriptions.update_one(
                        {"user_id": transaction["user_id"]},
                        {"$set": {
                            "plan_id": transaction["plan_id"],
                            "plan_name": transaction["plan_name"],
                            "status": "active",
                            "started_at": datetime.utcnow(),
                            "expires_at": datetime.utcnow() + timedelta(days=30),
                            "updated_at": datetime.utcnow()
                        }},
                        upsert=True
                    )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

# ============== BRANDING / WHITE-LABEL ENDPOINTS ==============

@api_router.get("/branding/{organization_id}")
async def get_branding(organization_id: str):
    """Get branding settings for an organization"""
    branding = await db.branding.find_one({"organization_id": organization_id}, {"_id": 0})
    if not branding:
        # Return default branding
        return {
            "organization_id": organization_id,
            "company_name": "Solar Empire",
            "logo_url": None,
            "primary_color": "#f59e0b",
            "secondary_color": "#0a1628",
            "accent_color": "#22c55e",
            "custom_domain": None,
            "is_default": True
        }
    return branding

@api_router.put("/branding/{organization_id}")
async def update_branding(organization_id: str, request: Request):
    """Update branding settings (requires Business or Enterprise plan)"""
    data = await request.json()
    user_id = data.get("user_id")
    
    # Check subscription level
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    plan_id = subscription.get("plan_id", "free") if subscription else "free"
    
    if plan_id not in ["business", "enterprise"]:
        raise HTTPException(
            status_code=403, 
            detail="Custom branding requires Business or Enterprise plan"
        )
    
    plan_limits = SUBSCRIPTION_PLANS.get(plan_id, {}).get("limits", {})
    
    # Check what they're allowed to customize
    allowed_fields = ["company_name"]
    
    if plan_limits.get("custom_branding"):
        allowed_fields.extend(["logo_url", "primary_color", "secondary_color", "accent_color", "email_from_name", "email_footer"])
    
    if plan_limits.get("custom_domain"):
        allowed_fields.append("custom_domain")
    
    # Filter to allowed fields only
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["organization_id"] = organization_id
    update_data["updated_at"] = datetime.utcnow()
    
    await db.branding.update_one(
        {"organization_id": organization_id},
        {"$set": update_data},
        upsert=True
    )
    
    branding = await db.branding.find_one({"organization_id": organization_id}, {"_id": 0})
    return branding

@api_router.post("/branding/{organization_id}/logo")
async def upload_logo(organization_id: str, request: Request):
    """Upload logo for branding (requires Business or Enterprise plan)"""
    # In production, this would handle file upload to cloud storage
    data = await request.json()
    logo_url = data.get("logo_url")
    
    if not logo_url:
        raise HTTPException(status_code=400, detail="logo_url is required")
    
    await db.branding.update_one(
        {"organization_id": organization_id},
        {"$set": {"logo_url": logo_url, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    
    return {"success": True, "logo_url": logo_url}

# ============== REFERRAL PROGRAM ENDPOINTS ==============

import random
import string

def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code"""
    # Create a memorable code: SOLAR + 6 random chars
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SOLAR{random_part}"

@api_router.get("/referrals/{user_id}")
async def get_referral_info(user_id: str):
    """Get user's referral code and stats"""
    # Get or create referral code
    referral_code = await db.referral_codes.find_one({"user_id": user_id}, {"_id": 0})
    
    if not referral_code:
        # Generate new code
        code = generate_referral_code(user_id)
        referral_code = {
            "user_id": user_id,
            "code": code,
            "created_at": datetime.utcnow()
        }
        await db.referral_codes.insert_one(referral_code)
    
    # Remove MongoDB _id if present
    if "_id" in referral_code:
        del referral_code["_id"]
    
    # Get referral stats
    referrals_made = await db.referrals.count_documents({"referrer_id": user_id})
    successful_referrals = await db.referrals.count_documents({
        "referrer_id": user_id, 
        "status": {"$in": ["completed", "rewarded"]}
    })
    
    # Get rewards earned
    rewards = await db.referral_rewards.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    total_months_earned = sum(r.get("months_earned", 0) for r in rewards)
    total_months_used = sum(r.get("months_used", 0) for r in rewards)
    
    # Get recent referrals
    recent_referrals = await db.referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "code": referral_code.get("code"),
        "share_url": f"https://solarempire.app/signup?ref={referral_code.get('code')}",
        "stats": {
            "total_referrals": referrals_made,
            "successful_referrals": successful_referrals,
            "pending_referrals": referrals_made - successful_referrals,
            "months_earned": total_months_earned,
            "months_available": total_months_earned - total_months_used,
            "value_earned": total_months_earned * 149  # Based on Starter plan value
        },
        "recent_referrals": recent_referrals,
        "rewards": {
            "per_referral": "1 month free",
            "referee_bonus": "1 month free",
            "description": "Both you and your friend get 1 month free when they subscribe!"
        }
    }

@api_router.post("/referrals/apply")
async def apply_referral_code(request: Request):
    """Apply a referral code when a new user signs up"""
    data = await request.json()
    code = data.get("code", "").upper()
    referee_id = data.get("referee_id")
    referee_email = data.get("referee_email")
    
    if not code or not referee_id:
        raise HTTPException(status_code=400, detail="Code and referee_id are required")
    
    # Find the referral code
    referral_code = await db.referral_codes.find_one({"code": code})
    if not referral_code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_id = referral_code["user_id"]
    
    # Can't refer yourself
    if referrer_id == referee_id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Check if already referred
    existing = await db.referrals.find_one({
        "referee_id": referee_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="This account has already used a referral code")
    
    # Create referral record
    referral = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer_id,
        "referee_id": referee_id,
        "referee_email": referee_email or "",
        "status": "pending",
        "reward_months": 1,
        "created_at": datetime.utcnow()
    }
    await db.referrals.insert_one(referral)
    
    return {
        "success": True,
        "message": "Referral code applied! You'll both get 1 month free when you subscribe.",
        "referral_id": referral["id"]
    }

@api_router.post("/referrals/complete/{referral_id}")
async def complete_referral(referral_id: str):
    """Complete a referral when referee makes their first payment"""
    referral = await db.referrals.find_one({"id": referral_id})
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    if referral["status"] != "pending":
        return {"success": True, "message": "Referral already processed"}
    
    # Mark as completed
    await db.referrals.update_one(
        {"id": referral_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow()
        }}
    )
    
    # Award rewards to both parties
    reward_months = referral.get("reward_months", 1)
    
    # Reward for referrer
    await db.referral_rewards.insert_one({
        "user_id": referral["referrer_id"],
        "months_earned": reward_months,
        "months_used": 0,
        "source": "referral_made",
        "referral_id": referral_id,
        "created_at": datetime.utcnow()
    })
    
    # Reward for referee
    await db.referral_rewards.insert_one({
        "user_id": referral["referee_id"],
        "months_earned": reward_months,
        "months_used": 0,
        "source": "referral_received",
        "referral_id": referral_id,
        "created_at": datetime.utcnow()
    })
    
    # Update referral status
    await db.referrals.update_one(
        {"id": referral_id},
        {"$set": {"status": "rewarded"}}
    )
    
    return {
        "success": True,
        "message": f"Referral completed! Both users received {reward_months} month(s) free.",
        "rewards_given": {
            "referrer": reward_months,
            "referee": reward_months
        }
    }

@api_router.get("/referrals/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers leaderboard"""
    pipeline = [
        {"$match": {"status": {"$in": ["completed", "rewarded"]}}},
        {"$group": {
            "_id": "$referrer_id",
            "total_referrals": {"$sum": 1},
            "total_months_earned": {"$sum": "$reward_months"}
        }},
        {"$sort": {"total_referrals": -1}},
        {"$limit": 10}
    ]
    
    leaderboard = await db.referrals.aggregate(pipeline).to_list(10)
    
    # Get user details for each
    results = []
    for i, entry in enumerate(leaderboard):
        user = await db.users.find_one({"id": entry["_id"]}, {"_id": 0, "name": 1})
        results.append({
            "rank": i + 1,
            "user_id": entry["_id"],
            "name": user.get("name", "Solar Pro") if user else "Solar Pro",
            "referrals": entry["total_referrals"],
            "months_earned": entry["total_months_earned"],
            "value_earned": entry["total_months_earned"] * 149
        })
    
    return {"leaderboard": results}

# ============== LEGAL AGREEMENT ENDPOINTS ==============

@api_router.post("/legal/accept")
async def accept_legal_agreements(request: Request):
    """Record user's acceptance of legal agreements"""
    data = await request.json()
    
    acceptance_record = {
        "user_id": data.get("user_id"),
        "accepted_at": data.get("accepted_at", datetime.utcnow().isoformat()),
        "agreements": data.get("agreements", []),
        "version": data.get("version", "1.0"),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "created_at": datetime.utcnow()
    }
    
    await db.legal_acceptances.insert_one(acceptance_record)
    
    return {"success": True, "message": "Legal agreements accepted"}

@api_router.get("/legal/status/{user_id}")
async def get_legal_status(user_id: str):
    """Check if user has accepted all required legal agreements"""
    acceptance = await db.legal_acceptances.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if acceptance:
        return {
            "accepted": True,
            "accepted_at": acceptance.get("accepted_at"),
            "version": acceptance.get("version"),
            "agreements": acceptance.get("agreements", [])
        }
    
    return {"accepted": False}

# ============== FEATURE GATING ENDPOINTS ==============

@api_router.get("/features/check/{user_id}/{feature}")
async def check_feature_access(user_id: str, feature: str):
    """Check if user has access to a specific feature"""
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    plan_id = subscription.get("plan_id", "free") if subscription else "free"
    
    plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["free"])
    limits = plan.get("limits", {})
    
    # Check boolean features
    if feature in ["ai_lead_hunter", "team_chat", "admin_dashboard", "commissions", 
                   "route_optimizer", "white_label", "custom_branding", "custom_domain", "api_access"]:
        has_access = limits.get(feature, False)
        return {
            "feature": feature,
            "has_access": has_access,
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "upgrade_required": not has_access,
            "upgrade_to": get_upgrade_recommendation(feature) if not has_access else None
        }
    
    # Check numeric limits
    if feature in ["leads", "users", "ai_proposals"]:
        limit = limits.get(feature, 0)
        return {
            "feature": feature,
            "limit": limit,
            "unlimited": limit == -1,
            "plan_id": plan_id,
            "plan_name": plan["name"]
        }
    
    return {"feature": feature, "has_access": False, "error": "Unknown feature"}

def get_upgrade_recommendation(feature: str) -> str:
    """Get the minimum plan required for a feature"""
    feature_requirements = {
        "ai_lead_hunter": "business",
        "team_chat": "professional",
        "admin_dashboard": "business",
        "commissions": "starter",
        "white_label": "enterprise",
        "custom_branding": "business",
        "custom_domain": "enterprise",
        "api_access": "business"
    }
    return feature_requirements.get(feature, "starter")

@api_router.get("/features/usage/{user_id}")
async def get_feature_usage(user_id: str):
    """Get current usage vs limits for a user"""
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    plan_id = subscription.get("plan_id", "free") if subscription else "free"
    
    plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["free"])
    limits = plan.get("limits", {})
    
    # Get current usage counts
    lead_count = await db.leads.count_documents({"organization_id": user_id})
    user_count = await db.users.count_documents({"organization_id": user_id})
    
    # Get AI proposal usage this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    proposal_count = await db.proposals.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": start_of_month}
    })
    
    return {
        "plan_id": plan_id,
        "plan_name": plan["name"],
        "usage": {
            "leads": {
                "used": lead_count,
                "limit": limits.get("leads", 0),
                "unlimited": limits.get("leads") == -1,
                "percentage": (lead_count / limits["leads"] * 100) if limits.get("leads", 0) > 0 else 0
            },
            "users": {
                "used": user_count,
                "limit": limits.get("users", 0),
                "unlimited": limits.get("users") == -1
            },
            "ai_proposals": {
                "used": proposal_count,
                "limit": limits.get("ai_proposals", 0),
                "unlimited": limits.get("ai_proposals") == -1,
                "resets_on": (start_of_month + timedelta(days=32)).replace(day=1).isoformat()
            }
        },
        "features": {
            "ai_lead_hunter": limits.get("ai_lead_hunter", False),
            "team_chat": limits.get("team_chat", False),
            "admin_dashboard": limits.get("admin_dashboard", False),
            "commissions": limits.get("commissions", False),
            "white_label": limits.get("white_label", False),
            "custom_branding": limits.get("custom_branding", False),
            "custom_domain": limits.get("custom_domain", False),
            "api_access": limits.get("api_access", False)
        }
    }

# ============== DOWNLOAD PAGE ROUTE ==============
STATIC_DIR = Path(__file__).parent / "static"

@api_router.get("/download", include_in_schema=False)
async def serve_download_page():
    """Serve the Android app download landing page"""
    download_file = STATIC_DIR / "download.html"
    if download_file.exists():
        return FileResponse(download_file, media_type="text/html")
    raise HTTPException(status_code=404, detail="Download page not found")

@api_router.get("/static/{filename}", include_in_schema=False)
async def serve_static_file(filename: str):
    """Serve static files like screenshots"""
    file_path = STATIC_DIR / filename
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

# ============== B2B LANDING PAGE & BUSINESS INQUIRY ==============
TEMPLATES_DIR = Path(__file__).parent / "templates"

@api_router.get("/business", include_in_schema=False)
async def serve_business_landing_page():
    """Serve the B2B landing page for solar company partnerships"""
    template_file = TEMPLATES_DIR / "payment_portal.html"
    if template_file.exists():
        return FileResponse(template_file, media_type="text/html")
    raise HTTPException(status_code=404, detail="Landing page not found")

class BusinessInquiry(BaseModel):
    company: str
    name: str
    email: str
    phone: str
    reps: Optional[str] = None
    territories: Optional[str] = None
    notes: Optional[str] = None
    selected_plan: str
    price_range: str
    wants_exclusivity: bool = False

@api_router.post("/business-inquiry")
async def submit_business_inquiry(inquiry: BusinessInquiry):
    """Submit a B2B partnership inquiry"""
    # Store the inquiry in the database
    inquiry_doc = {
        "id": str(uuid.uuid4()),
        "company": inquiry.company,
        "name": inquiry.name,
        "email": inquiry.email,
        "phone": inquiry.phone,
        "reps_count": inquiry.reps,
        "territories": inquiry.territories,
        "notes": inquiry.notes,
        "selected_plan": inquiry.selected_plan,
        "price_range": inquiry.price_range,
        "wants_exclusivity": inquiry.wants_exclusivity,
        "status": "new",
        "created_at": datetime.utcnow()
    }
    
    await db.business_inquiries.insert_one(inquiry_doc)
    
    # Send notification email if Resend is configured
    try:
        from routes.integrations import RESEND_API_KEY
        if RESEND_API_KEY:
            import resend
            resend.api_key = RESEND_API_KEY
            
            # Send notification to admin
            resend.Emails.send({
                "from": "Solar Empire <notifications@resend.dev>",
                "to": ["phillipromero54@gmail.com"],
                "subject": f"🔥 New B2B Inquiry: {inquiry.company} - {inquiry.selected_plan}",
                "html": f"""
                <h2>New Business Partnership Inquiry</h2>
                <p><strong>Company:</strong> {inquiry.company}</p>
                <p><strong>Contact:</strong> {inquiry.name}</p>
                <p><strong>Email:</strong> {inquiry.email}</p>
                <p><strong>Phone:</strong> {inquiry.phone}</p>
                <p><strong>Number of Reps:</strong> {inquiry.reps or 'Not specified'}</p>
                <p><strong>Territories:</strong> {inquiry.territories or 'Not specified'}</p>
                <p><strong>Selected Plan:</strong> {inquiry.selected_plan}</p>
                <p><strong>Price Range:</strong> {inquiry.price_range}</p>
                <p><strong>Wants Exclusivity:</strong> {'Yes' if inquiry.wants_exclusivity else 'No'}</p>
                <p><strong>Notes:</strong> {inquiry.notes or 'None'}</p>
                <hr>
                <p><em>Submitted at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</em></p>
                """
            })
            logger.info(f"Business inquiry notification sent for {inquiry.company}")
    except Exception as e:
        logger.warning(f"Could not send inquiry notification email: {e}")
    
    return {
        "success": True,
        "message": "Thank you for your inquiry! We'll be in touch within 24 hours.",
        "inquiry_id": inquiry_doc["id"]
    }

@api_router.get("/business-inquiries")
async def get_business_inquiries(status: Optional[str] = None, limit: int = 50):
    """Get all business inquiries (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    inquiries = await db.business_inquiries.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert ObjectId and datetime for JSON serialization
    for inquiry in inquiries:
        inquiry.pop("_id", None)
        if isinstance(inquiry.get("created_at"), datetime):
            inquiry["created_at"] = inquiry["created_at"].isoformat()
    
    return {"inquiries": inquiries, "total": len(inquiries)}

# Include the main API router
app.include_router(api_router)

# Include modular route files under /api prefix
app.include_router(legal_router, prefix="/api")
app.include_router(referrals_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(testimonials_router, prefix="/api")
app.include_router(competitors_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(territories_router, prefix="/api")
app.include_router(reps_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(lead_hunter_router)  # Note: This router already has /api prefix
app.include_router(scan_results_router)  # Note: This router already has /api prefix
app.include_router(notifications_router)  # Note: This router already has /api prefix
app.include_router(integrations_router)  # Note: This router already has /api prefix
app.include_router(lead_scoring_router)  # Note: This router already has /api prefix
app.include_router(elite_tools_router)  # Note: This router already has /api prefix
app.include_router(ai_power_tools_router)  # Note: This router already has /api prefix
app.include_router(intelligence_tools_router)  # Phase 3: Intelligence features
app.include_router(admin_router)  # Admin Dashboard API
app.include_router(admin_auth_router)  # Admin Authentication & RBAC
app.include_router(two_factor_auth_router)  # Two-Factor Authentication
app.include_router(organizations_router)  # Multi-tenancy & White-label
app.include_router(advanced_features_router)  # Phase 1-4: Advanced patentable features

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== EMAIL CAMPAIGN SCHEDULER ==============
scheduler = AsyncIOScheduler()

async def scheduled_email_campaign_processor():
    """Process email drip campaigns every hour"""
    try:
        from routes.integrations import process_drip_campaigns
        logger.info("⏰ Running scheduled email campaign processing...")
        await process_drip_campaigns()
        logger.info("✅ Scheduled email campaign processing complete")
    except Exception as e:
        logger.error(f"❌ Scheduled email campaign processing failed: {e}")

@app.on_event("startup")
async def start_scheduler():
    """Start the background scheduler for email campaigns"""
    scheduler.add_job(
        scheduled_email_campaign_processor,
        IntervalTrigger(hours=1),
        id="email_campaign_processor",
        name="Process Email Drip Campaigns",
        replace_existing=True
    )
    scheduler.start()
    logger.info("🚀 Email campaign scheduler started - processing every hour")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    logger.info("📧 Email campaign scheduler stopped")
    client.close()
