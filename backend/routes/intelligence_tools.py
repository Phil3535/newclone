"""
Intelligence & Data Tools - Phase 3 Elite Features
1. Neighborhood Heatmap - Show nearby solar installations
2. Weather-Based Outreach - Auto-campaigns after sunny/hot days
3. Competitor Price Intel - Track competitor pricing
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import logging
import random
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

router = APIRouter(prefix="/api/intelligence", tags=["intelligence-tools"])


# ============== DATA MODELS ==============

class HeatmapRequest(BaseModel):
    latitude: float = Field(..., description="Center latitude")
    longitude: float = Field(..., description="Center longitude")
    radius_miles: float = Field(default=2.0, description="Search radius in miles")
    zip_code: Optional[str] = None

class WeatherOutreachRequest(BaseModel):
    zip_codes: List[str] = Field(..., description="ZIP codes to check weather for")
    trigger_temp_f: float = Field(default=85, description="Temperature threshold to trigger outreach")
    trigger_conditions: List[str] = Field(default=["sunny", "clear", "hot"], description="Weather conditions to trigger")

class CompetitorQuoteRequest(BaseModel):
    competitor_name: str
    system_size_kw: float
    quote_amount: float
    zip_code: str
    panel_brand: Optional[str] = None
    inverter_brand: Optional[str] = None
    includes_battery: bool = False
    battery_brand: Optional[str] = None
    source: str = "customer_reported"  # customer_reported, sales_intel, online
    notes: Optional[str] = None

class AddInstallationRequest(BaseModel):
    address: str
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    system_size_kw: float
    install_date: Optional[str] = None
    customer_name: Optional[str] = None
    is_our_customer: bool = True


# ============== NEIGHBORHOOD HEATMAP ==============

# Sample installation data by ZIP code (in production, this would come from your CRM)
SAMPLE_INSTALLATIONS = {
    "90210": [
        {"lat": 34.0901, "lng": -118.4065, "size_kw": 8.5, "date": "2024-06"},
        {"lat": 34.0876, "lng": -118.4012, "size_kw": 10.2, "date": "2024-08"},
        {"lat": 34.0923, "lng": -118.4098, "size_kw": 6.8, "date": "2024-03"},
    ],
    "90211": [
        {"lat": 34.0634, "lng": -118.3828, "size_kw": 7.2, "date": "2024-05"},
        {"lat": 34.0612, "lng": -118.3856, "size_kw": 12.0, "date": "2024-07"},
    ],
    "90012": [
        {"lat": 34.0522, "lng": -118.2437, "size_kw": 5.5, "date": "2024-02"},
        {"lat": 34.0498, "lng": -118.2401, "size_kw": 9.0, "date": "2024-04"},
        {"lat": 34.0545, "lng": -118.2489, "size_kw": 7.8, "date": "2024-06"},
        {"lat": 34.0511, "lng": -118.2423, "size_kw": 11.5, "date": "2024-09"},
    ],
    "77001": [  # Houston
        {"lat": 29.7604, "lng": -95.3698, "size_kw": 8.0, "date": "2024-04"},
        {"lat": 29.7589, "lng": -95.3656, "size_kw": 10.5, "date": "2024-06"},
    ],
    "85001": [  # Phoenix
        {"lat": 33.4484, "lng": -112.0740, "size_kw": 12.0, "date": "2024-03"},
        {"lat": 33.4512, "lng": -112.0698, "size_kw": 14.5, "date": "2024-05"},
        {"lat": 33.4456, "lng": -112.0778, "size_kw": 9.8, "date": "2024-07"},
        {"lat": 33.4498, "lng": -112.0712, "size_kw": 11.2, "date": "2024-08"},
    ],
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two coordinates"""
    import math
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


