"""
Shared Pydantic models for Solar Empire API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from bson import ObjectId


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
    roof_type: str = "asphalt"
    bill_amount: float = 150.0
    timeline: str = "3-6 months"
    source: str = "web_form"
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
    status: str = "new"
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
    utility_rate: float = 0.12
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
    status: str = "scheduled"
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
    status: str = "pending"
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


# SMS Models
class SMSRequest(BaseModel):
    to_phone: str
    message: str


class SMSResponse(BaseModel):
    success: bool
    message_sid: Optional[str] = None
    error: Optional[str] = None


# Partner/Investor Models
class PartnerCreate(BaseModel):
    name: str
    email: str
    company: str
    investment_amount: float = 0.0
    territories: List[str] = []
    revenue_share_percent: float = 5.0


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
    status: str = "active"
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


# Blockchain Ledger Models
class LedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_type: str
    amount: float
    description: str
    related_id: Optional[str] = None
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


# Compliance Models
class PermitCreate(BaseModel):
    installation_id: str
    permit_type: str
    jurisdiction: str
    status: str = "pending"
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


# Chat Models
class ChatMessageModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    content: str
    mentions: List[str] = []
    reactions: Dict[str, List[str]] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Proposal Models
class ProposalResponse(BaseModel):
    id: str
    lead_id: str
    html_content: str
    created_at: datetime
    system_size_kw: float
    total_cost: float
    monthly_savings: float
    payback_years: float


# Testimonial Models
class TestimonialCreate(BaseModel):
    customer_name: str
    location: str
    system_size: str
    rating: int
    review: str
    savings_amount: Optional[float] = None
    image_url: Optional[str] = None


class Testimonial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    location: str
    system_size: str
    rating: int
    review: str
    savings_amount: Optional[float] = None
    image_url: Optional[str] = None
    verified: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Competitor Models
class CompetitorCreate(BaseModel):
    name: str
    price_per_watt: float
    warranty_years: int
    financing_options: List[str] = []
    installation_time: str
    customer_rating: float
    pros: List[str] = []
    cons: List[str] = []


class Competitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price_per_watt: float
    warranty_years: int
    financing_options: List[str] = []
    installation_time: str
    customer_rating: float
    pros: List[str] = []
    cons: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
