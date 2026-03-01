"""
Real Weather API Integration
Uses OpenWeatherMap for live weather data to power weather-based outreach campaigns.
Features: Current weather, forecast, UV index, cloud coverage - perfect for solar sales.
"""

import os
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# OpenWeatherMap configuration
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')
OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5"
OPENWEATHER_GEO = "http://api.openweathermap.org/geo/1.0"

class WeatherService:
    """Service for fetching real weather data from OpenWeatherMap API"""
    
    def __init__(self):
        self.api_key = OPENWEATHER_API_KEY
        self.base_url = OPENWEATHER_BASE
        self.geo_url = OPENWEATHER_GEO
        self.use_mock = not bool(self.api_key)
        
        if self.use_mock:
            logger.warning("OPENWEATHER_API_KEY not set - using mock weather data")
    
    def _geocode_location(self, location: str) -> Optional[Dict]:
        """Convert location (ZIP, city, coords) to lat/lon using OpenWeatherMap Geocoding API"""
        try:
            # Check if it's coordinates (lat,lon format)
            if ',' in location and all(p.replace('.', '').replace('-', '').isdigit() for p in location.split(',')):
                parts = location.split(',')
                return {"lat": float(parts[0]), "lon": float(parts[1]), "name": location}
            
            # Check if it's a ZIP code (5 digits)
            if location.isdigit() and len(location) == 5:
                url = f"{self.geo_url}/zip"
                params = {"zip": f"{location},US", "appid": self.api_key}
            else:
                # City name search
                url = f"{self.geo_url}/direct"
                params = {"q": location, "limit": 1, "appid": self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                return {"lat": data[0]["lat"], "lon": data[0]["lon"], "name": data[0].get("name", location)}
            elif isinstance(data, dict) and "lat" in data:
                return {"lat": data["lat"], "lon": data["lon"], "name": data.get("name", location)}
            
            return None
        except Exception as e:
            logger.error(f"Geocoding error for {location}: {e}")
            return None

    def get_current_weather(self, location: str) -> Dict[str, Any]:
        """
        Get current weather for a location (city name, ZIP code, or lat,lon).
        
        Args:
            location: City name, ZIP code (e.g., "90210"), or coordinates ("34.05,-118.24")
        
        Returns:
            Weather data dictionary
        """
        if self.use_mock:
            return self._get_mock_weather(location)
        
        try:
            # First geocode the location
            geo = self._geocode_location(location)
            if not geo:
                logger.warning(f"Could not geocode location: {location}")
                return self._get_mock_weather(location, error="Could not geocode location")
            
            # Get current weather
            url = f"{self.base_url}/weather"
            params = {
                "lat": geo["lat"],
                "lon": geo["lon"],
                "appid": self.api_key,
                "units": "imperial"  # Fahrenheit
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Get UV index from UV API (separate call)
            uv_index = self._get_uv_index(geo["lat"], geo["lon"])
            
            # Map OpenWeatherMap conditions to our format
            condition = data["weather"][0]["main"]
            description = data["weather"][0]["description"].title()
            
            return {
                "success": True,
                "source": "live",
                "location": {
                    "name": geo.get("name", location),
                    "region": data.get("sys", {}).get("country", "US"),
                    "country": data.get("sys", {}).get("country", "US"),
                    "lat": geo["lat"],
                    "lon": geo["lon"],
                    "localtime": datetime.now().strftime("%Y-%m-%d %H:%M")
                },
                "weather": {
                    "condition": description,
                    "condition_code": condition,
                    "condition_icon": f"https://openweathermap.org/img/wn/{data['weather'][0]['icon']}@2x.png",
                    "temperature_f": round(data["main"]["temp"], 1),
                    "temperature_c": round((data["main"]["temp"] - 32) * 5/9, 1),
                    "feels_like_f": round(data["main"]["feels_like"], 1),
                    "humidity_percent": data["main"]["humidity"],
                    "wind_mph": round(data["wind"]["speed"], 1),
                    "wind_direction": self._degrees_to_direction(data["wind"].get("deg", 0)),
                    "uv_index": uv_index,
                    "cloud_cover": data["clouds"]["all"],
                    "visibility_miles": round(data.get("visibility", 10000) / 1609.34, 1),
                    "pressure_mb": data["main"]["pressure"]
                },
                "sunrise": datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%I:%M %p"),
                "sunset": datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%I:%M %p"),
                "last_updated": datetime.now().isoformat()
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Weather API error for {location}: {e}")
            return self._get_mock_weather(location, error=str(e))
    
    def _get_uv_index(self, lat: float, lon: float) -> float:
        """Get UV index for coordinates (uses One Call API or estimate)"""
        try:
            # Try One Call API 3.0 if available
            url = "https://api.openweathermap.org/data/3.0/onecall"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "exclude": "minutely,hourly,daily,alerts"
            }
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get("current", {}).get("uvi", 5)
        except Exception:
            pass
        
        # Estimate UV based on time of day and typical values
        hour = datetime.now().hour
        if 10 <= hour <= 14:
            return 8  # Peak UV hours
        elif 8 <= hour <= 16:
            return 6
        else:
            return 2
    
    def _degrees_to_direction(self, degrees: float) -> str:
        """Convert wind degrees to cardinal direction"""
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        idx = round(degrees / 22.5) % 16
        return directions[idx]
    
    def get_forecast(self, location: str, days: int = 5) -> Dict[str, Any]:
        """
        Get weather forecast for a location using OpenWeatherMap 5-day forecast.
        
        Args:
            location: City name, ZIP code, or coordinates
            days: Number of forecast days (max 5 in free tier)
        
        Returns:
            Forecast data dictionary
        """
        if self.use_mock:
            return self._get_mock_forecast(location, days)
        
        try:
            # First geocode the location
            geo = self._geocode_location(location)
            if not geo:
                return self._get_mock_forecast(location, days, error="Could not geocode location")
            
            # Get 5-day forecast (3-hour intervals)
            url = f"{self.base_url}/forecast"
            params = {
                "lat": geo["lat"],
                "lon": geo["lon"],
                "appid": self.api_key,
                "units": "imperial",
                "cnt": min(days * 8, 40)  # 8 forecasts per day, max 40
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Group by day and get daily summaries
            daily_data = {}
            for item in data["list"]:
                date = item["dt_txt"].split(" ")[0]
                if date not in daily_data:
                    daily_data[date] = {
                        "temps": [],
                        "conditions": [],
                        "humidity": [],
                        "wind": [],
                        "rain_chance": 0
                    }
                daily_data[date]["temps"].append(item["main"]["temp"])
                daily_data[date]["conditions"].append(item["weather"][0]["main"])
                daily_data[date]["humidity"].append(item["main"]["humidity"])
                daily_data[date]["wind"].append(item["wind"]["speed"])
                if item.get("pop", 0) > daily_data[date]["rain_chance"]:
                    daily_data[date]["rain_chance"] = item.get("pop", 0) * 100
            
            forecast_days = []
            for date, day_info in list(daily_data.items())[:days]:
                # Get most common condition
                condition = max(set(day_info["conditions"]), key=day_info["conditions"].count)
                
                # Estimate UV based on conditions
                uv_estimate = 8 if condition in ["Clear", "Sunny"] else 5 if condition == "Clouds" else 3
                
                forecast_days.append({
                    "date": date,
                    "day_name": datetime.strptime(date, "%Y-%m-%d").strftime("%A"),
                    "max_temp_f": round(max(day_info["temps"]), 1),
                    "min_temp_f": round(min(day_info["temps"]), 1),
                    "avg_temp_f": round(sum(day_info["temps"]) / len(day_info["temps"]), 1),
                    "condition": condition,
                    "condition_description": self._get_condition_description(condition),
                    "max_wind_mph": round(max(day_info["wind"]), 1),
                    "avg_humidity": round(sum(day_info["humidity"]) / len(day_info["humidity"])),
                    "uv_index": uv_estimate,
                    "chance_of_rain": round(day_info["rain_chance"]),
                    "solar_score": self._calculate_forecast_solar_score(condition, uv_estimate, day_info["rain_chance"])
                })
            
            # Get current weather too
            current = self.get_current_weather(location)
            
            return {
                "success": True,
                "source": "live",
                "location": {
                    "name": geo.get("name", location),
                    "region": data.get("city", {}).get("country", "US")
                },
                "current": current.get("weather", {}),
                "forecast": forecast_days,
                "alerts": []  # Free tier doesn't include alerts
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Forecast API error for {location}: {e}")
            return self._get_mock_forecast(location, days, error=str(e))
    
    def _get_condition_description(self, condition: str) -> str:
        """Get human-readable condition description"""
        descriptions = {
            "Clear": "Clear skies",
            "Clouds": "Cloudy",
            "Rain": "Rainy",
            "Drizzle": "Light rain",
            "Thunderstorm": "Stormy",
            "Snow": "Snowy",
            "Mist": "Misty",
            "Fog": "Foggy",
            "Haze": "Hazy",
            "Smoke": "Smoky"
        }
        return descriptions.get(condition, condition)
    
    def _calculate_forecast_solar_score(self, condition: str, uv: float, rain_chance: float) -> int:
        """Calculate solar score for forecast day"""
        score = 50
        
        if condition in ["Clear", "Sunny"]:
            score += 30
        elif condition == "Clouds":
            score -= 10
        elif condition in ["Rain", "Drizzle", "Thunderstorm"]:
            score -= 30
        
        score += min(uv * 2, 20)
        score -= int(rain_chance * 0.2)
        
        return max(0, min(100, score))
    
    def check_solar_conditions(self, zip_codes: List[str]) -> Dict[str, Any]:
        """
        Check weather conditions for solar sales outreach across multiple ZIP codes.
        
        Args:
            zip_codes: List of ZIP codes to check
        
        Returns:
            Solar conditions analysis with campaign triggers
        """
        results = []
        triggers = []
        
        for zip_code in zip_codes[:10]:  # Limit to 10 to avoid rate limits
            weather = self.get_current_weather(zip_code)
            
            if not weather.get("success"):
                continue
            
            w = weather.get("weather", {})
            
            # Calculate solar score (0-100)
            solar_score = self._calculate_solar_score(w)
            
            # Check for trigger conditions
            condition_lower = w.get("condition", "").lower()
            temp = w.get("temperature_f", 70)
            uv = w.get("uv_index", 5)
            
            should_outreach = False
            trigger_reasons = []
            
            # Hot day trigger
            if temp >= 85:
                should_outreach = True
                trigger_reasons.append(f"Hot day ({temp}°F) - perfect for solar savings pitch")
            
            # Sunny conditions trigger
            if any(x in condition_lower for x in ['sunny', 'clear']):
                should_outreach = True
                trigger_reasons.append("Sunny conditions - ideal for demonstrating solar potential")
            
            # High UV trigger
            if uv >= 7:
                should_outreach = True
                trigger_reasons.append(f"High UV index ({uv}) - strong solar production day")
            
            # High electricity bill weather (very hot or cold)
            if temp >= 95 or temp <= 35:
                should_outreach = True
                trigger_reasons.append(f"Extreme temp ({temp}°F) - high energy bills, solar saves money")
            
            result = {
                "zip_code": zip_code,
                "location": weather.get("location", {}).get("name", zip_code),
                "weather": w,
                "solar_score": solar_score,
                "should_outreach": should_outreach,
                "trigger_reasons": trigger_reasons,
                "suggested_message": self._generate_outreach_message(w, trigger_reasons)
            }
            
            results.append(result)
            
            if should_outreach:
                triggers.append({
                    "zip_code": zip_code,
                    "location": weather.get("location", {}).get("name", zip_code),
                    "reason": trigger_reasons[0] if trigger_reasons else "Good solar conditions",
                    "message": result["suggested_message"],
                    "solar_score": solar_score
                })
        
        # Generate campaign suggestions
        campaign_suggestions = self._generate_campaign_suggestions(triggers)
        
        return {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "source": "live" if not self.use_mock else "mock",
            "zip_codes_checked": len(results),
            "triggers_found": len(triggers),
            "triggered_areas": triggers,
            "campaign_suggestions": campaign_suggestions,
            "detailed_results": results
        }
    
    def _calculate_solar_score(self, weather: Dict) -> int:
        """Calculate a solar production score from 0-100 based on weather conditions."""
        score = 50  # Base score
        
        condition = weather.get("condition", "").lower()
        
        # Condition modifiers
        if "sunny" in condition or "clear" in condition:
            score += 30
        elif "partly" in condition:
            score += 15
        elif "cloudy" in condition or "overcast" in condition:
            score -= 15
        elif "rain" in condition or "storm" in condition:
            score -= 30
        
        # UV index modifier
        uv = weather.get("uv_index", 5)
        score += min(uv * 2, 20)
        
        # Cloud cover modifier
        cloud = weather.get("cloud_cover", 50)
        score -= int(cloud * 0.2)
        
        return max(0, min(100, score))
    
    def _generate_outreach_message(self, weather: Dict, reasons: List[str]) -> str:
        """Generate a personalized outreach message based on weather."""
        temp = weather.get("temperature_f", 75)
        condition = weather.get("condition", "nice")
        
        if temp >= 95:
            return f"With today's {temp}°F heat, your AC is working overtime. Solar can cut those bills by 50-70%!"
        elif temp >= 85:
            return f"It's a hot {temp}°F today! Perfect weather for solar panels to generate maximum power."
        elif "sunny" in condition.lower():
            return "Beautiful sunny day! Your roof could be generating free electricity right now."
        elif temp <= 35:
            return f"Cold {temp}°F weather means high heating bills. Solar + battery can keep costs low all winter."
        else:
            return "Great conditions for a free solar assessment. Let's see how much you could save!"
    
    def _generate_campaign_suggestions(self, triggers: List[Dict]) -> List[Dict]:
        """Generate email/SMS campaign suggestions based on triggers."""
        if not triggers:
            return []
        
        campaigns = []
        
        # Group by trigger type
        hot_weather = [t for t in triggers if "hot" in t.get("reason", "").lower()]
        sunny_weather = [t for t in triggers if "sunny" in t.get("reason", "").lower()]
        high_uv = [t for t in triggers if "uv" in t.get("reason", "").lower()]
        extreme = [t for t in triggers if "extreme" in t.get("reason", "").lower()]
        
        if hot_weather:
            campaigns.append({
                "campaign_type": "hot_weather_blast",
                "subject_line": "🌡️ Beat the Heat - Your Solar Savings Await",
                "target_zips": [t["zip_code"] for t in hot_weather],
                "urgency": "high",
                "best_send_time": "10 AM - 2 PM (peak heat)",
                "estimated_open_rate": "25-35%"
            })
        
        if sunny_weather:
            campaigns.append({
                "campaign_type": "sunny_day_opportunity",
                "subject_line": "☀️ Perfect Solar Day - Free Assessment Today",
                "target_zips": [t["zip_code"] for t in sunny_weather],
                "urgency": "medium",
                "best_send_time": "8 AM - 10 AM",
                "estimated_open_rate": "20-28%"
            })
        
        if high_uv:
            campaigns.append({
                "campaign_type": "high_production_alert",
                "subject_line": "📊 High Solar Production Day - See Your Potential",
                "target_zips": [t["zip_code"] for t in high_uv],
                "urgency": "medium",
                "best_send_time": "Morning",
                "estimated_open_rate": "18-25%"
            })
        
        if extreme:
            campaigns.append({
                "campaign_type": "energy_bill_relief",
                "subject_line": "💰 Extreme Weather = High Bills. We Can Help.",
                "target_zips": [t["zip_code"] for t in extreme],
                "urgency": "high",
                "best_send_time": "Evening (after bill shock)",
                "estimated_open_rate": "30-40%"
            })
        
        return campaigns
    
    def _get_mock_weather(self, location: str, error: str = None) -> Dict[str, Any]:
        """Return mock weather data when API is not available."""
        import random
        
        conditions = ["Sunny", "Partly cloudy", "Clear", "Hot", "Warm and sunny"]
        
        return {
            "success": True,
            "source": "mock",
            "note": error or "Using mock data - set WEATHER_API_KEY for live data",
            "location": {
                "name": location,
                "region": "California",
                "country": "USA",
                "lat": 34.05,
                "lon": -118.24,
                "localtime": datetime.now().strftime("%Y-%m-%d %H:%M")
            },
            "weather": {
                "condition": random.choice(conditions),
                "temperature_f": random.randint(75, 100),
                "temperature_c": random.randint(24, 38),
                "feels_like_f": random.randint(78, 105),
                "humidity_percent": random.randint(20, 60),
                "wind_mph": random.randint(5, 15),
                "wind_direction": "W",
                "uv_index": random.randint(6, 11),
                "cloud_cover": random.randint(0, 30),
                "visibility_miles": 10,
                "pressure_mb": 1015
            },
            "last_updated": datetime.now().isoformat()
        }
    
    def _get_mock_forecast(self, location: str, days: int, error: str = None) -> Dict[str, Any]:
        """Return mock forecast data."""
        import random
        from datetime import timedelta
        
        forecast_days = []
        base_date = datetime.now()
        
        for i in range(days):
            date = base_date + timedelta(days=i)
            forecast_days.append({
                "date": date.strftime("%Y-%m-%d"),
                "max_temp_f": random.randint(80, 100),
                "min_temp_f": random.randint(60, 75),
                "avg_temp_f": random.randint(70, 85),
                "condition": random.choice(["Sunny", "Partly cloudy", "Clear"]),
                "max_wind_mph": random.randint(5, 20),
                "total_precip_in": 0,
                "avg_humidity": random.randint(30, 50),
                "uv_index": random.randint(7, 11),
                "chance_of_rain": random.randint(0, 20),
                "sunrise": "6:15 AM",
                "sunset": "7:45 PM",
                "moon_phase": "Waxing Gibbous"
            })
        
        return {
            "success": True,
            "source": "mock",
            "note": error or "Using mock data - set WEATHER_API_KEY for live data",
            "location": {"name": location, "region": "California"},
            "forecast": forecast_days,
            "alerts": []
        }


# Global instance
weather_service = WeatherService()