@router.post("/heatmap/installations")
async def get_nearby_installations(request: HeatmapRequest):
    """
    Get solar installations near a location for heatmap display
    Uses both stored data and sample data
    """
    # Get installations from database
    db_installations = await db.solar_installations.find({}).to_list(100)
    
    # Get sample installations
    sample_installs = []
    if request.zip_code and request.zip_code in SAMPLE_INSTALLATIONS:
        sample_installs = SAMPLE_INSTALLATIONS[request.zip_code]
    else:
        # Get from all nearby ZIP codes
        for zip_code, installs in SAMPLE_INSTALLATIONS.items():
            sample_installs.extend(installs)
    
    # Filter by radius
    nearby = []
    for install in sample_installs:
        distance = haversine_distance(
            request.latitude, request.longitude,
            install["lat"], install["lng"]
        )
        if distance <= request.radius_miles:
            nearby.append({
                "latitude": install["lat"],
                "longitude": install["lng"],
                "system_size_kw": install["size_kw"],
                "install_date": install["date"],
                "distance_miles": round(distance, 2),
                "is_our_customer": random.choice([True, True, True, False])  # 75% ours
            })
    
    # Add database installations
    for install in db_installations:
        if install.get("latitude") and install.get("longitude"):
            distance = haversine_distance(
                request.latitude, request.longitude,
                install["latitude"], install["longitude"]
            )
            if distance <= request.radius_miles:
                nearby.append({
                    "latitude": install["latitude"],
                    "longitude": install["longitude"],
                    "system_size_kw": install.get("system_size_kw", 8),
                    "install_date": install.get("install_date", "2024"),
                    "distance_miles": round(distance, 2),
                    "is_our_customer": install.get("is_our_customer", True)
                })
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_miles"])
    
    # Calculate stats
    total_installs = len(nearby)
    our_installs = len([n for n in nearby if n.get("is_our_customer")])
    total_kw = sum(n["system_size_kw"] for n in nearby)
    avg_size = total_kw / total_installs if total_installs > 0 else 0
    
    # Generate sales talking points
    talking_points = []
    if total_installs >= 5:
        talking_points.append(f"Over {total_installs} homes in your neighborhood have already gone solar!")
    if our_installs >= 3:
        talking_points.append(f"We've installed {our_installs} systems within {request.radius_miles} miles of you.")
    if avg_size >= 8:
        talking_points.append(f"Average system size here is {avg_size:.1f}kW - neighbors are maximizing their roof space.")
    
    # Nearest installation for "your neighbor" pitch
    nearest = nearby[0] if nearby else None
    
    return {
        "center": {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "zip_code": request.zip_code
        },
        "radius_miles": request.radius_miles,
        "installations": nearby[:50],  # Limit to 50 for performance
        "stats": {
            "total_installations": total_installs,
            "our_installations": our_installs,
            "competitor_installations": total_installs - our_installs,
            "market_share_percent": round(our_installs / total_installs * 100, 1) if total_installs > 0 else 0,
            "total_kw_installed": round(total_kw, 1),
            "average_system_size_kw": round(avg_size, 1)
        },
        "sales_pitch": {
            "talking_points": talking_points,
            "nearest_installation": {
                "distance_miles": nearest["distance_miles"],
                "system_size_kw": nearest["system_size_kw"],
                "pitch": f"Your neighbor just {nearest['distance_miles']:.1f} miles away installed a {nearest['system_size_kw']}kW system!"
            } if nearest else None
        },
        "heatmap_intensity": "high" if total_installs >= 10 else "medium" if total_installs >= 5 else "low"
    }


@router.post("/heatmap/add-installation")
async def add_installation(request: AddInstallationRequest):
    """Add a new solar installation to the database"""
    installation = {
        "id": str(uuid.uuid4()),
        "address": request.address,
        "zip_code": request.zip_code,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "system_size_kw": request.system_size_kw,
        "install_date": request.install_date or datetime.utcnow().strftime("%Y-%m"),
        "customer_name": request.customer_name,
        "is_our_customer": request.is_our_customer,
        "created_at": datetime.utcnow()
    }
    
    await db.solar_installations.insert_one(installation)
    installation.pop("_id", None)
    installation["created_at"] = installation["created_at"].isoformat()
    
    return installation


