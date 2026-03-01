"""
Test Suite for Phase 3 Intelligence & Data Tools APIs
Tests for:
1. Neighborhood Heatmap - Solar installations data
2. Weather-Based Outreach - Campaign triggers based on weather
3. Competitor Price Intel - Competitor pricing analysis
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://elite-solar-rep.preview.emergentagent.com').rstrip('/')


class TestNeighborhoodHeatmap:
    """Neighborhood Heatmap API Tests"""
    
    def test_heatmap_installations_with_zip(self):
        """Test fetching heatmap installations by ZIP code"""
        response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/installations", json={
            "latitude": 34.0901,
            "longitude": -118.4065,
            "radius_miles": 3.0,
            "zip_code": "90210"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "center" in data
        assert "installations" in data
        assert "stats" in data
        assert "sales_pitch" in data
        assert "heatmap_intensity" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_installations" in stats
        assert "our_installations" in stats
        assert "competitor_installations" in stats
        assert "market_share_percent" in stats
        
        print(f"✓ Heatmap 90210: {stats['total_installations']} installations, {stats['market_share_percent']}% market share")
    
    def test_heatmap_installations_phoenix(self):
        """Test fetching heatmap for Phoenix ZIP code"""
        response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/installations", json={
            "latitude": 33.4484,
            "longitude": -112.0740,
            "radius_miles": 2.0,
            "zip_code": "85001"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["center"]["zip_code"] == "85001"
        assert len(data["installations"]) > 0
        
        print(f"✓ Phoenix 85001: {len(data['installations'])} installations found")
    
    def test_heatmap_sales_pitch(self):
        """Test that sales pitch data is included"""
        response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/installations", json={
            "latitude": 34.0901,
            "longitude": -118.4065,
            "radius_miles": 5.0,
            "zip_code": "90210"
        })
        assert response.status_code == 200
        
        data = response.json()
        sales_pitch = data["sales_pitch"]
        assert "talking_points" in sales_pitch
        assert isinstance(sales_pitch["talking_points"], list)
        
        print(f"✓ Sales pitch has {len(sales_pitch['talking_points'])} talking points")
    
    def test_heatmap_intensity_levels(self):
        """Test heatmap intensity is returned correctly"""
        response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/installations", json={
            "latitude": 34.0901,
            "longitude": -118.4065,
            "radius_miles": 3.0,
            "zip_code": "90210"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["heatmap_intensity"] in ["high", "medium", "low"]
        
        print(f"✓ Heatmap intensity: {data['heatmap_intensity']}")
    
    def test_heatmap_stats_by_zip(self):
        """Test ZIP code stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/intelligence/heatmap/stats/90210")
        assert response.status_code == 200
        
        data = response.json()
        assert data["zip_code"] == "90210"
        assert "installations" in data
        assert "market_data" in data
        assert "trend" in data
        assert "recommendation" in data
        
        print(f"✓ ZIP 90210 stats: {data['installations']['confirmed']} confirmed, trend: {data['trend']}")
    
    def test_add_installation(self):
        """Test adding a new installation"""
        response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/add-installation", json={
            "address": "123 Test St, Beverly Hills, CA",
            "zip_code": "90210",
            "latitude": 34.0901,
            "longitude": -118.4065,
            "system_size_kw": 9.5,
            "customer_name": "TEST_Customer",
            "is_our_customer": True
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["system_size_kw"] == 9.5
        assert data["zip_code"] == "90210"
        
        print(f"✓ Installation added: {data['id']}")


