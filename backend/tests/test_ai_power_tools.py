"""
Test Suite for AI Power Tools - Phase 2
Testing AI Objection Handler, Predictive Close Probability, and Smart Follow-up Timing

Objection Categories: price, timing, trust, roof, moving, spouse, technology
Close Probability Tiers: HOT (80+), WARM (60-79), NURTURE (40-59), COLD (<40)
Occupations: professional, retired, self-employed, unknown
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://empire-sales-suite.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============== AI OBJECTION HANDLER TESTS ==============

class TestObjectionHandlerCategories:
    """Test GET /api/ai-tools/objection-handler/categories"""
    
    def test_get_all_objection_categories(self, api_client):
        """Should return all 7 objection categories"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/objection-handler/categories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data
        
        categories = data["categories"]
        assert len(categories) == 7, f"Expected 7 categories, got {len(categories)}"
        
        # Verify all expected categories are present
        expected_categories = ["price", "timing", "trust", "roof", "moving", "spouse", "technology"]
        category_names = [c["category"] for c in categories]
        
        for expected in expected_categories:
            assert expected in category_names, f"Category '{expected}' not found"
    
    def test_categories_have_keywords(self, api_client):
        """Each category should have keywords for matching"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/objection-handler/categories")
        assert response.status_code == 200
        
        data = response.json()
        for category in data["categories"]:
            assert "keywords" in category, f"Category {category['category']} missing keywords"
            assert len(category["keywords"]) > 0, f"Category {category['category']} has no keywords"
    
    def test_categories_have_sample_objections(self, api_client):
        """Each category should have sample objections"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/objection-handler/categories")
        assert response.status_code == 200
        
        data = response.json()
        for category in data["categories"]:
            assert "sample_objections" in category
            assert "rebuttal_count" in category