@router.get("/heatmap/stats/{zip_code}")
async def get_zip_code_stats(zip_code: str):
    """Get solar adoption stats for a ZIP code"""
    # Get from database
    db_count = await db.solar_installations.count_documents({"zip_code": zip_code})
    
    # Get from samples
    sample_count = len(SAMPLE_INSTALLATIONS.get(zip_code, []))
    
    total = db_count + sample_count
    
    # Estimate market data (in production, use real data)
    estimated_homes = random.randint(1500, 5000)
    adoption_rate = (total / estimated_homes) * 100 if estimated_homes > 0 else 0
    
    return {
        "zip_code": zip_code,
        "installations": {
            "confirmed": total,
            "estimated_total": int(total * 1.3),  # Account for competitors we don't track
        },
        "market_data": {
            "estimated_homes": estimated_homes,
            "adoption_rate_percent": round(adoption_rate, 2),
            "market_potential": estimated_homes - total,
            "untapped_percent": round(100 - adoption_rate, 1)
        },
        "trend": "growing" if total > 5 else "emerging",
        "recommendation": "High potential" if adoption_rate < 5 else "Saturating" if adoption_rate > 15 else "Growing market"
    }


# ============== WEATHER-BASED OUTREACH ==============

# Import the weather service
from services.weather_service import weather_service

# Weather condition mappings for solar relevance
WEATHER_TRIGGERS = {
    "clear": {"score": 90, "message": "Perfect solar weather today!"},
    "sunny": {"score": 95, "message": "Sunny skies = maximum solar production!"},
    "hot": {"score": 85, "message": "Beat the heat with solar-powered AC savings!"},
    "partly cloudy": {"score": 70, "message": "Great solar day even with some clouds!"},
    "cloudy": {"score": 40, "message": "Panels still produce on cloudy days"},
    "clouds": {"score": 40, "message": "Panels still produce on cloudy days"},
    "rain": {"score": 20, "message": "Rain keeps panels clean!"},
    "storm": {"score": 10, "message": "Consider battery backup for outages"},
    "thunderstorm": {"score": 10, "message": "Consider battery backup for outages"},
}

def get_weather_for_zip(zip_code: str) -> dict:
    """Get weather data using the real weather service (falls back to mock if no API key)"""
    weather_data = weather_service.get_current_weather(zip_code)
    
    if not weather_data.get("success"):
        return {
            "zip_code": zip_code,
            "condition": "clear",
            "temperature_f": random.randint(72, 98),
            "humidity_percent": random.randint(30, 70),
            "uv_index": random.randint(6, 11),
            "solar_irradiance_kwh_m2": round(random.uniform(5.0, 7.5), 1),
            "forecast_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "source": "fallback"
        }
    
    weather = weather_data.get("weather", {})
    return {
        "zip_code": zip_code,
        "condition": weather.get("condition", "clear"),
        "condition_code": weather.get("condition_code", "Clear"),
        "temperature_f": weather.get("temperature_f", 75),
        "humidity_percent": weather.get("humidity_percent", 50),
        "uv_index": weather.get("uv_index", 7),
        "cloud_cover": weather.get("cloud_cover", 20),
        "wind_mph": weather.get("wind_mph", 5),
        "solar_irradiance_kwh_m2": round(5.5 + (weather.get("uv_index", 7) - 5) * 0.3, 1),
        "forecast_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "location_name": weather_data.get("location", {}).get("name", zip_code),
        "source": weather_data.get("source", "mock")
    }


