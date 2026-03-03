"""
Test suite for Subscription and Territory APIs
Tests subscription plans, checkout, current subscription, and territory heatmap
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://solar-lead-monetize.preview.emergentagent.com')

class TestSubscriptionEndpoints:
    """Test subscription-related endpoints"""
    
    def test_get_subscription_plans(self):
        """GET /api/subscriptions/plans - should return 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        plans = response.json()
        assert isinstance(plans, list), "Response should be a list"
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        # Verify plan IDs
        plan_ids = [p['id'] for p in plans]
        assert 'free' in plan_ids, "Free plan should exist"
        assert 'pro' in plan_ids, "Pro plan should exist"
        assert 'enterprise' in plan_ids, "Enterprise plan should exist"
        
        # Verify prices
        for plan in plans:
            if plan['id'] == 'free':
                assert plan['price'] == 0.0, "Free plan should be $0"
                assert plan['name'] == 'Free'
            elif plan['id'] == 'pro':
                assert plan['price'] == 49.0, "Pro plan should be $49"
                assert plan['name'] == 'Pro'
                assert plan['popular'] == True, "Pro should be marked popular"
            elif plan['id'] == 'enterprise':
                assert plan['price'] == 149.0, "Enterprise plan should be $149"
                assert plan['name'] == 'Enterprise'
        
        # Verify each plan has required fields
        for plan in plans:
            assert 'id' in plan
            assert 'name' in plan
            assert 'price' in plan
            assert 'features' in plan
            assert 'limits' in plan
            assert isinstance(plan['features'], list)
            assert isinstance(plan['limits'], dict)
        
        print("✓ GET /api/subscriptions/plans - PASSED: Returns 3 tiers (Free, Pro $49, Enterprise $149)")

    def test_get_current_subscription(self):
        """GET /api/subscriptions/current/{user_id} - should return current subscription"""
        test_user_id = "301b2e32-f221-48df-a8c1-bfae3a76c4c6"
        response = requests.get(f"{BASE_URL}/api/subscriptions/current/{test_user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'plan_id' in data
        assert 'plan_name' in data
        assert 'status' in data
        assert 'features' in data
        assert 'limits' in data
        
        # User should have at least free plan
        assert data['plan_id'] in ['free', 'pro', 'enterprise']
        assert data['status'] in ['active', 'inactive', 'cancelled']
        
        print(f"✓ GET /api/subscriptions/current/{test_user_id} - PASSED: Returns plan '{data['plan_name']}' with status '{data['status']}'")

    def test_checkout_subscription_pro(self):
        """POST /api/subscriptions/checkout - should return checkout_url for Pro plan"""
        test_user_id = "301b2e32-f221-48df-a8c1-bfae3a76c4c6"
        payload = {
            "plan_id": "pro",
            "origin_url": "https://solar-lead-monetize.preview.emergentagent.com",
            "user_id": test_user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'checkout_url' in data, "Response should include checkout_url"
        assert 'session_id' in data, "Response should include session_id"
        assert data['checkout_url'].startswith('https://checkout.stripe.com'), "checkout_url should be Stripe URL"
        
        print("✓ POST /api/subscriptions/checkout (Pro) - PASSED: Returns checkout_url and session_id")

    def test_checkout_subscription_enterprise(self):
        """POST /api/subscriptions/checkout - should return checkout_url for Enterprise plan"""
        test_user_id = "301b2e32-f221-48df-a8c1-bfae3a76c4c6"
        payload = {
            "plan_id": "enterprise",
            "origin_url": "https://solar-lead-monetize.preview.emergentagent.com",
            "user_id": test_user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'checkout_url' in data
        assert 'session_id' in data
        
        print("✓ POST /api/subscriptions/checkout (Enterprise) - PASSED")

    def test_checkout_free_plan(self):
        """POST /api/subscriptions/checkout - Free plan should activate directly without checkout"""
        test_user_id = "test-free-user-" + "123456"
        payload = {
            "plan_id": "free",
            "origin_url": "https://solar-lead-monetize.preview.emergentagent.com",
            "user_id": test_user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('success') == True, "Free plan should activate successfully"
        assert data.get('plan') == 'free', "Should confirm free plan"
        
        print("✓ POST /api/subscriptions/checkout (Free) - PASSED: Free plan activated directly")

    def test_checkout_invalid_plan(self):
        """POST /api/subscriptions/checkout - Invalid plan should return 400"""
        payload = {
            "plan_id": "invalid_plan",
            "origin_url": "https://solar-lead-monetize.preview.emergentagent.com",
            "user_id": "test-user"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("✓ POST /api/subscriptions/checkout (Invalid) - PASSED: Returns 400 for invalid plan")


class TestTerritoryEndpoints:
    """Test territory-related endpoints"""
    
    def test_get_territories(self):
        """GET /api/territories - should return list of territories"""
        response = requests.get(f"{BASE_URL}/api/territories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        territories = response.json()
        assert isinstance(territories, list)
        
        if len(territories) > 0:
            territory = territories[0]
            assert 'id' in territory
            assert 'name' in territory
            assert 'zip_codes' in territory
            assert 'priority_score' in territory
        
        print(f"✓ GET /api/territories - PASSED: Returns {len(territories)} territories")

    def test_get_heatmap_data(self):
        """GET /api/territories/heatmap/data - should return heatmap data"""
        response = requests.get(f"{BASE_URL}/api/territories/heatmap/data")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'heatmap' in data
        assert 'total_territories' in data
        assert isinstance(data['heatmap'], list)
        
        if len(data['heatmap']) > 0:
            item = data['heatmap'][0]
            assert 'zip_code' in item
            assert 'territory_id' in item
            assert 'territory_name' in item
            assert 'priority_score' in item
            assert 'close_rate' in item
            assert 'lead_count' in item
        
        print(f"✓ GET /api/territories/heatmap/data - PASSED: Returns {len(data['heatmap'])} heatmap items")


class TestHealthCheck:
    """Test health endpoint"""
    
    def test_health_check(self):
        """GET /api/health - should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        
        print("✓ GET /api/health - PASSED: Service is healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
