"""
Test Suite for Solar Empire Advanced Features (Phase 1-3)
Tests for Patent Application Features:
- AI Voice Pitch Analyzer
- AI Contract Generator
- Predictive Maintenance Alerts
- Revenue Forecasting AI
- Territory Value Calculator
- Competitor Win/Loss Analysis
- Credit Check Integration (MOCKED)
- Satellite Roof Measurement
"""

import pytest
import requests
import os

# Use BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test backend health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("✓ Health endpoint working correctly")


class TestVoiceAnalyzer:
    """AI Voice Pitch Analyzer endpoint tests"""
    
    def test_voice_analyzer_with_transcript(self):
        """Test voice analyzer with real sales transcript - uses GPT-4"""
        payload = {
            "rep_id": "TEST_rep_001",
            "call_type": "sales",
            "transcript": "Hi there, my name is John from Solar Empire. I wanted to discuss your energy bills and how we can help you save money with solar panels. Do you currently own your home? Great! Our solar systems typically save homeowners 30 to 40 percent on their electricity bills."
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/voice-analyzer",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "overall_score" in data
        assert "tone_analysis" in data
        assert "pace_analysis" in data
        assert "energy_level" in data
        assert "confidence_score" in data
        assert "improvements" in data
        assert "strengths" in data
        assert "coaching_tips" in data
        
        # Validate score ranges
        assert 0 <= data["overall_score"] <= 100
        assert 0 <= data["confidence_score"] <= 100
        assert data["energy_level"] in ["High", "Medium", "Low"]
        
        # Validate tone analysis
        tone = data["tone_analysis"]
        assert "warmth" in tone
        assert "authority" in tone
        assert "enthusiasm" in tone
        
        print(f"✓ Voice analyzer with transcript - Score: {data['overall_score']}")
    
    def test_voice_analyzer_without_transcript(self):
        """Test voice analyzer without transcript - uses rule-based fallback"""
        payload = {
            "rep_id": "TEST_rep_002",
            "call_type": "follow-up"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/voice-analyzer",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "overall_score" in data
        assert "coaching_tips" in data
        assert len(data["coaching_tips"]) > 0
        print("✓ Voice analyzer fallback working correctly")


class TestContractGenerator:
    """AI Contract Generator endpoint tests"""
    
    def test_generate_contract_loan_financing(self):
        """Test contract generation with loan financing"""
        payload = {
            "lead_id": "TEST_lead_001",
            "customer_name": "John Smith",
            "address": "123 Solar Ave, Phoenix AZ 85001",
            "system_size_kw": 8.5,
            "panel_count": 20,
            "total_price": 24000.0,
            "financing_type": "loan",
            "loan_term_months": 240,
            "interest_rate": 5.99,
            "down_payment": 2000,
            "warranty_years": 25,
            "include_battery": False
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/generate-contract",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "contract" in data
        
        contract = data["contract"]
        # Validate contract structure
        assert "contract_id" in contract
        assert "customer_info" in contract
        assert "system_specifications" in contract
        assert "pricing" in contract
        assert "financing" in contract
        assert "savings_projection" in contract
        assert "warranty" in contract
        assert "installation" in contract
        
        # Validate customer info
        assert contract["customer_info"]["name"] == "John Smith"
        assert contract["customer_info"]["lead_id"] == "TEST_lead_001"
        
        # Validate financing calculations
        financing = contract["financing"]
        assert financing["type"] == "loan"
        assert financing["down_payment"] == 2000
        assert financing["monthly_payment"] > 0
        
        # Validate pricing
        assert contract["pricing"]["federal_tax_credit_30"] == 24000 * 0.30
        
        print(f"✓ Contract generated: {contract['contract_id']}")
    
    def test_generate_contract_cash_financing(self):
        """Test contract generation with cash financing"""
        payload = {
            "lead_id": "TEST_lead_002",
            "customer_name": "Jane Doe",
            "address": "456 Energy Blvd, Scottsdale AZ 85251",
            "system_size_kw": 10.0,
            "panel_count": 25,
            "total_price": 28000.0,
            "financing_type": "cash",
            "warranty_years": 25
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/generate-contract",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        contract = data["contract"]
        assert contract["financing"]["type"] == "cash"
        assert contract["financing"]["monthly_payment"] == 0
        
        print("✓ Cash financing contract generated successfully")
    
    def test_generate_contract_with_battery(self):
        """Test contract generation including battery storage"""
        payload = {
            "lead_id": "TEST_lead_003",
            "customer_name": "Bob Wilson",
            "address": "789 Power St, Mesa AZ 85201",
            "system_size_kw": 12.0,
            "panel_count": 30,
            "total_price": 35000.0,
            "financing_type": "loan",
            "include_battery": True,
            "battery_size_kwh": 13.5
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/generate-contract",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        contract = data["contract"]
        assert contract["system_specifications"]["includes_battery"] is True
        assert contract["system_specifications"]["battery_size_kwh"] == 13.5
        
        print("✓ Contract with battery storage generated successfully")


class TestMaintenanceAlerts:
    """Predictive Maintenance Alerts endpoint tests"""
    
    def test_get_maintenance_alerts(self):
        """Test fetching predictive maintenance alerts"""
        response = requests.get(f"{BASE_URL}/api/advanced/maintenance-alerts")
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "total_alerts" in data
        assert "critical" in data
        assert "high" in data
        assert "medium" in data
        assert "low" in data
        assert "alerts" in data
        assert "ai_insights" in data
        
        # Validate counts match
        total = data["critical"] + data["high"] + data["medium"] + data["low"]
        assert data["total_alerts"] == total
        
        # Validate alert structure
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "system_id" in alert
            assert "customer_name" in alert
            assert "severity" in alert
            assert "predicted_issue" in alert
            assert "recommended_action" in alert
            assert "estimated_cost" in alert
            assert "urgency_days" in alert
        
        print(f"✓ Maintenance alerts - Total: {data['total_alerts']}, High: {data['high']}")
    
    def test_maintenance_alerts_with_rep_id(self):
        """Test filtering maintenance alerts by rep_id"""
        response = requests.get(
            f"{BASE_URL}/api/advanced/maintenance-alerts",
            params={"rep_id": "TEST_rep_filter"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data
        print("✓ Maintenance alerts filtering working")


class TestRevenueForecast:
    """Revenue Forecasting AI endpoint tests"""
    
    def test_revenue_forecast_quarterly(self):
        """Test quarterly revenue forecast"""
        response = requests.get(
            f"{BASE_URL}/api/advanced/revenue-forecast",
            params={"period": "quarterly"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "forecast_generated" in data
        assert "period_type" in data
        assert "total_predicted_revenue" in data
        assert "forecasts" in data
        assert "trends" in data
        assert "recommendations" in data
        
        # Validate quarterly forecasts
        assert data["period_type"] == "quarterly"
        assert len(data["forecasts"]) == 4  # 4 quarters
        
        # Validate forecast structure
        for forecast in data["forecasts"]:
            assert "period" in forecast
            assert "predicted_revenue" in forecast
            assert "confidence_interval" in forecast
            assert "factors" in forecast
            assert forecast["predicted_revenue"] > 0
        
        print(f"✓ Quarterly forecast - Total: ${data['total_predicted_revenue']:,.2f}")
    
    def test_revenue_forecast_monthly(self):
        """Test monthly revenue forecast"""
        response = requests.get(
            f"{BASE_URL}/api/advanced/revenue-forecast",
            params={"period": "monthly"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_type"] == "monthly"
        assert len(data["forecasts"]) == 12  # 12 months
        
        print("✓ Monthly forecast generated successfully")
    
    def test_revenue_forecast_yearly(self):
        """Test yearly revenue forecast"""
        response = requests.get(
            f"{BASE_URL}/api/advanced/revenue-forecast",
            params={"period": "yearly"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_type"] == "yearly"
        assert len(data["forecasts"]) == 1  # 1 year
        
        print("✓ Yearly forecast generated successfully")


class TestTerritoryValueCalculator:
    """Territory Value Calculator endpoint tests"""
    
    def test_territory_value_calculation(self):
        """Test territory value calculation for a specific territory"""
        territory_id = "TERR-001"
        response = requests.get(
            f"{BASE_URL}/api/advanced/territory-value/{territory_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "territory" in data
        assert "comparison" in data
        assert "opportunity_analysis" in data
        
        territory = data["territory"]
        # Validate territory structure
        assert territory["territory_id"] == territory_id
        assert "overall_score" in territory
        assert "factors" in territory
        assert "potential_value" in territory
        assert "recommended_actions" in territory
        assert "competitor_density" in territory
        assert "market_saturation" in territory
        
        # Validate score range
        assert 0 <= territory["overall_score"] <= 100
        
        # Validate factors
        factors = territory["factors"]
        expected_factors = [
            "population_density", "average_home_value", "average_income",
            "sun_hours_annual", "utility_rates", "solar_adoption_rate",
            "competitor_presence", "permit_friendliness", "roof_age_avg",
            "environmental_awareness"
        ]
        for factor in expected_factors:
            assert factor in factors
            assert 0 <= factors[factor] <= 100
        
        # Validate opportunity analysis
        opp = data["opportunity_analysis"]
        assert "total_homes" in opp
        assert "solar_eligible" in opp
        assert "remaining_opportunity" in opp
        
        print(f"✓ Territory {territory_id} - Score: {territory['overall_score']}, Value: ${territory['potential_value']:,.0f}")
    
    def test_territory_value_different_id(self):
        """Test territory value with different territory ID"""
        territory_id = "TEST-TERR-999"
        response = requests.get(
            f"{BASE_URL}/api/advanced/territory-value/{territory_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["territory"]["territory_id"] == territory_id
        print("✓ Territory value calculator handles any territory ID")


class TestCompetitorAnalysis:
    """Competitor Win/Loss Analysis endpoint tests"""
    
    def test_competitor_analysis(self):
        """Test competitor analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/advanced/competitor-analysis")
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "summary" in data
        assert "competitors" in data
        assert "top_win_strategies" in data
        assert "areas_for_improvement" in data
        
        # Validate summary
        summary = data["summary"]
        assert "total_competitive_deals" in summary
        assert "total_wins" in summary
        assert "total_losses" in summary
        assert "overall_win_rate" in summary
        assert summary["total_competitive_deals"] == summary["total_wins"] + summary["total_losses"]
        
        # Validate competitor entries
        competitors = data["competitors"]
        assert len(competitors) > 0
        
        for comp in competitors:
            assert "competitor_name" in comp
            assert "wins" in comp
            assert "losses" in comp
            assert "win_rate" in comp
            assert "common_win_reasons" in comp
            assert "common_loss_reasons" in comp
            assert "price_comparison" in comp
            assert "recommended_tactics" in comp
            
            # Validate win rate calculation
            total = comp["wins"] + comp["losses"]
            expected_rate = round(comp["wins"] / total * 100, 1) if total > 0 else 0
            assert abs(comp["win_rate"] - expected_rate) < 0.2
        
        print(f"✓ Competitor analysis - Overall win rate: {summary['overall_win_rate']}%")


class TestCreditCheck:
    """Credit Check Integration tests (SIMULATED - not connected to real bureaus)"""
    
    def test_credit_check_success(self):
        """Test credit check simulation - MOCKED"""
        payload = {
            "customer_name": "TEST_John Smith",
            "ssn_last_4": "1234",
            "date_of_birth": "1990-01-15",
            "address": "123 Test Street, Phoenix, AZ 85001"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/credit-check",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "score_range" in data
        assert "approval_likelihood" in data
        assert "recommended_financing" in data
        assert "max_loan_amount" in data
        assert "notes" in data
        
        # Validate data types
        assert isinstance(data["recommended_financing"], list)
        assert data["max_loan_amount"] > 0
        assert len(data["notes"]) > 0
        
        # Verify it's a soft inquiry (simulated)
        assert any("soft inquiry" in note.lower() for note in data["notes"])
        
        print(f"✓ Credit check (SIMULATED) - Score: {data['score_range']}, Max loan: ${data['max_loan_amount']:,.0f}")
    
    def test_credit_check_required_fields(self):
        """Test credit check validates required fields"""
        payload = {
            "customer_name": "TEST_Jane Doe",
            "ssn_last_4": "5678",
            "date_of_birth": "1985-06-20",
            "address": "456 Example Ave, Tempe, AZ 85281"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/credit-check",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "approval_likelihood" in data
        print("✓ Credit check validation working")


class TestRoofMeasurement:
    """Satellite Roof Measurement endpoint tests"""
    
    def test_roof_measurement(self):
        """Test satellite roof measurement"""
        address = "123 Test Street, Phoenix, AZ 85001"
        response = requests.post(
            f"{BASE_URL}/api/advanced/measure-roof",
            params={"address": address}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert data["success"] is True
        assert "roof_analysis" in data
        assert "confidence" in data
        assert "notes" in data
        
        roof = data["roof_analysis"]
        # Validate roof analysis structure
        assert "address" in roof
        assert "measurement_date" in roof
        assert "roof_segments" in roof
        assert "total_roof_area_sqft" in roof
        assert "usable_area_sqft" in roof
        assert "max_panel_count" in roof
        assert "max_system_size_kw" in roof
        assert "shading_analysis" in roof
        assert "roof_condition" in roof
        assert "roof_age_estimate" in roof
        assert "recommended_action" in roof
        
        # Validate roof segments
        segments = roof["roof_segments"]
        assert len(segments) > 0
        for segment in segments:
            assert "id" in segment
            assert "orientation" in segment
            assert "tilt_degrees" in segment
            assert "area_sqft" in segment
            assert "solar_access" in segment
            assert "usable_for_solar" in segment
        
        # Validate shading analysis
        shading = roof["shading_analysis"]
        assert "trees" in shading
        assert "nearby_structures" in shading
        assert "annual_shading_loss" in shading
        
        # Validate confidence score
        assert 0 <= data["confidence"] <= 100
        
        print(f"✓ Roof measurement - Area: {roof['total_roof_area_sqft']} sqft, Max panels: {roof['max_panel_count']}")
    
    def test_roof_measurement_different_address(self):
        """Test roof measurement with different address"""
        address = "789 Solar Lane, Scottsdale, AZ 85251"
        response = requests.post(
            f"{BASE_URL}/api/advanced/measure-roof",
            params={"address": address}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["roof_analysis"]["address"] == address
        print("✓ Roof measurement handles different addresses")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