@router.get("/weather/status")
async def get_weather_service_status():
    """
    Check the status of the weather service and whether real API is configured.
    """
    return {
        "service": "OpenWeatherMap",
        "configured": not weather_service.use_mock,
        "mode": "live" if not weather_service.use_mock else "mock",
        "api_key_set": bool(os.environ.get('OPENWEATHER_API_KEY')),
        "message": "Weather service is using live OpenWeatherMap data" if not weather_service.use_mock else "Set OPENWEATHER_API_KEY in backend/.env for live weather data",
        "setup_instructions": {
            "1": "Go to https://openweathermap.org/api and sign up for free",
            "2": "Get your API key from the dashboard",
            "3": "Add OPENWEATHER_API_KEY=your_key to backend/.env",
            "4": "Restart the backend service"
        } if weather_service.use_mock else None
    }


@router.get("/weather/current/{location}")
async def get_current_weather(location: str):
    """
    Get current weather for a single location.
    Location can be a ZIP code, city name, or coordinates (lat,lon).
    """
    weather_data = weather_service.get_current_weather(location)
    
    if not weather_data.get("success"):
        raise HTTPException(status_code=400, detail="Could not fetch weather data for this location")
    
    # Calculate solar score
    w = weather_data.get("weather", {})
    solar_score = 50  # Base score
    
    condition = w.get("condition", "").lower()
    if "clear" in condition or "sunny" in condition:
        solar_score += 30
    elif "cloud" in condition:
        solar_score -= 10
    elif "rain" in condition or "storm" in condition:
        solar_score -= 30
    
    uv = w.get("uv_index", 5)
    solar_score += min(uv * 2, 20)
    solar_score = max(0, min(100, solar_score))
    
    # Generate sales insight
    temp = w.get("temperature_f", 75)
    if temp >= 95:
        sales_insight = f"With {temp}°F heat, AC bills are soaring. Perfect time to pitch solar savings!"
    elif temp >= 85:
        sales_insight = f"Hot {temp}°F day means high energy use. Great day for solar conversations."
    elif "clear" in condition or "sunny" in condition:
        sales_insight = "Beautiful sunny day - panels would be producing at peak efficiency right now!"
    elif temp <= 35:
        sales_insight = f"Cold {temp}°F weather means high heating bills. Solar + battery can help."
    else:
        sales_insight = "Good conditions for a solar consultation today."
    
    return {
        "location": weather_data.get("location", {}),
        "weather": w,
        "source": weather_data.get("source", "mock"),
        "solar_score": solar_score,
        "solar_rating": "excellent" if solar_score >= 80 else "good" if solar_score >= 60 else "moderate" if solar_score >= 40 else "low",
        "sales_insight": sales_insight,
        "sunrise": weather_data.get("sunrise"),
        "sunset": weather_data.get("sunset"),
        "last_updated": weather_data.get("last_updated")
    }


