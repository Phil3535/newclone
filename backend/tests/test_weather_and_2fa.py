"""
Test Weather API (OpenWeatherMap) and Two-Factor Authentication (2FA) Endpoints

Weather API Features:
- GET /api/intelligence/weather/status - Check weather service configuration
- GET /api/intelligence/weather/current/{location} - Get current weather
- GET /api/intelligence/weather/forecast/{zip_code} - Get weather forecast
- POST /api/intelligence/weather/check-triggers - Check weather-based outreach triggers

2FA Features:
- GET /api/auth/2fa/status - Get 2FA status (requires auth)
- POST /api/auth/2fa/setup/totp - Setup TOTP-based 2FA (requires auth)
- POST /api/auth/2fa/verify-setup - Verify and enable 2FA (requires auth)
- POST /api/auth/2fa/disable - Disable 2FA (requires auth)
- POST /api/auth/2fa/backup-codes/regenerate - Regenerate backup codes (requires auth)

Note: OPENWEATHER_API_KEY is not set, so weather endpoints return mock data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@solarempire.com"
ADMIN_PASSWORD = "SolarEmpire2024!"

class TestAdminLogin:
    """Test admin login endpoint for authentication"""
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Login should return success=True"
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL, "Email should match"
        assert "expires_at" in data, "Response should contain expiration"
        print(f"✅ Admin login successful - Role: {data['user']['role']}")
        
        return data["token"]
    
    def test_admin_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        print("✅ Invalid password correctly rejected")
    
    def test_admin_login_invalid_email(self):
        """Test login with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "testpass"}
        )
        assert response.status_code == 401, "Should return 401 for unknown email"
        print("✅ Invalid email correctly rejected")


class TestWeatherAPIStatus:
    """Test weather service status endpoint"""
    
    def test_weather_status_endpoint(self):
        """Check weather service status - should report mock mode since no API key"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/status")
        assert response.status_code == 200, f"Weather status failed: {response.text}"
        
        data = response.json()
        assert "service" in data, "Should report service name"
        assert data["service"] == "OpenWeatherMap", "Should use OpenWeatherMap"
        assert "mode" in data, "Should report mode"
        
        # Since OPENWEATHER_API_KEY is not set, should be in mock mode
        print(f"✅ Weather service status: {data['mode']} mode")
        print(f"   API Key Set: {data.get('api_key_set', False)}")
        print(f"   Configured: {data.get('configured', False)}")
        
        if data["mode"] == "mock":
            assert "setup_instructions" in data, "Mock mode should provide setup instructions"
            print("   ℹ️ Weather data is MOCKED - Set OPENWEATHER_API_KEY for live data")


class TestWeatherCurrentEndpoint:
    """Test current weather endpoint"""
    
    def test_weather_current_by_zip(self):
        """Get current weather for a ZIP code"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/current/90210")
        assert response.status_code == 200, f"Weather current failed: {response.text}"
        
        data = response.json()
        assert "weather" in data, "Should contain weather data"
        assert "source" in data, "Should indicate data source"
        assert "solar_score" in data, "Should calculate solar score"
        assert "solar_rating" in data, "Should provide solar rating"
        
        weather = data["weather"]
        assert "temperature_f" in weather, "Should contain temperature"
        assert "condition" in weather, "Should contain weather condition"
        
        print(f"✅ Current weather for 90210:")
        print(f"   Condition: {weather.get('condition')}")
        print(f"   Temperature: {weather.get('temperature_f')}°F")
        print(f"   Solar Score: {data['solar_score']}/100 ({data['solar_rating']})")
        print(f"   Source: {data['source']}")
    
    def test_weather_current_by_city(self):
        """Get current weather for a city name"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/current/Los Angeles")
        assert response.status_code == 200, f"Weather current by city failed: {response.text}"
        
        data = response.json()
        assert "weather" in data, "Should contain weather data"
        print(f"✅ Current weather for Los Angeles - Source: {data.get('source')}")
    
    def test_weather_current_by_coordinates(self):
        """Get current weather for coordinates"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/current/34.05,-118.24")
        assert response.status_code == 200, f"Weather current by coords failed: {response.text}"
        
        data = response.json()
        assert "weather" in data, "Should contain weather data"
        print(f"✅ Current weather for coordinates - Source: {data.get('source')}")


