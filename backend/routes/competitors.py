"""
Competitor Comparison Routes
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import db
from models import Competitor, CompetitorCreate
from typing import List
import uuid

router = APIRouter(prefix="/competitors", tags=["competitors"])

# Solar Empire's own stats for comparison
SOLAR_EMPIRE_STATS = {
    "id": "solar-empire",
    "name": "Solar Empire",
    "price_per_watt": 2.50,
    "warranty_years": 25,
    "financing_options": ["$0 Down", "Low APR Financing", "Cash Purchase", "Lease Options", "PPA"],
    "installation_time": "1-2 days",
    "customer_rating": 4.9,
    "pros": [
        "AI-powered system optimization",
        "Best-in-class warranty",
        "Fastest installation time",
        "Premium Tier-1 panels",
        "24/7 monitoring included",
        "Local service & support"
    ],
    "cons": []
}


@router.post("/", response_model=Competitor)
async def create_competitor(competitor: CompetitorCreate):
    """Add a new competitor for comparison"""
    competitor_dict = competitor.dict()
    competitor_dict["id"] = str(uuid.uuid4())
    competitor_dict["created_at"] = datetime.utcnow()
    
    await db.competitors.insert_one(competitor_dict)
    return Competitor(**competitor_dict)


@router.get("/", response_model=List[Competitor])
async def get_competitors():
    """Get all competitors"""
    competitors = await db.competitors.find({}, {"_id": 0}).to_list(50)
    
    # If no competitors in DB, return seed data
    if not competitors:
        competitors = [
            {
                "id": "comp-001",
                "name": "SunRun",
                "price_per_watt": 3.10,
                "warranty_years": 20,
                "financing_options": ["Lease", "PPA", "Loan"],
                "installation_time": "4-6 weeks",
                "customer_rating": 3.8,
                "pros": ["Large company", "Nationwide coverage"],
                "cons": ["Higher prices", "Long wait times", "Lease-focused sales"],
                "created_at": datetime.utcnow()
            },
            {
                "id": "comp-002",
                "name": "Tesla Solar",
                "price_per_watt": 2.85,
                "warranty_years": 25,
                "financing_options": ["Cash", "Loan"],
                "installation_time": "3-4 weeks",
                "customer_rating": 3.5,
                "pros": ["Brand recognition", "Powerwall integration"],
                "cons": ["Customer service issues", "Limited customization", "No lease options"],
                "created_at": datetime.utcnow()
            },
            {
                "id": "comp-003",
                "name": "Vivint Solar",
                "price_per_watt": 3.25,
                "warranty_years": 20,
                "financing_options": ["Lease", "PPA"],
                "installation_time": "4-8 weeks",
                "customer_rating": 3.6,
                "pros": ["Smart home integration"],
                "cons": ["Aggressive sales tactics", "Higher long-term costs", "Complex contracts"],
                "created_at": datetime.utcnow()
            },
            {
                "id": "comp-004",
                "name": "Palmetto Solar",
                "price_per_watt": 2.95,
                "warranty_years": 25,
                "financing_options": ["Cash", "Loan", "Lease"],
                "installation_time": "3-5 weeks",
                "customer_rating": 4.0,
                "pros": ["Transparent pricing", "Good monitoring app"],
                "cons": ["Limited coverage area", "Newer company"],
                "created_at": datetime.utcnow()
            }
        ]
    
    return competitors


@router.get("/compare")
async def compare_with_solar_empire(competitor_id: str = None):
    """Get comparison between Solar Empire and competitors"""
    competitors = await db.competitors.find({}, {"_id": 0}).to_list(50)
    
    if not competitors:
        # Use seed data
        competitors = [
            {"name": "SunRun", "price_per_watt": 3.10, "warranty_years": 20, "customer_rating": 3.8},
            {"name": "Tesla Solar", "price_per_watt": 2.85, "warranty_years": 25, "customer_rating": 3.5},
            {"name": "Vivint Solar", "price_per_watt": 3.25, "warranty_years": 20, "customer_rating": 3.6},
        ]
    
    # Calculate savings vs each competitor for a typical 8kW system
    system_size_watts = 8000
    comparisons = []
    
    for comp in competitors:
        if competitor_id and comp.get("id") != competitor_id:
            continue
            
        comp_cost = comp["price_per_watt"] * system_size_watts
        se_cost = SOLAR_EMPIRE_STATS["price_per_watt"] * system_size_watts
        savings = comp_cost - se_cost
        
        comparisons.append({
            "competitor": comp,
            "solar_empire": SOLAR_EMPIRE_STATS,
            "savings_with_solar_empire": savings,
            "warranty_difference": SOLAR_EMPIRE_STATS["warranty_years"] - comp.get("warranty_years", 20),
            "rating_difference": SOLAR_EMPIRE_STATS["customer_rating"] - comp.get("customer_rating", 4.0),
            "talking_points": [
                f"Save ${savings:,.0f} compared to {comp['name']}",
                f"{SOLAR_EMPIRE_STATS['warranty_years']} year warranty vs {comp.get('warranty_years', 20)} years",
                f"Installation in {SOLAR_EMPIRE_STATS['installation_time']} vs {comp.get('installation_time', '3-4 weeks')}",
                f"Higher rated: {SOLAR_EMPIRE_STATS['customer_rating']} vs {comp.get('customer_rating', 4.0)} stars"
            ]
        })
    
    return {
        "solar_empire": SOLAR_EMPIRE_STATS,
        "comparisons": comparisons
    }


@router.get("/{competitor_id}", response_model=Competitor)
async def get_competitor(competitor_id: str):
    """Get a specific competitor"""
    competitor = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return Competitor(**competitor)


@router.put("/{competitor_id}", response_model=Competitor)
async def update_competitor(competitor_id: str, competitor: CompetitorCreate):
    """Update competitor information"""
    update_data = competitor.dict()
    result = await db.competitors.update_one(
        {"id": competitor_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    updated = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    return Competitor(**updated)


@router.delete("/{competitor_id}")
async def delete_competitor(competitor_id: str):
    """Delete a competitor"""
    result = await db.competitors.delete_one({"id": competitor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return {"success": True}