@router.post("/weather/check-triggers")
async def check_weather_triggers(request: WeatherOutreachRequest):
    """
    Check weather conditions and determine if outreach should be triggered.
    Uses OpenWeatherMap API if configured, otherwise falls back to mock data.
    """
    results = []
    triggers_found = []
    
    for zip_code in request.zip_codes[:20]:  # Limit to 20 ZIP codes
        weather = get_weather_for_zip(zip_code)
        
        # Check temperature trigger
        temp_triggered = weather["temperature_f"] >= request.trigger_temp_f
        
        # Check condition trigger
        condition_triggered = any(
            trigger.lower() in weather["condition"].lower() 
            for trigger in request.trigger_conditions
        )
        
        # Get trigger info
        trigger_info = WEATHER_TRIGGERS.get(
            weather["condition"].lower(), 
            {"score": 50, "message": "Good day for solar!"}
        )
        
        triggered = temp_triggered or condition_triggered
        
        result = {
            "zip_code": zip_code,
            "weather": weather,
            "triggers": {
                "temperature_triggered": temp_triggered,
                "condition_triggered": condition_triggered,
                "should_outreach": triggered,
                "solar_score": trigger_info["score"],
                "suggested_message": trigger_info["message"]
            }
        }
        
        results.append(result)
        
        if triggered:
            triggers_found.append({
                "zip_code": zip_code,
                "reason": f"{weather['condition']} - {weather['temperature_f']}°F",
                "message": trigger_info["message"]
            })
    
    # Generate campaign suggestions
    campaign_suggestions = []
    if triggers_found:
        hot_zips = [t for t in triggers_found if "hot" in t["reason"].lower() or int(t["reason"].split("°F")[0].split()[-1]) >= 90]
        sunny_zips = [t for t in triggers_found if "sunny" in t["reason"].lower() or "clear" in t["reason"].lower()]
        
        if hot_zips:
            campaign_suggestions.append({
                "campaign_type": "heat_wave",
                "subject_line": "Beat the Heat: Solar = Lower AC Bills 🌡️",
                "target_zips": [h["zip_code"] for h in hot_zips],
                "urgency": "high",
                "best_send_time": "7 AM before peak heat"
            })
        
        if sunny_zips:
            campaign_suggestions.append({
                "campaign_type": "sunny_day",
                "subject_line": "Perfect Solar Day in Your Area! ☀️",
                "target_zips": [s["zip_code"] for s in sunny_zips],
                "urgency": "medium",
                "best_send_time": "10 AM while sun is shining"
            })
    
    return {
        "checked_at": datetime.utcnow().isoformat(),
        "zip_codes_checked": len(request.zip_codes),
        "triggers_found": len(triggers_found),
        "triggered_areas": triggers_found,
        "campaign_suggestions": campaign_suggestions,
        "detailed_results": results
    }


@router.get("/weather/forecast/{zip_code}")
async def get_solar_forecast(zip_code: str, days: int = 5):
    """
    Get solar production forecast for a ZIP code.
    Uses OpenWeatherMap 5-day forecast if configured.
    """
    # Use the weather service for forecast
    forecast_data = weather_service.get_forecast(zip_code, min(days, 5))
    
    if forecast_data.get("success") and forecast_data.get("source") == "live":
        # Use real forecast data
        forecast = []
        for day in forecast_data.get("forecast", []):
            # Calculate solar production estimate
            base_production = 5.5
            production_estimate = base_production * (day.get("solar_score", 50) / 100)
            
            forecast.append({
                "date": day.get("date"),
                "day_name": day.get("day_name"),
                "condition": day.get("condition"),
                "high_temp_f": day.get("max_temp_f"),
                "low_temp_f": day.get("min_temp_f"),
                "uv_index": day.get("uv_index"),
                "chance_of_rain": day.get("chance_of_rain", 0),
                "solar_irradiance": round(5.0 + day.get("uv_index", 7) * 0.3, 1),
                "estimated_production_kwh_per_kw": round(production_estimate, 1),
                "solar_score": day.get("solar_score", 50)
            })
        
        # Calculate weekly summary
        if forecast:
            avg_production = sum(f["estimated_production_kwh_per_kw"] for f in forecast) / len(forecast)
            best_day = max(forecast, key=lambda x: x["solar_score"])
            
            return {
                "zip_code": zip_code,
                "source": "live",
                "location": forecast_data.get("location", {}).get("name", zip_code),
                "current_weather": forecast_data.get("current", {}),
                "forecast": forecast,
                "summary": {
                    "average_daily_production_per_kw": round(avg_production, 1),
                    "best_production_day": best_day["day_name"],
                    "weekly_production_estimate_per_kw": round(avg_production * len(forecast), 1),
                    "solar_outlook": "excellent" if avg_production >= 5 else "good" if avg_production >= 4 else "moderate"
                },
                "sales_insight": f"This week looks great for solar! {best_day['day_name']} ({best_day['condition']}) will be the best production day."
            }
    
    # Fallback to mock data
    forecast = []
    for i in range(min(days, 7)):
        date = datetime.utcnow() + timedelta(days=i)
        weather = get_weather_for_zip(zip_code)
        
        # Estimate solar production
        base_production = 5.5  # kWh per kW of system per day
        condition_factor = WEATHER_TRIGGERS.get(weather["condition"].lower(), {"score": 50})["score"] / 100
        production_estimate = base_production * condition_factor
        
        forecast.append({
            "date": date.strftime("%Y-%m-%d"),
            "day_name": date.strftime("%A"),
            "condition": weather["condition"],
            "high_temp_f": weather["temperature_f"],
            "uv_index": weather["uv_index"],
            "solar_irradiance": weather["solar_irradiance_kwh_m2"],
            "estimated_production_kwh_per_kw": round(production_estimate, 1),
            "solar_score": WEATHER_TRIGGERS.get(weather["condition"].lower(), {"score": 50})["score"]
        })
    
    # Calculate weekly summary
    avg_production = sum(f["estimated_production_kwh_per_kw"] for f in forecast) / len(forecast)
    best_day = max(forecast, key=lambda x: x["solar_score"])
    
    return {
        "zip_code": zip_code,
        "source": "mock",
        "note": "Set OPENWEATHER_API_KEY in backend/.env for live weather data",
        "forecast": forecast,
        "summary": {
            "average_daily_production_per_kw": round(avg_production, 1),
            "best_production_day": best_day["day_name"],
            "weekly_production_estimate_per_kw": round(avg_production * 7, 1),
            "solar_outlook": "excellent" if avg_production >= 5 else "good" if avg_production >= 4 else "moderate"
        },
        "sales_insight": f"This week looks {best_day['condition'].lower()} for solar! Perfect time to schedule appointments."
    }