class TestWeatherForecastEndpoint:
    """Test weather forecast endpoint"""
    
    def test_weather_forecast_default_days(self):
        """Get weather forecast for a ZIP code (default 5 days)"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/forecast/90210")
        assert response.status_code == 200, f"Weather forecast failed: {response.text}"
        
        data = response.json()
        assert "forecast" in data, "Should contain forecast array"
        assert "source" in data, "Should indicate data source"
        assert "summary" in data, "Should contain summary"
        
        forecast = data["forecast"]
        assert len(forecast) > 0, "Should have at least one forecast day"
        
        # Verify forecast day structure
        day = forecast[0]
        assert "date" in day, "Day should have date"
        assert "condition" in day, "Day should have condition"
        assert "solar_score" in day or "estimated_production_kwh_per_kw" in day, "Day should have solar data"
        
        summary = data["summary"]
        assert "average_daily_production_per_kw" in summary, "Summary should have avg production"
        assert "solar_outlook" in summary, "Summary should have outlook"
        
        print(f"✅ Weather forecast for 90210:")
        print(f"   Days: {len(forecast)}")
        print(f"   Solar Outlook: {summary['solar_outlook']}")
        print(f"   Source: {data['source']}")
    
    def test_weather_forecast_custom_days(self):
        """Get weather forecast with custom number of days"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/forecast/85001?days=3")
        assert response.status_code == 200, f"Weather forecast custom days failed: {response.text}"
        
        data = response.json()
        assert "forecast" in data, "Should contain forecast array"
        # Forecast can be up to requested days
        assert len(data["forecast"]) <= 5, "Should respect max days limit"
        print(f"✅ Weather forecast for Phoenix (85001) with 3 days - Got {len(data['forecast'])} days")


class TestWeatherTriggers:
    """Test weather-based outreach triggers endpoint"""
    
    def test_weather_check_triggers_single_zip(self):
        """Check weather triggers for a single ZIP code"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/weather/check-triggers",
            json={
                "zip_codes": ["90210"],
                "trigger_temp_f": 85,
                "trigger_conditions": ["sunny", "clear", "hot"]
            }
        )
        assert response.status_code == 200, f"Weather triggers failed: {response.text}"
        
        data = response.json()
        assert "checked_at" in data, "Should have timestamp"
        assert "zip_codes_checked" in data, "Should report ZIPs checked"
        assert "triggers_found" in data, "Should report triggers count"
        assert "detailed_results" in data, "Should have detailed results"
        
        print(f"✅ Weather triggers check:")
        print(f"   ZIPs checked: {data['zip_codes_checked']}")
        print(f"   Triggers found: {data['triggers_found']}")
        
        if data["triggered_areas"]:
            print(f"   Triggered areas: {len(data['triggered_areas'])}")
    
    def test_weather_check_triggers_multiple_zips(self):
        """Check weather triggers for multiple ZIP codes"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/weather/check-triggers",
            json={
                "zip_codes": ["90210", "85001", "77001", "33101", "10001"],
                "trigger_temp_f": 80,
                "trigger_conditions": ["sunny", "clear", "hot", "warm"]
            }
        )
        assert response.status_code == 200, f"Weather triggers multi-zip failed: {response.text}"
        
        data = response.json()
        assert data["zip_codes_checked"] == 5, "Should check all 5 ZIPs"
        assert "campaign_suggestions" in data, "Should provide campaign suggestions"
        
        print(f"✅ Multi-ZIP weather triggers:")
        print(f"   ZIPs checked: {data['zip_codes_checked']}")
        print(f"   Triggers: {data['triggers_found']}")
        print(f"   Campaign suggestions: {len(data.get('campaign_suggestions', []))}")


