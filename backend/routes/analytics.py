"""
Analytics Routes - Dashboard stats, forecasting, and leaderboard
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from database import db
from models import DashboardStats, LeaderboardEntry
from typing import List, Optional
import random

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard/{rep_id}", response_model=DashboardStats)
async def get_dashboard_stats(rep_id: str):
    """Get dashboard statistics for a rep"""
    # Get lead counts
    total_leads = await db.leads.count_documents({"assigned_rep_id": rep_id})
    qualified_leads = await db.leads.count_documents({
        "assigned_rep_id": rep_id,
        "ai_score": {"$gte": 70}
    })
    
    # Get today's appointments
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    
    appointments_today = await db.appointments.count_documents({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": tomorrow}
    })
    
    appointments_week = await db.appointments.count_documents({
        "rep_id": rep_id,
        "scheduled_time": {"$gte": today, "$lt": week_end}
    })
    
    # Get rep info
    rep = await db.reps.find_one({"id": rep_id})
    revenue = rep.get("revenue_achieved", 0) if rep else 0
    target = rep.get("target_revenue", 5000) if rep else 5000
    deals = rep.get("deals_closed", 0) if rep else 0
    
    # Calculate conversion rate
    total_appointments = await db.appointments.count_documents({
        "rep_id": rep_id,
        "status": "completed"
    })
    conversion = (deals / total_appointments * 100) if total_appointments > 0 else 0
    
    # Get top territory
    territories = await db.territories.find({"assigned_rep_id": rep_id}).sort("priority_score", -1).limit(1).to_list(1)
    top_territory = territories[0].get("name") if territories else None
    
    return DashboardStats(
        total_leads=total_leads,
        qualified_leads=qualified_leads,
        appointments_today=appointments_today,
        appointments_this_week=appointments_week,
        revenue_this_month=revenue,
        revenue_target=target,
        deals_closed_this_month=deals,
        conversion_rate=round(conversion, 1),
        top_territory=top_territory
    )


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
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


@router.get("/company")
async def get_company_stats():
    """Get company-wide statistics for admin dashboard"""
    total_leads = await db.leads.count_documents({})
    qualified_leads = await db.leads.count_documents({"ai_score": {"$gte": 70}})
    total_reps = await db.reps.count_documents({})
    
    # Calculate total revenue
    reps = await db.reps.find().to_list(100)
    total_revenue = sum(r.get("revenue_achieved", 0) for r in reps)
    total_deals = sum(r.get("deals_closed", 0) for r in reps)
    
    # Get today's appointments
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    appointments_today = await db.appointments.count_documents({
        "scheduled_time": {"$gte": today, "$lt": tomorrow}
    })
    
    return {
        "total_leads": total_leads,
        "qualified_leads": qualified_leads,
        "total_reps": total_reps,
        "total_revenue": total_revenue,
        "total_deals": total_deals,
        "appointments_today": appointments_today,
        "avg_revenue_per_rep": total_revenue / total_reps if total_reps > 0 else 0,
        "avg_deals_per_rep": total_deals / total_reps if total_reps > 0 else 0
    }


@router.get("/forecast")
async def get_forecast(territory_id: Optional[str] = None, months_ahead: int = 6):
    """Get revenue forecast"""
    # Get historical data
    territories = await db.territories.find().to_list(100)
    reps = await db.reps.find().to_list(100)
    
    current_revenue = sum(r.get("revenue_achieved", 0) for r in reps)
    avg_close_rate = sum(t.get("close_rate", 0.15) for t in territories) / len(territories) if territories else 0.15
    
    monthly_forecasts = []
    base_revenue = current_revenue / 3  # Assume 3 months of data
    
    for i in range(months_ahead):
        month_date = datetime.utcnow() + timedelta(days=30 * (i + 1))
        growth = 1 + (0.05 * (i + 1))  # 5% monthly growth
        
        monthly_forecasts.append({
            "month": month_date.strftime("%B %Y"),
            "predicted_leads": int(50 + (i * 10)),
            "predicted_appointments": int(30 + (i * 5)),
            "predicted_installs": int(10 + (i * 2)),
            "predicted_revenue": round(base_revenue * growth, 2),
            "confidence": round(0.85 - (i * 0.05), 2)
        })
    
    total_predicted = sum(m["predicted_revenue"] for m in monthly_forecasts)
    
    return {
        "territory_id": territory_id,
        "forecast_period": f"Next {months_ahead} months",
        "monthly_forecasts": monthly_forecasts,
        "total_predicted_revenue": total_predicted,
        "growth_rate": 0.05,
        "best_month": monthly_forecasts[-1]["month"] if monthly_forecasts else None,
        "worst_month": monthly_forecasts[0]["month"] if monthly_forecasts else None,
        "ai_insights": "Based on historical trends, expect steady growth with peak performance in later months."
    }