# ============== COMPETITOR PRICE INTEL ==============

# Known competitors (in production, maintain a real database)
KNOWN_COMPETITORS = {
    "sunrun": {"tier": "national", "typical_ppw": 3.50, "financing": "PPA/Lease focused"},
    "sunpower": {"tier": "premium", "typical_ppw": 4.00, "financing": "Loan/Cash"},
    "tesla": {"tier": "tech", "typical_ppw": 2.85, "financing": "Cash/Loan"},
    "vivint": {"tier": "national", "typical_ppw": 3.40, "financing": "PPA/Lease"},
    "freedom solar": {"tier": "regional", "typical_ppw": 3.20, "financing": "Loan"},
    "palmetto": {"tier": "national", "typical_ppw": 3.30, "financing": "Loan"},
    "momentum solar": {"tier": "regional", "typical_ppw": 3.45, "financing": "PPA/Lease"},
    "blue raven": {"tier": "national", "typical_ppw": 3.25, "financing": "Loan"},
    "local installer": {"tier": "local", "typical_ppw": 3.00, "financing": "Varies"},
}


@router.post("/competitors/report-quote")
async def report_competitor_quote(request: CompetitorQuoteRequest):
    """
    Report a competitor quote for intel tracking
    """
    # Calculate price per watt
    system_watts = request.system_size_kw * 1000
    price_per_watt = request.quote_amount / system_watts
    
    # Get competitor info
    competitor_key = request.competitor_name.lower()
    competitor_info = KNOWN_COMPETITORS.get(competitor_key, {"tier": "unknown", "typical_ppw": 3.25})
    
    # Determine if quote is above/below typical
    typical_ppw = competitor_info.get("typical_ppw", 3.25)
    price_comparison = "above" if price_per_watt > typical_ppw else "below" if price_per_watt < typical_ppw else "at"
    
    quote = {
        "id": str(uuid.uuid4()),
        "competitor_name": request.competitor_name,
        "competitor_tier": competitor_info.get("tier", "unknown"),
        "system_size_kw": request.system_size_kw,
        "quote_amount": request.quote_amount,
        "price_per_watt": round(price_per_watt, 2),
        "typical_price_per_watt": typical_ppw,
        "price_vs_typical": price_comparison,
        "zip_code": request.zip_code,
        "panel_brand": request.panel_brand,
        "inverter_brand": request.inverter_brand,
        "includes_battery": request.includes_battery,
        "battery_brand": request.battery_brand,
        "source": request.source,
        "notes": request.notes,
        "reported_at": datetime.utcnow()
    }
    
    await db.competitor_quotes.insert_one(quote)
    quote.pop("_id", None)
    quote["reported_at"] = quote["reported_at"].isoformat()
    
    # Generate counter-strategy
    strategies = []
    if price_per_watt > 3.50:
        strategies.append("Emphasize our competitive pricing - we can save them $3,000+")
    if competitor_info.get("financing") == "PPA/Lease focused":
        strategies.append("Highlight ownership benefits vs leasing - they'll own the system")
    if competitor_info.get("tier") == "national":
        strategies.append("Stress local service and faster response times")
    if request.includes_battery and price_per_watt > 4.00:
        strategies.append("Our battery pricing is more competitive - show the comparison")
    
    quote["counter_strategies"] = strategies
    
    return quote