class Test2FAStatus:
    """Test 2FA status endpoint - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate for 2FA tests")
    
    def test_2fa_status_authenticated(self):
        """Get 2FA status for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/2fa/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"2FA status failed: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Should report if 2FA is enabled"
        
        print(f"✅ 2FA Status:")
        print(f"   Enabled: {data.get('enabled')}")
        print(f"   Method: {data.get('method', 'N/A')}")
        print(f"   Backup codes remaining: {data.get('backup_codes_remaining', 0)}")
    
    def test_2fa_status_unauthorized(self):
        """Test 2FA status without auth - should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/2fa/status")
        assert response.status_code == 401, "Should require authentication"
        print("✅ 2FA status correctly requires authentication")


class Test2FASetup:
    """Test 2FA TOTP setup endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate for 2FA tests")
    
    def test_2fa_setup_totp(self):
        """Setup TOTP-based 2FA"""
        # First check current status
        status_response = requests.get(
            f"{BASE_URL}/api/auth/2fa/status",
            headers=self.headers
        )
        status = status_response.json()
        
        # If 2FA is already enabled, skip setup test
        if status.get("enabled"):
            print("⚠️ 2FA already enabled for this user - skipping setup test")
            pytest.skip("2FA already enabled")
            return
        
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/setup/totp",
            headers=self.headers
        )
        assert response.status_code == 200, f"2FA setup failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Setup should succeed"
        assert "qr_code" in data, "Should provide QR code"
        assert "secret" in data, "Should provide manual entry secret"
        assert "backup_codes" in data, "Should provide backup codes"
        
        # Verify QR code is base64 PNG
        assert data["qr_code"].startswith("data:image/png;base64,"), "QR should be base64 PNG"
        
        # Verify backup codes
        assert len(data["backup_codes"]) == 10, "Should provide 10 backup codes"
        
        print(f"✅ 2FA TOTP Setup successful:")
        print(f"   Secret length: {len(data['secret'])} chars")
        print(f"   Backup codes: {len(data['backup_codes'])}")
        print(f"   QR code provided: Yes")
    
    def test_2fa_setup_unauthorized(self):
        """Test 2FA setup without auth - should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/2fa/setup/totp")
        assert response.status_code == 401, "Should require authentication"
        print("✅ 2FA setup correctly requires authentication")


class Test2FAVerifySetup:
    """Test 2FA verification of setup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate for 2FA tests")
    
    def test_2fa_verify_setup_invalid_code(self):
        """Test verify setup with invalid code"""
        # First check if there's a pending setup
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/verify-setup",
            json={"code": "000000"},
            headers=self.headers
        )
        # Should fail - either no pending setup or invalid code
        assert response.status_code in [400, 401], f"Should reject invalid code: {response.text}"
        print("✅ 2FA verify correctly rejects invalid code")


class Test2FADisable:
    """Test 2FA disable endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate for 2FA tests")
    
    def test_2fa_disable_when_not_enabled(self):
        """Test disabling 2FA when it's not enabled"""
        # Check status first
        status_response = requests.get(
            f"{BASE_URL}/api/auth/2fa/status",
            headers=self.headers
        )
        status = status_response.json()
        
        if status.get("enabled"):
            print("⚠️ 2FA is enabled - skipping disable test to preserve settings")
            pytest.skip("2FA is enabled")
            return
        
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/disable",
            headers=self.headers
        )
        # Should fail since 2FA is not enabled
        assert response.status_code == 400, f"Should fail when 2FA not enabled: {response.text}"
        print("✅ 2FA disable correctly fails when not enabled")
    
    def test_2fa_disable_unauthorized(self):
        """Test 2FA disable without auth - should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/2fa/disable")
        assert response.status_code == 401, "Should require authentication"
        print("✅ 2FA disable correctly requires authentication")


class Test2FABackupCodes:
    """Test 2FA backup codes regeneration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate for 2FA tests")
    
    def test_backup_codes_regenerate_when_not_enabled(self):
        """Test regenerating backup codes when 2FA not enabled"""
        # Check status first
        status_response = requests.get(
            f"{BASE_URL}/api/auth/2fa/status",
            headers=self.headers
        )
        status = status_response.json()
        
        if status.get("enabled"):
            print("⚠️ 2FA is enabled - skipping backup codes test")
            pytest.skip("2FA is enabled")
            return
        
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/backup-codes/regenerate",
            json={"code": "123456"},
            headers=self.headers
        )
        # Should fail since 2FA is not enabled
        assert response.status_code == 400, f"Should fail when 2FA not enabled: {response.text}"
        print("✅ Backup codes regeneration correctly fails when 2FA not enabled")
    
    def test_backup_codes_regenerate_unauthorized(self):
        """Test backup codes regeneration without auth - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/backup-codes/regenerate",
            json={"code": "123456"}
        )
        assert response.status_code == 401, "Should require authentication"
        print("✅ Backup codes regeneration correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
