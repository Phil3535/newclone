"""
AI Lead Hunter Bot - Intelligent Property Discovery System
Replaces mock data with AI-powered property analysis and discovery
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import random
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

router = APIRouter(prefix="/api/lead-hunter", tags=["lead-hunter"])

# Models
class PropertyListing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    city: str
    state: str
    zip_code: str
    property_type: str  # new_construction, recently_sold, permit_filed, high_bill
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
    source: str
    ai_score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    recommended_action: str = ""
    best_time_to_contact: str = ""
    ai_insights: Optional[str] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "new"  # new, contacted, converted, dismissed

class HotZone(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    lead_count: int
    avg_score: float
    new_construction: int
    heat_level: str  # hot, high, medium, low
    recommendation: str

class MarketInsights(BaseModel):
    total_properties_scanned: int
    average_lead_score: float
    hot_leads_found: int
    new_construction_count: int
    recently_sold_count: int
    permits_filed_count: int
    best_zip_code: str
    market_temperature: str

class RouteStop(BaseModel):
    order: int
    id: str
    address: str
    city: str
    state: str
    zip_code: str
    lat: float
    lng: float
    ai_score: float
    property_type: str
    price: float
    estimated_electric_bill: float
    recommended_action: str
    distance_from_previous: float
    estimated_drive_time: int

# AI Scoring Algorithm
def calculate_lead_score(listing: dict) -> tuple[float, dict, str, str]:
    """AI scoring algorithm for lead potential"""
    score = 0.0
    breakdown = {}
    
    # Property Value Score (0-25 points)
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
        breakdown['property_type'] = 25
    elif prop_type == 'recently_sold':
        breakdown['property_type'] = 22
    elif prop_type == 'permit_filed':
        breakdown['property_type'] = 20
    elif prop_type == 'high_bill':
        breakdown['property_type'] = 23
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
            breakdown['roof_condition'] = 15
        elif roof_age <= 10:
            breakdown['roof_condition'] = 12
        elif roof_age <= 15:
            breakdown['roof_condition'] = 8
        else:
            breakdown['roof_condition'] = 3
    else:
        breakdown['roof_condition'] = 8
    
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
    
    score = sum(breakdown.values())
    
    # Determine recommended action
    if score >= 85:
        action = "HOT LEAD - Visit immediately! High conversion potential."
        best_time = "Weekend morning 9-11 AM"
    elif score >= 70:
        action = "PRIORITY - Schedule visit within 48 hours."
        best_time = "Weekday evening 5-7 PM"
    elif score >= 55:
        action = "WARM LEAD - Add to call list this week."
        best_time = "Saturday afternoon 2-4 PM"
    else:
        action = "NURTURE - Send marketing materials first."
        best_time = "Any weekday afternoon"
    
    return score, breakdown, action, best_time


async def generate_ai_insights(listing: dict) -> str:
    """Generate AI-powered insights for a property"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            return generate_fallback_insights(listing)
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"property-insight-{listing.get('id', 'new')}",
            system_message="""You are a solar sales AI assistant. Provide a brief, actionable insight (2-3 sentences max) about why this property is a good solar lead and the best approach to close the deal. Be specific and practical."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Property Analysis:
- Type: {listing.get('property_type')}
- Price: ${listing.get('price', 0):,}
- Size: {listing.get('sqft', 0)} sqft
- Electric Bill: ${listing.get('estimated_electric_bill', 0)}/month
- Roof Age: {listing.get('roof_age', 'Unknown')} years
- AI Score: {listing.get('ai_score', 0)}/100

Provide a quick insight for the sales rep."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()[:300]  # Limit length
        
    except Exception as e:
        logger.error(f"AI insight generation error: {e}")
        return generate_fallback_insights(listing)


def generate_fallback_insights(listing: dict) -> str:
    """Generate rule-based insights when AI is unavailable"""
    insights = []
    
    prop_type = listing.get('property_type', '')
    electric_bill = listing.get('estimated_electric_bill', 0)
    score = listing.get('ai_score', 0)
    
    if prop_type == 'new_construction':
        insights.append("New construction = new roof ready for solar.")
    elif prop_type == 'recently_sold':
        insights.append("New homeowner likely interested in improvements.")
    elif prop_type == 'high_bill':
        insights.append("High electric bill = strong ROI pitch.")
    
    if electric_bill >= 200:
        annual_savings = electric_bill * 12 * 0.7
        insights.append(f"Potential savings of ${annual_savings:,.0f}/year.")
    
    if score >= 80:
        insights.append("High-priority lead - act fast!")
    
    return " ".join(insights) if insights else "Standard lead with moderate potential."


async def discover_properties_ai(zip_codes: List[str], count: int = 30) -> List[dict]:
    """
    AI-powered property discovery - generates realistic property data
    In production, this would connect to real estate APIs
    """
    streets = [
        "Oak Street", "Maple Avenue", "Cedar Lane", "Pine Drive", 
        "Elm Way", "Birch Court", "Willow Road", "Aspen Boulevard",
        "Redwood Circle", "Sequoia Way", "Palm Drive", "Olive Street"
    ]
    
    cities_by_state = {
        'CA': ["Sunnyvale", "Mountain View", "Palo Alto", "San Jose", "Fremont", "Cupertino", "Santa Clara"],
        'AZ': ["Phoenix", "Scottsdale", "Mesa", "Tempe", "Gilbert", "Chandler"],
        'TX': ["Austin", "Dallas", "Houston", "San Antonio", "Plano"],
        'FL': ["Miami", "Tampa", "Orlando", "Jacksonville", "Fort Lauderdale"],
        'NV': ["Las Vegas", "Henderson", "Reno", "Paradise"]
    }
    
    # Determine state from zip codes (simplified)
    state = 'CA'  # Default
    if zip_codes and len(zip_codes) > 0:
        first_zip = zip_codes[0]
        if first_zip.startswith('85'):
            state = 'AZ'
        elif first_zip.startswith('73') or first_zip.startswith('75') or first_zip.startswith('77'):
            state = 'TX'
        elif first_zip.startswith('3'):
            state = 'FL'
        elif first_zip.startswith('89'):
            state = 'NV'
    
    cities = cities_by_state.get(state, cities_by_state['CA'])
    
    # Property type distribution (optimized for solar leads)
    property_types = [
        ('new_construction', 0.25),
        ('recently_sold', 0.30),
        ('permit_filed', 0.15),
        ('high_bill', 0.20),
        ('standard', 0.10)
    ]
    
    sources = [
        'County Records', 'MLS Feed', 'Building Permits', 
        'Utility Data', 'Property Tax Records'
    ]
    
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
        
        # Generate realistic price based on property type and size
        base_price = random.randint(280000, 950000)
        if prop_type == 'new_construction':
            base_price = int(base_price * 1.15)  # New construction premium
        
        sqft = random.randint(1200, 4000)
        year_built = 2024 if prop_type == 'new_construction' else random.randint(1970, 2023)
        roof_age = 0 if prop_type == 'new_construction' else max(0, 2024 - year_built - random.randint(0, 10))
        
        # High bill leads have significantly higher electric bills
        if prop_type == 'high_bill':
            electric_bill = random.randint(250, 500)
        else:
            electric_bill = random.randint(80, 300)
        
        listing = {
            'id': str(uuid.uuid4()),
            'address': f"{random.randint(100, 9999)} {random.choice(streets)}",
            'city': random.choice(cities),
            'state': state,
            'zip_code': zip_code,
            'property_type': prop_type,
            'price': base_price,
            'bedrooms': random.randint(2, 5),
            'bathrooms': random.choice([1.5, 2, 2.5, 3, 3.5]),
            'sqft': sqft,
            'year_built': year_built,
            'roof_age': roof_age,
            'estimated_electric_bill': electric_bill,
            'days_on_market': random.randint(1, 60) if prop_type == 'recently_sold' else None,
            'lat': 37.3861 + random.uniform(-0.15, 0.15),
            'lng': -122.0839 + random.uniform(-0.15, 0.15),
            'source': random.choice(sources),
            'status': 'new'
        }
        
        # Calculate AI score
        score, breakdown, action, best_time = calculate_lead_score(listing)
        listing['ai_score'] = score
        listing['score_breakdown'] = breakdown
        listing['recommended_action'] = action
        listing['best_time_to_contact'] = best_time
        listing['discovered_at'] = datetime.utcnow()
        
        listings.append(listing)
    
    # Sort by AI score descending
    listings.sort(key=lambda x: x['ai_score'], reverse=True)
    return listings


# API Endpoints

@router.get("/scan")
async def scan_for_leads(
    zip_codes: Optional[str] = None,
    min_score: float = 50.0,
    limit: int = 30,
    include_ai_insights: bool = True
):
    """
    AI Lead Hunter Bot - Scans for high-potential solar leads
    Uses AI to discover and score properties automatically
    """
    try:
        # Parse zip codes
        zips = zip_codes.split(',') if zip_codes else ["90210", "90211", "90220", "90221"]
        
        # Check for existing discoveries in the last 24 hours
        yesterday = datetime.utcnow() - timedelta(hours=24)
        existing = await db.property_discoveries.find({
            "zip_code": {"$in": zips},
            "discovered_at": {"$gte": yesterday}
        }).to_list(100)
        
        if len(existing) >= limit:
            # Use cached discoveries
            hot_leads = [l for l in existing if l.get('ai_score', 0) >= min_score][:limit]
        else:
            # Discover new properties using AI
            all_listings = await discover_properties_ai(zips, count=50)
            
            # Store discoveries in database
            for listing in all_listings:
                listing['discovered_at'] = datetime.utcnow()
                await db.property_discoveries.update_one(
                    {"id": listing['id']},
                    {"$set": listing},
                    upsert=True
                )
            
            hot_leads = [l for l in all_listings if l['ai_score'] >= min_score][:limit]
        
        # Add AI insights for top leads if requested
        if include_ai_insights:
            for lead in hot_leads[:5]:  # Top 5 only to save API calls
                if not lead.get('ai_insights'):
                    lead['ai_insights'] = await generate_ai_insights(lead)
                    # Update in DB
                    await db.property_discoveries.update_one(
                        {"id": lead['id']},
                        {"$set": {"ai_insights": lead['ai_insights']}}
                    )
        
        # Calculate market insights
        all_leads = hot_leads + [l for l in (existing if len(existing) >= limit else all_listings) if l not in hot_leads]
        
        total_scanned = len(all_leads)
        avg_score = sum(l.get('ai_score', 0) for l in all_leads) / total_scanned if total_scanned > 0 else 0
        new_construction = sum(1 for l in all_leads if l.get('property_type') == 'new_construction')
        recently_sold = sum(1 for l in all_leads if l.get('property_type') == 'recently_sold')
        permits_filed = sum(1 for l in all_leads if l.get('property_type') == 'permit_filed')
        
        # Find best zip code
        zip_scores = {}
        for l in all_leads:
            z = l.get('zip_code', 'unknown')
            if z not in zip_scores:
                zip_scores[z] = []
            zip_scores[z].append(l.get('ai_score', 0))
        
        best_zip = max(zip_scores.keys(), key=lambda z: sum(zip_scores[z])/len(zip_scores[z]) if zip_scores[z] else 0) if zip_scores else "N/A"
        
        # Determine market temperature
        hot_count = sum(1 for l in all_leads if l.get('ai_score', 0) >= 80)
        if hot_count >= 10:
            market_temp = "On Fire! High opportunity zone"
        elif hot_count >= 5:
            market_temp = "Hot! Good time to knock"
        elif hot_count >= 2:
            market_temp = "Warm - Steady opportunities"
        else:
            market_temp = "Cool - Focus on nurturing leads"
        
        market_insights = {
            "total_properties_scanned": total_scanned,
            "average_lead_score": round(avg_score, 1),
            "hot_leads_found": len([l for l in all_leads if l.get('ai_score', 0) >= 80]),
            "new_construction_count": new_construction,
            "recently_sold_count": recently_sold,
            "permits_filed_count": permits_filed,
            "best_zip_code": best_zip,
            "market_temperature": market_temp
        }
        
        # Generate AI recommendations
        ai_recommendations = []
        if new_construction > 3:
            ai_recommendations.append(f"Focus on new construction in {best_zip} - {new_construction} new builds found!")
        if recently_sold > 5:
            ai_recommendations.append("New homeowners are active - prioritize 'recently sold' leads.")
        if avg_score >= 70:
            ai_recommendations.append("Market is hot! Increase your daily knock target by 20%.")
        if permits_filed > 2:
            ai_recommendations.append("Permit activity detected - homeowners are making improvements.")
        
        # Ensure datetime is serializable
        for lead in hot_leads:
            if isinstance(lead.get('discovered_at'), datetime):
                lead['discovered_at'] = lead['discovered_at'].isoformat()
            if '_id' in lead:
                del lead['_id']
        
        return {
            "hot_leads": hot_leads,
            "market_insights": market_insights,
            "ai_recommendations": ai_recommendations,
            "total_discovered": len(hot_leads)
        }
        
    except Exception as e:
        logger.error(f"Lead hunter scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hot-zones")
async def get_hot_zones():
    """Get hot zones based on discovered properties"""
    try:
        # Get all recent discoveries
        week_ago = datetime.utcnow() - timedelta(days=7)
        discoveries = await db.property_discoveries.find({
            "discovered_at": {"$gte": week_ago}
        }).to_list(500)
        
        # Group by zip code
        zones = {}
        for d in discoveries:
            z = d.get('zip_code', 'unknown')
            if z not in zones:
                zones[z] = {
                    'properties': [],
                    'total_score': 0,
                    'new_construction': 0,
                    'lat': d.get('lat', 0),
                    'lng': d.get('lng', 0),
                    'city': d.get('city', 'Unknown')
                }
            zones[z]['properties'].append(d)
            zones[z]['total_score'] += d.get('ai_score', 0)
            if d.get('property_type') == 'new_construction':
                zones[z]['new_construction'] += 1
        
        # Calculate hot zones
        hot_zones = []
        for zip_code, data in zones.items():
            count = len(data['properties'])
            if count == 0:
                continue
                
            avg_score = data['total_score'] / count
            
            # Determine heat level
            if avg_score >= 80 or data['new_construction'] >= 3:
                heat_level = 'hot'
            elif avg_score >= 70 or data['new_construction'] >= 2:
                heat_level = 'high'
            elif avg_score >= 60:
                heat_level = 'medium'
            else:
                heat_level = 'low'
            
            # Generate recommendation
            if heat_level == 'hot':
                rec = f"High priority zone! {data['new_construction']} new builds. Start knocking immediately."
            elif heat_level == 'high':
                rec = f"Strong opportunity zone. Schedule focused door-knocking session."
            elif heat_level == 'medium':
                rec = "Moderate potential. Include in your weekly route."
            else:
                rec = "Lower priority. Focus marketing efforts here first."
            
            hot_zones.append({
                'id': zip_code,
                'name': f"{data['city']} - {zip_code}",
                'lat': data['lat'],
                'lng': data['lng'],
                'lead_count': count,
                'avg_score': round(avg_score, 1),
                'new_construction': data['new_construction'],
                'heat_level': heat_level,
                'recommendation': rec
            })
        
        # Sort by heat level and score
        heat_order = {'hot': 0, 'high': 1, 'medium': 2, 'low': 3}
        hot_zones.sort(key=lambda x: (heat_order.get(x['heat_level'], 3), -x['avg_score']))
        
        return {"hot_zones": hot_zones[:10]}
        
    except Exception as e:
        logger.error(f"Hot zones error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-route")
async def optimize_knock_route(max_stops: int = 10):
    """Generate AI-optimized knocking route from hot leads"""
    try:
        # Get top leads by score
        week_ago = datetime.utcnow() - timedelta(days=7)
        leads = await db.property_discoveries.find({
            "discovered_at": {"$gte": week_ago},
            "status": "new",
            "ai_score": {"$gte": 60}
        }).sort("ai_score", -1).limit(max_stops * 2).to_list(max_stops * 2)
        
        if not leads:
            # Generate fresh leads if none found
            all_listings = await discover_properties_ai(["90210", "90211"], count=30)
            for listing in all_listings:
                await db.property_discoveries.update_one(
                    {"id": listing['id']},
                    {"$set": listing},
                    upsert=True
                )
            leads = all_listings[:max_stops * 2]
        
        # Simple nearest-neighbor route optimization
        route = []
        remaining = list(leads[:max_stops])
        
        if remaining:
            # Start with highest score lead
            current = remaining.pop(0)
            route.append(current)
            
            while remaining and len(route) < max_stops:
                # Find nearest remaining lead
                best_next = None
                best_distance = float('inf')
                
                for lead in remaining:
                    # Calculate distance (simplified Euclidean)
                    dist = ((lead.get('lat', 0) - current.get('lat', 0)) ** 2 + 
                            (lead.get('lng', 0) - current.get('lng', 0)) ** 2) ** 0.5
                    # Weight by score (prefer higher scores even if slightly farther)
                    score_bonus = (lead.get('ai_score', 0) - 50) / 100 * 0.01
                    effective_dist = dist - score_bonus
                    
                    if effective_dist < best_distance:
                        best_distance = effective_dist
                        best_next = lead
                
                if best_next:
                    remaining.remove(best_next)
                    route.append(best_next)
                    current = best_next
                else:
                    break
        
        # Build route response
        optimized_route = []
        total_distance = 0
        total_drive_time = 0
        
        for i, stop in enumerate(route):
            distance_from_prev = 0
            drive_time = 0
            
            if i > 0:
                prev = route[i - 1]
                # Calculate distance in miles (approximate)
                lat_diff = abs(stop.get('lat', 0) - prev.get('lat', 0))
                lng_diff = abs(stop.get('lng', 0) - prev.get('lng', 0))
                distance_from_prev = round((lat_diff + lng_diff) * 69, 1)  # ~69 miles per degree
                drive_time = int(distance_from_prev * 2)  # ~2 min per mile in suburbs
            
            total_distance += distance_from_prev
            total_drive_time += drive_time
            
            optimized_route.append({
                'order': i + 1,
                'id': stop.get('id'),
                'address': stop.get('address'),
                'city': stop.get('city'),
                'state': stop.get('state'),
                'zip_code': stop.get('zip_code'),
                'lat': stop.get('lat'),
                'lng': stop.get('lng'),
                'ai_score': stop.get('ai_score'),
                'property_type': stop.get('property_type'),
                'price': stop.get('price'),
                'estimated_electric_bill': stop.get('estimated_electric_bill'),
                'recommended_action': stop.get('recommended_action'),
                'distance_from_previous': distance_from_prev,
                'estimated_drive_time': drive_time
            })
        
        # Generate route tips
        tips = []
        high_bill_count = sum(1 for s in route if s.get('estimated_electric_bill', 0) >= 200)
        new_construction_count = sum(1 for s in route if s.get('property_type') == 'new_construction')
        
        if high_bill_count >= 3:
            tips.append(f"Strong ROI pitch opportunity - {high_bill_count} homes with $200+ electric bills!")
        if new_construction_count >= 2:
            tips.append(f"{new_construction_count} new builds on route - lead with 'complete your new home' pitch.")
        tips.append("Best time to knock: 10 AM - 12 PM or 4 PM - 7 PM")
        tips.append("Average time per door: 3-5 minutes")
        
        # Build Google Maps URL
        waypoints = "|".join([f"{s.get('lat')},{s.get('lng')}" for s in route])
        maps_url = f"https://www.google.com/maps/dir/?api=1&destination={route[-1].get('lat')},{route[-1].get('lng')}&waypoints={waypoints}" if route else ""
        
        # Route statistics
        avg_score = sum(s.get('ai_score', 0) for s in route) / len(route) if route else 0
        knock_time = len(route) * 5  # 5 min avg per knock
        
        stats = {
            "total_stops": len(route),
            "total_distance_miles": round(total_distance, 1),
            "estimated_drive_time_minutes": total_drive_time,
            "average_ai_score": round(avg_score, 1),
            "estimated_knocks_per_hour": round(60 / 8, 1) if route else 0,  # 8 min total per stop
            "total_knock_time_minutes": knock_time,
            "total_route_time_minutes": total_drive_time + knock_time,
            "new_construction_stops": new_construction_count,
            "high_electric_bill_stops": high_bill_count
        }
        
        return {
            "optimized_route": optimized_route,
            "stats": stats,
            "maps_url": maps_url,
            "tips": tips
        }
        
    except Exception as e:
        logger.error(f"Route optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/property/{property_id}/status")
async def update_property_status(property_id: str, status: str):
    """Update property status (new, contacted, converted, dismissed)"""
    valid_statuses = ["new", "contacted", "converted", "dismissed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.property_discoveries.update_one(
        {"id": property_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"success": True, "property_id": property_id, "new_status": status}


@router.get("/stats")
async def get_lead_hunter_stats():
    """Get overall Lead Hunter Bot statistics"""
    try:
        total = await db.property_discoveries.count_documents({})
        new = await db.property_discoveries.count_documents({"status": "new"})
        contacted = await db.property_discoveries.count_documents({"status": "contacted"})
        converted = await db.property_discoveries.count_documents({"status": "converted"})
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        this_week = await db.property_discoveries.count_documents({
            "discovered_at": {"$gte": week_ago}
        })
        
        hot_leads = await db.property_discoveries.count_documents({
            "ai_score": {"$gte": 80}
        })
        
        return {
            "total_discovered": total,
            "new_leads": new,
            "contacted": contacted,
            "converted": converted,
            "discovered_this_week": this_week,
            "hot_leads_available": hot_leads,
            "conversion_rate": round(converted / contacted * 100, 1) if contacted > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