@router.get("/competitors/quotes")
async def get_competitor_quotes(
    competitor: str = None,
    zip_code: str = None,
    limit: int = 50
):
    """
    Get reported competitor quotes with filtering
    """
    query = {}
    if competitor:
        query["competitor_name"] = {"$regex": competitor, "$options": "i"}
    if zip_code:
        query["zip_code"] = zip_code
    
    quotes = await db.competitor_quotes.find(query, {"_id": 0}).sort("reported_at", -1).limit(limit).to_list(limit)
    
    for q in quotes:
        if isinstance(q.get("reported_at"), datetime):
            q["reported_at"] = q["reported_at"].isoformat()
    
    return {"quotes": quotes, "total": len(quotes)}


@router.get("/competitors/analysis")
async def get_competitor_analysis():
    """
    Get comprehensive competitor pricing analysis
    """
    # Get all quotes from database
    quotes = await db.competitor_quotes.find({}, {"_id": 0}).to_list(500)
    
    # Analyze by competitor
    competitor_stats = {}
    for quote in quotes:
        name = quote.get("competitor_name", "Unknown").lower()
        if name not in competitor_stats:
            competitor_stats[name] = {
                "quotes_count": 0,
                "total_ppw": 0,
                "min_ppw": float("inf"),
                "max_ppw": 0,
                "quotes": []
            }
        
        ppw = quote.get("price_per_watt", 0)
        competitor_stats[name]["quotes_count"] += 1
        competitor_stats[name]["total_ppw"] += ppw
        competitor_stats[name]["min_ppw"] = min(competitor_stats[name]["min_ppw"], ppw)
        competitor_stats[name]["max_ppw"] = max(competitor_stats[name]["max_ppw"], ppw)
    
    # Calculate averages
    analysis = []
    for name, stats in competitor_stats.items():
        if stats["quotes_count"] > 0:
            avg_ppw = stats["total_ppw"] / stats["quotes_count"]
            known_info = KNOWN_COMPETITORS.get(name, {})
            
            analysis.append({
                "competitor": name.title(),
                "tier": known_info.get("tier", "unknown"),
                "quotes_reported": stats["quotes_count"],
                "average_ppw": round(avg_ppw, 2),
                "min_ppw": round(stats["min_ppw"], 2),
                "max_ppw": round(stats["max_ppw"], 2),
                "typical_ppw": known_info.get("typical_ppw"),
                "financing_model": known_info.get("financing", "Unknown")
            })
    
    # Add known competitors without quotes
    for name, info in KNOWN_COMPETITORS.items():
        if name not in competitor_stats:
            analysis.append({
                "competitor": name.title(),
                "tier": info["tier"],
                "quotes_reported": 0,
                "average_ppw": None,
                "typical_ppw": info["typical_ppw"],
                "financing_model": info["financing"]
            })
    
    # Sort by quotes reported
    analysis.sort(key=lambda x: x["quotes_reported"], reverse=True)
    
    # Market insights
    if quotes:
        all_ppw = [q["price_per_watt"] for q in quotes if q.get("price_per_watt")]
        market_avg = sum(all_ppw) / len(all_ppw) if all_ppw else 3.25
    else:
        market_avg = 3.25
    
    return {
        "competitors": analysis,
        "market_summary": {
            "total_quotes_tracked": len(quotes),
            "competitors_tracked": len(competitor_stats),
            "market_average_ppw": round(market_avg, 2),
            "your_competitive_range": f"${market_avg - 0.30:.2f} - ${market_avg + 0.20:.2f}/watt"
        },
        "pricing_intelligence": {
            "cheapest_competitor": min(KNOWN_COMPETITORS.items(), key=lambda x: x[1]["typical_ppw"])[0].title(),
            "premium_competitor": max(KNOWN_COMPETITORS.items(), key=lambda x: x[1]["typical_ppw"])[0].title(),
            "recommendation": "Price competitively between $2.85-$3.30/watt to win against most competitors"
        }
    }


