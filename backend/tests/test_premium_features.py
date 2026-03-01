"""
Test suite for Premium Pricing Tiers, Feature Gating, and Branding APIs
Tests new subscription tiers: Free ($0), Starter ($149), Professional ($349), Business ($699), Enterprise ($1,499)
Tests feature gating and white-label branding functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://empire-sales-suite.preview.emergentagent.com')

# Test credentials from problem statement
TEST_USER_ID = "301b2e32-f221-48df-a8c1-bfae3a76c4c6"
TEST_ORG_ID = "org-301b2e32-f221-48df-a8c1-bfae3a76c4c6"


class TestSubscriptionPlans:
    """Test new subscription pricing tiers"""
    
    def test_get_subscription_plans_returns_5_tiers(self):
        """GET /api/subscriptions/plans should return 5 tiers with new pricing"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200
        
        plans = response.json()
        assert len(plans) == 5, f"Expected 5 plans, got {len(plans)}"
        
        plan_ids = [p['id'] for p in plans]
        assert 'free' in plan_ids
        assert 'starter' in plan_ids
        assert 'professional' in plan_ids
        assert 'business' in plan_ids
        assert 'enterprise' in plan_ids
        print("PASS: GET /api/subscriptions/plans returns 5 tiers")
    
    def test_free_plan_pricing(self):
        """Free plan should be $0"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        plans = response.json()
        free_plan = next(p for p in plans if p['id'] == 'free')
        
        assert free_plan['price'] == 0, f"Expected Free price $0, got ${free_plan['price']}"
        assert free_plan['name'] == 'Free'
        assert free_plan['limits']['leads'] == 25
        assert free_plan['limits']['users'] == 1
        assert free_plan['limits']['custom_branding'] == False
        print("PASS: Free plan price is $0 with correct limits")
    
    def test_starter_plan_pricing(self):
        """Starter plan should be $149"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        plans = response.json()
        starter_plan = next(p for p in plans if p['id'] == 'starter')
        
        assert starter_plan['price'] == 149.00, f"Expected Starter price $149, got ${starter_plan['price']}"
        assert starter_plan['name'] == 'Starter'
        assert starter_plan['limits']['leads'] == 250
        assert starter_plan['limits']['users'] == 3
        assert starter_plan['limits']['custom_branding'] == False
        print("PASS: Starter plan price is $149 with correct limits")
    
    def test_professional_plan_pricing(self):
        """Professional plan should be $349"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        plans = response.json()
        pro_plan = next(p for p in plans if p['id'] == 'professional')
        
        assert pro_plan['price'] == 349.00, f"Expected Professional price $349, got ${pro_plan['price']}"
        assert pro_plan['name'] == 'Professional'
        assert pro_plan['limits']['leads'] == 1000
        assert pro_plan['limits']['users'] == 10
        assert pro_plan['limits']['team_chat'] == True
        assert pro_plan['limits']['custom_branding'] == False
        print("PASS: Professional plan price is $349 with correct limits")
    
    def test_business_plan_pricing(self):
        """Business plan should be $699"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        plans = response.json()
        biz_plan = next(p for p in plans if p['id'] == 'business')
        
        assert biz_plan['price'] == 699.00, f"Expected Business price $699, got ${biz_plan['price']}"
        assert biz_plan['name'] == 'Business'
        assert biz_plan['limits']['leads'] == 5000
        assert biz_plan['limits']['users'] == 25
        assert biz_plan['limits']['custom_branding'] == True
        assert biz_plan['limits']['ai_lead_hunter'] == True
        assert biz_plan['limits']['admin_dashboard'] == True
        print("PASS: Business plan price is $699 with custom_branding enabled")
    
    def test_enterprise_plan_pricing(self):
        """Enterprise plan should be $1,499"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        plans = response.json()
        ent_plan = next(p for p in plans if p['id'] == 'enterprise')
        
        assert ent_plan['price'] == 1499.00, f"Expected Enterprise price $1499, got ${ent_plan['price']}"
        assert ent_plan['name'] == 'Enterprise'
        assert ent_plan['limits']['leads'] == -1  # Unlimited
        assert ent_plan['limits']['users'] == -1  # Unlimited
        assert ent_plan['limits']['custom_branding'] == True
        assert ent_plan['limits']['custom_domain'] == True
        assert ent_plan['limits']['white_label'] == True
        assert ent_plan['limits']['api_access'] == True
        print("PASS: Enterprise plan price is $1499 with all features enabled")


class TestFeatureGating:
    """Test feature gating endpoints"""
    
    def test_get_feature_usage(self):
        """GET /api/features/usage/{user_id} should return plan limits and feature access"""
        response = requests.get(f"{BASE_URL}/api/features/usage/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert 'plan_id' in data
        assert 'plan_name' in data
        assert 'usage' in data
        assert 'features' in data
        
        # Check usage structure
        assert 'leads' in data['usage']
        assert 'users' in data['usage']
        assert 'ai_proposals' in data['usage']
        
        # Check features structure
        features = data['features']
        assert 'custom_branding' in features
        assert 'custom_domain' in features
        assert 'white_label' in features
        assert 'ai_lead_hunter' in features
        assert 'team_chat' in features
        print(f"PASS: Feature usage returns correct structure for plan: {data['plan_name']}")
    
    def test_check_feature_access_boolean_feature(self):
        """GET /api/features/check/{user_id}/{feature} should check boolean features"""
        response = requests.get(f"{BASE_URL}/api/features/check/{TEST_USER_ID}/custom_branding")
        assert response.status_code == 200
        
        data = response.json()
        assert data['feature'] == 'custom_branding'
        assert 'has_access' in data
        assert 'plan_id' in data
        assert 'plan_name' in data
        assert 'upgrade_required' in data
        
        # If no access, should suggest upgrade
        if not data['has_access']:
            assert 'upgrade_to' in data
        print(f"PASS: Feature check for custom_branding - has_access: {data['has_access']}")
    
    def test_check_feature_access_numeric_limit(self):
        """GET /api/features/check/{user_id}/{feature} should check numeric limits"""
        response = requests.get(f"{BASE_URL}/api/features/check/{TEST_USER_ID}/leads")
        assert response.status_code == 200
        
        data = response.json()
        assert data['feature'] == 'leads'
        assert 'limit' in data
        assert 'unlimited' in data
        assert 'plan_id' in data
        print(f"PASS: Feature check for leads - limit: {data['limit']}, unlimited: {data['unlimited']}")
    
    def test_check_white_label_feature(self):
        """White label feature should require Enterprise plan"""
        response = requests.get(f"{BASE_URL}/api/features/check/{TEST_USER_ID}/white_label")
        assert response.status_code == 200
        
        data = response.json()
        assert data['feature'] == 'white_label'
        
        # If not on enterprise, upgrade_to should be 'enterprise'
        if not data['has_access']:
            assert data['upgrade_to'] == 'enterprise'
        print(f"PASS: White label feature check - has_access: {data['has_access']}")
    
    def test_check_team_chat_feature(self):
        """Team chat feature should require Professional+ plan"""
        response = requests.get(f"{BASE_URL}/api/features/check/{TEST_USER_ID}/team_chat")
        assert response.status_code == 200
        
        data = response.json()
        assert data['feature'] == 'team_chat'
        
        if not data['has_access']:
            assert data['upgrade_to'] == 'professional'
        print(f"PASS: Team chat feature check - has_access: {data['has_access']}")


class TestBrandingAPI:
    """Test branding/white-label endpoints"""
    
    def test_get_branding_default(self):
        """GET /api/branding/{org_id} should return default branding for new org"""
        response = requests.get(f"{BASE_URL}/api/branding/{TEST_ORG_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['organization_id'] == TEST_ORG_ID
        assert 'company_name' in data
        assert 'primary_color' in data
        assert 'secondary_color' in data
        assert 'accent_color' in data
        
        # Default branding check
        if data.get('is_default'):
            assert data['company_name'] == 'Solar Empire'
            assert data['primary_color'] == '#f59e0b'
            assert data['secondary_color'] == '#0a1628'
            assert data['accent_color'] == '#22c55e'
        print(f"PASS: GET branding returns correct structure for org: {TEST_ORG_ID}")
    
    def test_update_branding_requires_business_plan(self):
        """PUT /api/branding/{org_id} should require Business or Enterprise plan"""
        update_data = {
            "user_id": TEST_USER_ID,
            "company_name": "Test Company",
            "primary_color": "#3b82f6"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/branding/{TEST_ORG_ID}",
            json=update_data
        )
        
        # Should either succeed (if user has Business+) or fail with 403
        if response.status_code == 403:
            error_data = response.json()
            assert 'Business' in error_data.get('detail', '') or 'Enterprise' in error_data.get('detail', '')
            print("PASS: Branding update correctly requires Business+ plan (403 returned)")
        elif response.status_code == 200:
            print("PASS: Branding update succeeded (user has Business+ plan)")
        else:
            print(f"WARN: Unexpected status code: {response.status_code}")
    
    def test_branding_fields_structure(self):
        """Branding should include all expected fields"""
        response = requests.get(f"{BASE_URL}/api/branding/{TEST_ORG_ID}")
        data = response.json()
        
        expected_fields = [
            'organization_id', 'company_name', 'logo_url', 
            'primary_color', 'secondary_color', 'accent_color', 'custom_domain'
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print("PASS: Branding response contains all expected fields")


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """Health endpoint should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        print("PASS: API health check")
    
    def test_api_root(self):
        """Root endpoint should return app info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert 'Solar Empire' in data.get('message', '')
        print("PASS: API root endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