class TestObjectionHandler:
    """Test POST /api/ai-tools/objection-handler"""
    
    def test_handle_price_objection(self, api_client):
        """Should handle price-related objections"""
        payload = {
            "objection": "Solar is too expensive for me right now",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["category"] == "price", f"Expected category 'price', got '{data['category']}'"
        assert "recommended_response" in data
        assert "rebuttal" in data["recommended_response"] or "closing_question" in data["recommended_response"]
    
    def test_handle_timing_objection(self, api_client):
        """Should handle timing-related objections"""
        payload = {
            "objection": "I'm not ready to make a decision now, I want to think about it later",
            "tone": "empathetic"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "timing"
        assert "recommended_response" in data
    
    def test_handle_trust_objection(self, api_client):
        """Should handle trust-related objections"""
        payload = {
            "objection": "How do I know your company is reliable and not a scam?",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "trust"
    
    def test_handle_roof_objection(self, api_client):
        """Should handle roof-related objections"""
        payload = {
            "objection": "My roof is too old, I need to replace it first",
            "tone": "friendly"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "roof"
    
    def test_handle_moving_objection(self, api_client):
        """Should handle moving-related objections"""
        payload = {
            "objection": "I might sell my house in a few years",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "moving"
    
    def test_handle_spouse_objection(self, api_client):
        """Should handle spouse-related objections"""
        payload = {
            "objection": "I need to discuss this with my husband first",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "spouse"
    
    def test_handle_technology_objection(self, api_client):
        """Should handle technology-related objections"""
        payload = {
            "objection": "I want to wait for better solar technology to come out",
            "tone": "direct"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "technology"
    
    def test_handle_objection_with_context(self, api_client):
        """Should handle objection with additional context"""
        payload = {
            "objection": "It costs too much money",
            "context": "Customer has a $400 monthly electric bill in California",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "objection" in data
        assert data["objection"] == payload["objection"]
    
    def test_handle_general_objection(self, api_client):
        """Should handle objections that don't match specific categories"""
        payload = {
            "objection": "I just don't want solar panels",
            "tone": "empathetic"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/objection-handler", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        # Should still have a recommended response (fallback)
        assert "recommended_response" in data


# ============== CLOSE PROBABILITY TESTS ==============

class TestCloseProbability:
    """Test POST /api/ai-tools/close-probability"""
    
    def test_predict_hot_lead(self, api_client):
        """Should predict HOT tier for high-quality leads"""
        payload = {
            "lead_id": "TEST_hot_lead_001",
            "bill_amount": 400,
            "homeowner": True,
            "timeline": "immediate",
            "credit_score_range": "excellent",
            "source": "referral",
            "appointments_completed": 2,
            "proposals_sent": 1,
            "clicked_proposal": True,
            "responded_to_sms": True,
            "opened_emails": 5,
            "days_in_pipeline": 10,
            "last_contact_days_ago": 1
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["probability_score"] >= 80, f"Expected HOT (80+), got {data['probability_score']}"
        assert data["tier"] == "HOT"
        assert data["tier_color"] == "#ef4444"
        assert "recommendation" in data
        assert "Contact immediately" in data["recommendation"]
    
    def test_predict_warm_lead(self, api_client):
        """Should predict WARM tier for engaged leads"""
        # Moderate lead attributes to target WARM tier (60-79)
        payload = {
            "lead_id": "TEST_warm_lead_001",
            "bill_amount": 200,  # +10 medium bill
            "homeowner": True,   # No penalty
            "timeline": "3-6 months",  # +5 instead of +15
            "credit_score_range": "fair",  # 0 instead of +10
            "source": "cold_call",  # -5 instead of +10
            "appointments_scheduled": 1,  # +5
            "appointments_completed": 0,  # No completion boost
            "proposals_sent": 0,
            "days_in_pipeline": 20,
            "last_contact_days_ago": 3
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert 60 <= data["probability_score"] < 80, f"Expected WARM (60-79), got {data['probability_score']}"
        assert data["tier"] == "WARM"
    
    def test_predict_nurture_lead(self, api_client):
        """Should predict NURTURE tier for moderate leads"""
        payload = {
            "lead_id": "TEST_nurture_lead_001",
            "bill_amount": 180,
            "homeowner": True,
            "timeline": "3-6 months",
            "credit_score_range": "fair",
            "source": "cold_call",
            "appointments_completed": 0,
            "days_in_pipeline": 45,
            "last_contact_days_ago": 10
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert 40 <= data["probability_score"] < 60, f"Expected NURTURE (40-59), got {data['probability_score']}"
        assert data["tier"] == "NURTURE"
    
    def test_predict_cold_lead(self, api_client):
        """Should predict COLD tier for low-quality leads"""
        payload = {
            "lead_id": "TEST_cold_lead_001",
            "bill_amount": 100,
            "homeowner": False,  # Not a homeowner = big penalty
            "timeline": "just looking",
            "credit_score_range": "poor",
            "source": "cold_call",
            "appointments_completed": 0,
            "days_in_pipeline": 100,
            "last_contact_days_ago": 45
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["probability_score"] < 40, f"Expected COLD (<40), got {data['probability_score']}"
        assert data["tier"] == "COLD"
    
    def test_probability_has_score_breakdown(self, api_client):
        """Response should include score breakdown"""
        payload = {
            "bill_amount": 300,
            "homeowner": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "score_breakdown" in data
        assert "base_score" in data["score_breakdown"]
        assert "engagement_boost" in data["score_breakdown"]
        assert "final_score" in data["score_breakdown"]
    
    def test_probability_has_contributing_factors(self, api_client):
        """Response should include contributing factors"""
        payload = {
            "bill_amount": 350,
            "homeowner": True,
            "timeline": "immediate",
            "source": "qr_scan"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "contributing_factors" in data
        assert len(data["contributing_factors"]) > 0
        
        # Each factor should have factor name and impact
        for factor in data["contributing_factors"]:
            assert "factor" in factor
            assert "impact" in factor
    
    def test_probability_has_next_actions(self, api_client):
        """Response should include next best actions"""
        payload = {
            "bill_amount": 250,
            "homeowner": True,
            "appointments_completed": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "next_best_actions" in data
        assert len(data["next_best_actions"]) > 0


class TestCloseProbabilityBatch:
    """Test POST /api/ai-tools/close-probability/batch"""
    
    def test_batch_predict_multiple_leads(self, api_client):
        """Should batch predict multiple leads at once"""
        payload = [
            {
                "lead_id": "TEST_batch_1",
                "bill_amount": 400,
                "homeowner": True,
                "timeline": "immediate",
                "source": "referral"
            },
            {
                "lead_id": "TEST_batch_2",
                "bill_amount": 200,
                "homeowner": True,
                "timeline": "3-6 months"
            },
            {
                "lead_id": "TEST_batch_3",
                "bill_amount": 100,
                "homeowner": False
            }
        ]
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability/batch", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "predictions" in data
        assert "summary" in data
        
        assert len(data["predictions"]) == 3
    
    def test_batch_predict_returns_sorted_results(self, api_client):
        """Batch results should be sorted by score descending"""
        payload = [
            {
                "lead_id": "TEST_low_score",
                "bill_amount": 100,
                "homeowner": False
            },
            {
                "lead_id": "TEST_high_score",
                "bill_amount": 450,
                "homeowner": True,
                "timeline": "immediate",
                "source": "referral"
            }
        ]
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability/batch", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        predictions = data["predictions"]
        # First result should have higher score than second
        assert predictions[0]["score"] >= predictions[1]["score"]
    
    def test_batch_predict_summary(self, api_client):
        """Batch response should include tier summary"""
        payload = [
            {"lead_id": f"TEST_batch_summary_{i}", "bill_amount": 300, "homeowner": True}
            for i in range(5)
        ]
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/close-probability/batch", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_leads" in summary
        assert summary["total_leads"] == 5
        assert "hot_leads" in summary
        assert "warm_leads" in summary
        assert "nurture_leads" in summary
        assert "cold_leads" in summary


# ============== SMART FOLLOW-UP TIMING TESTS ==============

class TestFollowUpTimingProfiles:
    """Test GET /api/ai-tools/follow-up-timing/profiles"""
    
    def test_get_all_timing_profiles(self, api_client):
        """Should return all occupation timing profiles"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/follow-up-timing/profiles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "profiles" in data
        
        profiles = data["profiles"]
        expected_occupations = ["professional", "retired", "self-employed", "unknown"]
        
        for occupation in expected_occupations:
            assert occupation in profiles, f"Profile '{occupation}' not found"
            assert "best_days" in profiles[occupation]
            assert "best_hours" in profiles[occupation]
            assert "avoid_hours" in profiles[occupation]
            assert "notes" in profiles[occupation]
    
    def test_channel_timing_included(self, api_client):
        """Should include channel timing preferences"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/follow-up-timing/profiles")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "channel_timing" in data
        channel_timing = data["channel_timing"]
        
        expected_channels = ["phone", "sms", "email"]
        for channel in expected_channels:
            assert channel in channel_timing, f"Channel '{channel}' not found"
            assert "peak_hours" in channel_timing[channel]
    
    def test_stage_urgency_included(self, api_client):
        """Should include pipeline stage urgency information"""
        response = api_client.get(f"{BASE_URL}/api/ai-tools/follow-up-timing/profiles")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stage_urgency" in data
        stage_urgency = data["stage_urgency"]
        
        expected_stages = ["new", "contacted", "appointment_set", "proposal_sent", "negotiating"]
        for stage in expected_stages:
            assert stage in stage_urgency, f"Stage '{stage}' not found"
            assert "max_wait_hours" in stage_urgency[stage]
            assert "ideal_followup" in stage_urgency[stage]


class TestFollowUpTiming:
    """Test POST /api/ai-tools/follow-up-timing"""
    
    def test_professional_timing(self, api_client):
        """Should recommend appropriate times for professionals"""
        payload = {
            "lead_id": "TEST_timing_pro_001",
            "lead_name": "John Smith",
            "occupation": "professional",
            "preferred_channel": "phone",
            "pipeline_stage": "contacted",
            "urgency_level": "medium"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["lead_name"] == "John Smith"
        assert "optimal_times" in data
        assert len(data["optimal_times"]) > 0
        assert "best_time" in data
        
        # Check timing factors
        assert "timing_factors" in data
        assert data["timing_factors"]["occupation_profile"] == "professional"
    
    def test_retired_timing(self, api_client):
        """Should recommend appropriate times for retired people"""
        payload = {
            "lead_id": "TEST_timing_retired_001",
            "lead_name": "Mary Johnson",
            "occupation": "retired",
            "preferred_channel": "phone",
            "pipeline_stage": "new",
            "urgency_level": "high"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["timing_factors"]["occupation_profile"] == "retired"
        assert "Mid-morning" in data["timing_factors"]["profile_notes"] or "afternoon" in data["timing_factors"]["profile_notes"].lower()
    
    def test_self_employed_timing(self, api_client):
        """Should recommend appropriate times for self-employed people"""
        payload = {
            "lead_name": "Bob Builder",
            "occupation": "self-employed",
            "preferred_channel": "sms",
            "pipeline_stage": "proposal_sent"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["timing_factors"]["occupation_profile"] == "self-employed"
    
    def test_new_lead_urgency(self, api_client):
        """New leads should have urgent flag and message"""
        payload = {
            "lead_name": "Hot Lead",
            "occupation": "unknown",
            "preferred_channel": "phone",
            "pipeline_stage": "new",
            "urgency_level": "medium"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["urgent"] == True
        assert data["urgency_message"] is not None
        assert "NEW LEAD" in data["urgency_message"] or "5 minutes" in data["urgency_message"]
    
    def test_critical_urgency_level(self, api_client):
        """Critical urgency should be marked as urgent"""
        payload = {
            "lead_name": "Critical Lead",
            "occupation": "professional",
            "preferred_channel": "phone",
            "pipeline_stage": "negotiating",
            "urgency_level": "critical"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["urgent"] == True
    
    def test_timing_with_response_history(self, api_client):
        """Should learn from past response times"""
        payload = {
            "lead_name": "Learning Test",
            "occupation": "professional",
            "preferred_channel": "email",
            "pipeline_stage": "contacted",
            "response_times": [
                "2026-01-10T09:00:00Z",
                "2026-01-11T09:30:00Z",
                "2026-01-12T10:00:00Z"
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should recognize learned pattern
        assert data["timing_factors"]["response_pattern"] == "learned"
        assert len(data["timing_factors"]["learned_best_hours"]) > 0
    
    def test_timing_includes_pro_tips(self, api_client):
        """Response should include pro tips"""
        payload = {
            "lead_name": "Pro Tips Test",
            "occupation": "retired",
            "preferred_channel": "phone",
            "pipeline_stage": "appointment_set"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "pro_tips" in data
        assert len(data["pro_tips"]) > 0
    
    def test_avoid_times_included(self, api_client):
        """Response should include times to avoid"""
        payload = {
            "lead_name": "Avoid Times Test",
            "occupation": "professional",
            "preferred_channel": "phone",
            "pipeline_stage": "contacted"
        }
        
        response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "avoid_times" in data
        assert "hours" in data["avoid_times"]
        assert "reason" in data["avoid_times"]
    
    def test_different_channels(self, api_client):
        """Should work with different preferred channels"""
        for channel in ["phone", "sms", "email"]:
            payload = {
                "lead_name": f"Channel {channel} Test",
                "occupation": "unknown",
                "preferred_channel": channel,
                "pipeline_stage": "contacted"
            }
            
            response = api_client.post(f"{BASE_URL}/api/ai-tools/follow-up-timing", json=payload)
            
            assert response.status_code == 200, f"Failed for channel: {channel}"
            data = response.json()
            assert data["recommended_channel"] == channel


# ============== CLEANUP ==============

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests complete"""
    yield
    # Note: Test data is stored in MongoDB, cleanup would require direct DB access
    # For now, test data with TEST_ prefix remains in the database
    print("Test session complete. TEST_ prefixed data may remain in database.")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