@router.get("/competitors/beat-quote")
async def get_beat_quote_strategy(
    competitor: str,
    their_price: float,
    system_size_kw: float
):
    """
    Get strategies to beat a specific competitor quote
    """
    competitor_key = competitor.lower()
    competitor_info = KNOWN_COMPETITORS.get(competitor_key, {"tier": "unknown", "typical_ppw": 3.25, "financing": "Unknown"})
    
    their_ppw = their_price / (system_size_kw * 1000)
    
    # Calculate target price
    target_ppw = their_ppw * 0.95  # 5% lower
    target_price = target_ppw * system_size_kw * 1000
    
    strategies = []
    
    # Price-based strategies
    if their_ppw > 3.50:
        strategies.append({
            "type": "price",
            "strategy": "Price Undercut",
            "detail": f"Their ${their_ppw:.2f}/watt is above market. Offer ${target_ppw:.2f}/watt to save customer ${their_price - target_price:,.0f}",
            "impact": "high"
        })
    
    # Financing strategies
    if competitor_info.get("financing") == "PPA/Lease focused":
        strategies.append({
            "type": "financing",
            "strategy": "Ownership Advantage",
            "detail": f"{competitor.title()} typically pushes leases. Emphasize that ownership = equity + full tax credit + no escalators",
            "impact": "high"
        })
    
    # Service strategies
    if competitor_info.get("tier") == "national":
        strategies.append({
            "type": "service",
            "strategy": "Local Service Promise",
            "detail": f"Unlike {competitor.title()}, we're local. Faster response times, same-day service calls, you'll talk to real people",
            "impact": "medium"
        })
    
    # Equipment strategies
    strategies.append({
        "type": "equipment",
        "strategy": "Equipment Comparison",
        "detail": "Ask what panels/inverters they're using. We can often match or beat with premium Tier-1 equipment",
        "impact": "medium"
    })
    
    # Warranty strategies
    strategies.append({
        "type": "warranty",
        "strategy": "Warranty Comparison",
        "detail": "Compare warranties line by line. Many national installers have weaker workmanship warranties",
        "impact": "medium"
    })
    
    # Value-add strategies
    strategies.append({
        "type": "value_add",
        "strategy": "Bundle Benefits",
        "detail": "Offer free critter guard, system monitoring, annual check-up, or referral bonus to tip the scales",
        "impact": "medium"
    })
    
    return {
        "competitor": competitor.title(),
        "competitor_tier": competitor_info.get("tier"),
        "their_quote": {
            "total": their_price,
            "price_per_watt": round(their_ppw, 2),
            "system_size_kw": system_size_kw
        },
        "your_target": {
            "total": round(target_price, 0),
            "price_per_watt": round(target_ppw, 2),
            "savings_vs_them": round(their_price - target_price, 0)
        },
        "win_strategies": strategies,
        "closing_script": f"I can save you ${their_price - target_price:,.0f} compared to {competitor.title()}, PLUS you'll own the system outright and get the full 30% tax credit. When can we schedule your installation?"
    }