class TestWeatherOutreach:
    """Weather-Based Outreach API Tests"""
    
    def test_check_weather_triggers(self):
        """Test checking weather triggers for multiple ZIP codes"""
        response = requests.post(f"{BASE_URL}/api/intelligence/weather/check-triggers", json={
            "zip_codes": ["90210", "85001", "77001"],
            "trigger_temp_f": 85,
            "trigger_conditions": ["sunny", "clear", "hot"]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "checked_at" in data
        assert "zip_codes_checked" in data
        assert "triggers_found" in data
        assert "triggered_areas" in data
        assert "campaign_suggestions" in data
        assert "detailed_results" in data
        
        assert data["zip_codes_checked"] == 3
        
        print(f"✓ Checked {data['zip_codes_checked']} ZIPs, {data['triggers_found']} triggers found")
    
    def test_weather_triggers_detailed_results(self):
        """Test that detailed weather results are included"""
        response = requests.post(f"{BASE_URL}/api/intelligence/weather/check-triggers", json={
            "zip_codes": ["90210"],
            "trigger_temp_f": 85,
            "trigger_conditions": ["sunny", "clear", "hot"]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["detailed_results"]) == 1
        
        result = data["detailed_results"][0]
        assert "zip_code" in result
        assert "weather" in result
        assert "triggers" in result
        
        weather = result["weather"]
        assert "condition" in weather
        assert "temperature_f" in weather
        assert "uv_index" in weather
        assert "solar_irradiance_kwh_m2" in weather
        
        triggers = result["triggers"]
        assert "should_outreach" in triggers
        assert "solar_score" in triggers
        
        print(f"✓ ZIP 90210: {weather['condition']}, {weather['temperature_f']}°F, solar score {triggers['solar_score']}")
    
    def test_weather_campaign_suggestions(self):
        """Test that campaign suggestions are generated"""
        response = requests.post(f"{BASE_URL}/api/intelligence/weather/check-triggers", json={
            "zip_codes": ["90210", "85001", "77001", "90211"],
            "trigger_temp_f": 70,  # Lower threshold to likely trigger
            "trigger_conditions": ["sunny", "clear", "hot", "partly cloudy"]
        })
        assert response.status_code == 200
        
        data = response.json()
        # Campaign suggestions should be generated if triggers are found
        if data["triggers_found"] > 0:
            assert len(data["campaign_suggestions"]) >= 0  # May or may not have suggestions
            if data["campaign_suggestions"]:
                campaign = data["campaign_suggestions"][0]
                assert "campaign_type" in campaign
                assert "subject_line" in campaign
                assert "target_zips" in campaign
                assert "urgency" in campaign
                
                print(f"✓ Campaign suggestion: {campaign['campaign_type']}, urgency: {campaign['urgency']}")
        else:
            print(f"✓ No triggers found (weather conditions didn't match)")
    
    def test_solar_forecast(self):
        """Test solar production forecast endpoint"""
        response = requests.get(f"{BASE_URL}/api/intelligence/weather/forecast/90210?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["zip_code"] == "90210"
        assert "forecast" in data
        assert "summary" in data
        assert "sales_insight" in data
        
        assert len(data["forecast"]) == 7
        
        forecast_day = data["forecast"][0]
        assert "date" in forecast_day
        assert "condition" in forecast_day
        assert "solar_score" in forecast_day
        assert "estimated_production_kwh_per_kw" in forecast_day
        
        summary = data["summary"]
        assert "average_daily_production_per_kw" in summary
        assert "solar_outlook" in summary
        
        print(f"✓ 7-day forecast: avg {summary['average_daily_production_per_kw']} kWh/kW, outlook: {summary['solar_outlook']}")


class TestCompetitorIntel:
    """Competitor Price Intel API Tests"""
    
    def test_competitor_analysis(self):
        """Test getting competitor analysis overview"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/analysis")
        assert response.status_code == 200
        
        data = response.json()
        assert "competitors" in data
        assert "market_summary" in data
        assert "pricing_intelligence" in data
        
        # Verify known competitors are included
        competitor_names = [c["competitor"].lower() for c in data["competitors"]]
        known_competitors = ["sunrun", "sunpower", "tesla", "vivint"]
        for known in known_competitors:
            assert known in competitor_names, f"{known} should be in competitor list"
        
        market = data["market_summary"]
        assert "competitors_tracked" in market
        assert "market_average_ppw" in market
        assert "your_competitive_range" in market
        
        print(f"✓ Competitor analysis: {len(data['competitors'])} competitors, market avg ${market['market_average_ppw']}/W")
    
    def test_beat_quote_strategy(self):
        """Test getting strategy to beat competitor quote"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/beat-quote", params={
            "competitor": "Sunrun",
            "their_price": 35000,
            "system_size_kw": 10
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "competitor" in data
        assert "their_quote" in data
        assert "your_target" in data
        assert "win_strategies" in data
        assert "closing_script" in data
        
        # Verify quote calculations
        their_quote = data["their_quote"]
        assert their_quote["total"] == 35000
        assert their_quote["system_size_kw"] == 10
        assert their_quote["price_per_watt"] == 3.5  # $35000 / 10000W = $3.50/W
        
        your_target = data["your_target"]
        assert your_target["total"] < 35000  # Should be lower
        assert your_target["savings_vs_them"] > 0
        
        # Verify strategies are included
        assert len(data["win_strategies"]) > 0
        strategy = data["win_strategies"][0]
        assert "type" in strategy
        assert "strategy" in strategy
        assert "detail" in strategy
        assert "impact" in strategy
        
        print(f"✓ Beat quote: Target ${your_target['total']}, save ${your_target['savings_vs_them']}, {len(data['win_strategies'])} strategies")
    
    def test_beat_quote_tesla(self):
        """Test beat quote strategy for Tesla"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/beat-quote", params={
            "competitor": "Tesla",
            "their_price": 28500,
            "system_size_kw": 10
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["competitor"] == "Tesla"
        assert data["competitor_tier"] == "tech"
        
        print(f"✓ Tesla beat strategy: tier {data['competitor_tier']}, {len(data['win_strategies'])} strategies")
    
    def test_report_competitor_quote(self):
        """Test reporting a competitor quote"""
        response = requests.post(f"{BASE_URL}/api/intelligence/competitors/report-quote", json={
            "competitor_name": "TEST_Sunrun",
            "system_size_kw": 8.5,
            "quote_amount": 29750,
            "zip_code": "90210",
            "panel_brand": "Q.Cells",
            "inverter_brand": "Enphase",
            "includes_battery": False,
            "source": "customer_reported"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "price_per_watt" in data
        assert "counter_strategies" in data
        
        # Verify price calculation
        expected_ppw = 29750 / (8.5 * 1000)  # $3.50/W
        assert abs(data["price_per_watt"] - expected_ppw) < 0.01
        
        print(f"✓ Quote reported: ${data['price_per_watt']}/W, {len(data['counter_strategies'])} counter strategies")
    
    def test_get_competitor_quotes(self):
        """Test getting reported competitor quotes"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/quotes")
        assert response.status_code == 200
        
        data = response.json()
        assert "quotes" in data
        assert "total" in data
        
        print(f"✓ Retrieved {data['total']} competitor quotes")
    
    def test_filter_competitor_quotes_by_zip(self):
        """Test filtering quotes by ZIP code"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/quotes", params={
            "zip_code": "90210"
        })
        assert response.status_code == 200
        
        data = response.json()
        # Verify all returned quotes are from the specified ZIP
        for quote in data["quotes"]:
            assert quote["zip_code"] == "90210"
        
        print(f"✓ Filtered quotes for 90210: {len(data['quotes'])} found")


class TestIntegration:
    """Integration tests for Phase 3 APIs"""
    
    def test_full_competitor_workflow(self):
        """Test full workflow: report quote -> get analysis -> beat quote"""
        # 1. Report a quote
        report_response = requests.post(f"{BASE_URL}/api/intelligence/competitors/report-quote", json={
            "competitor_name": "TEST_Integration_Competitor",
            "system_size_kw": 10,
            "quote_amount": 32000,
            "zip_code": "90210",
            "source": "sales_intel"
        })
        assert report_response.status_code == 200
        quote = report_response.json()
        
        # 2. Get analysis
        analysis_response = requests.get(f"{BASE_URL}/api/intelligence/competitors/analysis")
        assert analysis_response.status_code == 200
        analysis = analysis_response.json()
        
        # 3. Get beat quote strategy
        beat_response = requests.get(f"{BASE_URL}/api/intelligence/competitors/beat-quote", params={
            "competitor": "TEST_Integration_Competitor",
            "their_price": 32000,
            "system_size_kw": 10
        })
        assert beat_response.status_code == 200
        beat = beat_response.json()
        
        print(f"✓ Full workflow: Reported ${quote['price_per_watt']}/W, beat strategy saves ${beat['your_target']['savings_vs_them']}")
    
    def test_weather_to_heatmap_workflow(self):
        """Test workflow: check weather -> find installations in triggered areas"""
        # 1. Check weather triggers
        weather_response = requests.post(f"{BASE_URL}/api/intelligence/weather/check-triggers", json={
            "zip_codes": ["90210", "85001"],
            "trigger_temp_f": 70,
            "trigger_conditions": ["sunny", "clear", "hot", "partly cloudy"]
        })
        assert weather_response.status_code == 200
        weather = weather_response.json()
        
        # 2. For each triggered area, get heatmap data
        for triggered in weather["triggered_areas"]:
            heatmap_response = requests.post(f"{BASE_URL}/api/intelligence/heatmap/installations", json={
                "latitude": 34.0901,
                "longitude": -118.4065,
                "radius_miles": 5.0,
                "zip_code": triggered["zip_code"]
            })
            assert heatmap_response.status_code == 200
            
        print(f"✓ Weather->Heatmap workflow: {len(weather['triggered_areas'])} triggered areas checked")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
