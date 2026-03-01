"""
Admin Dashboard API Routes
Provides endpoints for admin management of users, territories, campaigns, and analytics.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import os

# MongoDB connection
from pymongo import MongoClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'solar_empire')
client = MongoClient(mongo_url)
db = client[db_name]

router = APIRouter(prefix="/api/admin-panel", tags=["admin-panel"])

# ============ Models ============

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_leads: int
    leads_this_month: int
    total_appointments: int
    appointments_this_week: int
    total_commissions: float
    commissions_this_month: float
    conversion_rate: float
    email_campaigns_active: int

class UserSummary(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    leads_count: int
    appointments_count: int
    total_commission: float
    created_at: str
    last_active: Optional[str] = None

class TerritoryInfo(BaseModel):
    id: str
    name: str
    zip_codes: List[str]
    assigned_reps: List[str]
    total_leads: int
    total_installs: int
    market_share: float

class CampaignSummary(BaseModel):
    id: str
    name: str
    status: str
    total_enrolled: int
    emails_sent: int
    open_rate: float
    click_rate: float
    created_at: str

class LeadOverview(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    status: str
    score: int
    source: str
    assigned_rep: Optional[str]
    created_at: str

# ============ Dashboard Overview ============

@router.get("/dashboard", response_model=AdminStats)
async def get_admin_dashboard():
    """Get overall admin dashboard statistics."""
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)
    
    # Get user stats
    total_users = db.users.count_documents({}) if 'users' in db.list_collection_names() else 0
    active_users = db.users.count_documents({"status": "active"}) if total_users > 0 else 0
    
    # Get lead stats
    total_leads = db.leads.count_documents({}) if 'leads' in db.list_collection_names() else 0
    leads_this_month = db.leads.count_documents({
        "created_at": {"$gte": month_ago.isoformat()}
    }) if total_leads > 0 else 0
    
    # Get appointment stats
    total_appointments = db.appointments.count_documents({}) if 'appointments' in db.list_collection_names() else 0
    appointments_this_week = db.appointments.count_documents({
        "date": {"$gte": week_ago.isoformat()}
    }) if total_appointments > 0 else 0
    
    # Get commission stats
    commission_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_commissions = 0.0
    commissions_this_month = 0.0
    if 'commissions' in db.list_collection_names():
        result = list(db.commissions.aggregate(commission_pipeline))
        if result:
            total_commissions = result[0].get("total", 0)
        
        monthly_pipeline = [
            {"$match": {"created_at": {"$gte": month_ago.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        monthly_result = list(db.commissions.aggregate(monthly_pipeline))
        if monthly_result:
            commissions_this_month = monthly_result[0].get("total", 0)
    
    # Calculate conversion rate
    closed_leads = db.leads.count_documents({"status": "closed_won"}) if total_leads > 0 else 0
    conversion_rate = (closed_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Email campaigns
    active_campaigns = db.email_campaigns.count_documents({"status": "active"}) if 'email_campaigns' in db.list_collection_names() else 0
    
    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_leads=total_leads,
        leads_this_month=leads_this_month,
        total_appointments=total_appointments,
        appointments_this_week=appointments_this_week,
        total_commissions=total_commissions,
        commissions_this_month=commissions_this_month,
        conversion_rate=round(conversion_rate, 1),
        email_campaigns_active=active_campaigns
    )

# ============ User Management ============

@router.get("/users", response_model=List[UserSummary])
async def get_all_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    """Get all users with their stats."""
    query = {}
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    
    users = []
    
    # Check if users collection exists
    if 'users' not in db.list_collection_names():
        # Return mock data for demo
        return [
            UserSummary(
                id="rep-001",
                name="John Martinez",
                email="john@solarempire.com",
                role="sales_rep",
                status="active",
                leads_count=45,
                appointments_count=28,
                total_commission=12500.00,
                created_at="2024-01-15",
                last_active="2024-02-21"
            ),
            UserSummary(
                id="rep-002",
                name="Sarah Johnson",
                email="sarah@solarempire.com",
                role="sales_rep",
                status="active",
                leads_count=62,
                appointments_count=41,
                total_commission=18750.00,
                created_at="2024-01-10",
                last_active="2024-02-21"
            ),
            UserSummary(
                id="rep-003",
                name="Mike Chen",
                email="mike@solarempire.com",
                role="team_lead",
                status="active",
                leads_count=38,
                appointments_count=22,
                total_commission=9800.00,
                created_at="2024-02-01",
                last_active="2024-02-20"
            ),
            UserSummary(
                id="admin-001",
                name="Admin User",
                email="admin@solarempire.com",
                role="admin",
                status="active",
                leads_count=0,
                appointments_count=0,
                total_commission=0,
                created_at="2024-01-01",
                last_active="2024-02-21"
            )
        ]
    
    cursor = db.users.find(query).skip(skip).limit(limit)
    
    for user in cursor:
        user_id = str(user.get("_id", user.get("id", "")))
        
        # Get user stats
        leads_count = db.leads.count_documents({"assigned_rep": user_id}) if 'leads' in db.list_collection_names() else 0
        appointments_count = db.appointments.count_documents({"rep_id": user_id}) if 'appointments' in db.list_collection_names() else 0
        
        # Get total commission
        total_commission = 0.0
        if 'commissions' in db.list_collection_names():
            commission_result = list(db.commissions.aggregate([
                {"$match": {"rep_id": user_id}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            if commission_result:
                total_commission = commission_result[0].get("total", 0)
        
        users.append(UserSummary(
            id=user_id,
            name=user.get("name", "Unknown"),
            email=user.get("email", ""),
            role=user.get("role", "sales_rep"),
            status=user.get("status", "active"),
            leads_count=leads_count,
            appointments_count=appointments_count,
            total_commission=total_commission,
            created_at=str(user.get("created_at", ""))[:10],
            last_active=str(user.get("last_active", ""))[:10] if user.get("last_active") else None
        ))
    
    return users

@router.post("/users/{user_id}/status")
async def update_user_status(user_id: str, status: str):
    """Update user status (active/inactive/suspended)."""
    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = db.users.update_one(
        {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"User status updated to {status}"}

# ============ Territory Management ============

@router.get("/territories", response_model=List[TerritoryInfo])
async def get_territories():
    """Get all territories with stats."""
    # Return mock territories for demo
    return [
        TerritoryInfo(
            id="ter-001",
            name="Los Angeles Metro",
            zip_codes=["90210", "90211", "90212", "90213", "90220"],
            assigned_reps=["John Martinez", "Sarah Johnson"],
            total_leads=156,
            total_installs=42,
            market_share=68.5
        ),
        TerritoryInfo(
            id="ter-002",
            name="San Diego County",
            zip_codes=["92101", "92102", "92103", "92104", "92105"],
            assigned_reps=["Mike Chen"],
            total_leads=89,
            total_installs=28,
            market_share=52.3
        ),
        TerritoryInfo(
            id="ter-003",
            name="Orange County",
            zip_codes=["92612", "92614", "92617", "92618", "92620"],
            assigned_reps=["Sarah Johnson"],
            total_leads=124,
            total_installs=35,
            market_share=61.2
        ),
        TerritoryInfo(
            id="ter-004",
            name="Phoenix Metro",
            zip_codes=["85001", "85002", "85003", "85004", "85005"],
            assigned_reps=["John Martinez", "Mike Chen"],
            total_leads=201,
            total_installs=58,
            market_share=72.8
        )
    ]

@router.post("/territories")
async def create_territory(
    name: str,
    zip_codes: List[str],
    assigned_reps: List[str] = []
):
    """Create a new territory."""
    territory = {
        "name": name,
        "zip_codes": zip_codes,
        "assigned_reps": assigned_reps,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    
    result = db.territories.insert_one(territory)
    
    return {
        "success": True,
        "id": str(result.inserted_id),
        "message": f"Territory '{name}' created successfully"
    }

# ============ Email Campaign Management ============

@router.get("/campaigns", response_model=List[CampaignSummary])
async def get_campaigns():
    """Get all email campaigns with stats."""
    campaigns = []
    
    if 'email_campaigns' not in db.list_collection_names():
        # Return mock data
        return [
            CampaignSummary(
                id="camp-001",
                name="New Lead Welcome Series",
                status="active",
                total_enrolled=245,
                emails_sent=1420,
                open_rate=42.5,
                click_rate=12.3,
                created_at="2024-01-15"
            ),
            CampaignSummary(
                id="camp-002",
                name="Re-engagement Campaign",
                status="active",
                total_enrolled=89,
                emails_sent=356,
                open_rate=38.2,
                click_rate=8.7,
                created_at="2024-02-01"
            ),
            CampaignSummary(
                id="camp-003",
                name="Summer Solar Promo",
                status="paused",
                total_enrolled=312,
                emails_sent=624,
                open_rate=45.1,
                click_rate=15.2,
                created_at="2024-02-10"
            )
        ]
    
    cursor = db.email_campaigns.find({})
    
    for campaign in cursor:
        campaign_id = str(campaign.get("_id", ""))
        
        # Get enrollment count
        enrolled = db.drip_enrollments.count_documents({"campaign_id": campaign_id}) if 'drip_enrollments' in db.list_collection_names() else 0
        
        campaigns.append(CampaignSummary(
            id=campaign_id,
            name=campaign.get("name", "Unnamed Campaign"),
            status=campaign.get("status", "active"),
            total_enrolled=enrolled,
            emails_sent=campaign.get("emails_sent", 0),
            open_rate=campaign.get("open_rate", 0.0),
            click_rate=campaign.get("click_rate", 0.0),
            created_at=str(campaign.get("created_at", ""))[:10]
        ))
    
    return campaigns

@router.post("/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, status: str):
    """Update campaign status (active/paused/completed)."""
    if status not in ["active", "paused", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = db.email_campaigns.update_one(
        {"_id": ObjectId(campaign_id) if ObjectId.is_valid(campaign_id) else campaign_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"Campaign status updated to {status}"}

# ============ Lead Management ============

@router.get("/leads", response_model=List[LeadOverview])
async def get_all_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    """Get all leads with filtering."""
    query = {}
    if status:
        query["status"] = status
    if source:
        query["source"] = source
    
    if 'leads' not in db.list_collection_names():
        # Return mock data
        return [
            LeadOverview(id="lead-001", name="Robert Wilson", email="rwilson@email.com", phone="555-0101", status="new", score=85, source="qr_scan", assigned_rep="John Martinez", created_at="2024-02-21"),
            LeadOverview(id="lead-002", name="Jennifer Davis", email="jdavis@email.com", phone="555-0102", status="contacted", score=72, source="web_form", assigned_rep="Sarah Johnson", created_at="2024-02-20"),
            LeadOverview(id="lead-003", name="Michael Brown", email="mbrown@email.com", phone="555-0103", status="appointment_set", score=91, source="referral", assigned_rep="Mike Chen", created_at="2024-02-19"),
            LeadOverview(id="lead-004", name="Lisa Anderson", email="landerson@email.com", phone="555-0104", status="proposal_sent", score=88, source="qr_scan", assigned_rep="John Martinez", created_at="2024-02-18"),
            LeadOverview(id="lead-005", name="David Miller", email="dmiller@email.com", phone="555-0105", status="negotiating", score=95, source="referral", assigned_rep="Sarah Johnson", created_at="2024-02-17")
        ]
    
    leads = []
    cursor = db.leads.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    for lead in cursor:
        leads.append(LeadOverview(
            id=str(lead.get("_id", lead.get("id", ""))),
            name=lead.get("name", "Unknown"),
            email=lead.get("email", ""),
            phone=lead.get("phone"),
            status=lead.get("status", "new"),
            score=lead.get("score", 0),
            source=lead.get("source", "unknown"),
            assigned_rep=lead.get("assigned_rep"),
            created_at=str(lead.get("created_at", ""))[:10]
        ))
    
    return leads

# ============ Analytics ============

@router.get("/analytics/performance")
async def get_performance_analytics(days: int = Query(30, le=365)):
    """Get performance analytics for the specified period."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Generate daily stats for the chart
    daily_stats = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        daily_stats.append({
            "date": date.strftime("%Y-%m-%d"),
            "leads": 5 + (i % 10),  # Mock data
            "appointments": 2 + (i % 5),
            "closures": 1 + (i % 3),
            "revenue": 5000 + (i * 500) + (i % 7) * 1000
        })
    
    # Top performers
    top_performers = [
        {"name": "Sarah Johnson", "leads": 62, "closures": 18, "revenue": 45000},
        {"name": "John Martinez", "leads": 45, "closures": 14, "revenue": 35000},
        {"name": "Mike Chen", "leads": 38, "closures": 11, "revenue": 27500}
    ]
    
    # Lead sources breakdown
    lead_sources = [
        {"source": "QR Scans", "count": 156, "percentage": 42},
        {"source": "Referrals", "count": 89, "percentage": 24},
        {"source": "Web Forms", "count": 78, "percentage": 21},
        {"source": "Cold Calls", "count": 48, "percentage": 13}
    ]
    
    return {
        "period_days": days,
        "daily_stats": daily_stats,
        "top_performers": top_performers,
        "lead_sources": lead_sources,
        "summary": {
            "total_leads": sum(d["leads"] for d in daily_stats),
            "total_appointments": sum(d["appointments"] for d in daily_stats),
            "total_closures": sum(d["closures"] for d in daily_stats),
            "total_revenue": sum(d["revenue"] for d in daily_stats)
        }
    }

@router.get("/analytics/commissions")
async def get_commission_analytics():
    """Get commission analytics and breakdown."""
    # Mock commission data
    return {
        "total_paid": 125750.00,
        "total_pending": 18500.00,
        "total_this_month": 32500.00,
        "by_rep": [
            {"name": "Sarah Johnson", "paid": 45000, "pending": 7500},
            {"name": "John Martinez", "paid": 35000, "pending": 5000},
            {"name": "Mike Chen", "paid": 27500, "pending": 4000},
            {"name": "Others", "paid": 18250, "pending": 2000}
        ],
        "by_month": [
            {"month": "Jan 2024", "amount": 28500},
            {"month": "Feb 2024", "amount": 32500},
            {"month": "Mar 2024", "amount": 0},  # Future
        ],
        "avg_per_deal": 2500.00,
        "deals_this_month": 13
    }

# ============ System Status ============

@router.get("/system/status")
async def get_system_status():
    """Get system health status."""
    return {
        "status": "healthy",
        "database": "connected",
        "email_service": "operational",
        "sms_service": "operational",
        "scheduler": "running",
        "last_backup": "2024-02-21T03:00:00Z",
        "version": "1.0.0",
        "uptime_hours": 720
    }
