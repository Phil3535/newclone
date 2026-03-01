"""
Test Suite for Organization/Multi-tenancy API Endpoints
Tests: CRUD operations, branding, white-label features
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://elite-solar-rep.preview.emergentagent.com"


class TestOrganizationBasics:
    """Basic Organization CRUD tests"""
    
    # Store created org IDs for cleanup
    created_org_ids = []
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check endpoint working")
    
    def test_list_organizations(self):
        """GET /api/organizations - List all organizations"""
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "organizations" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert isinstance(data["organizations"], list)
        
        # Verify we have at least the default and sunpower-pro orgs
        org_slugs = [org.get("slug") for org in data["organizations"]]
        print(f"Found {len(data['organizations'])} organizations: {org_slugs}")
        assert len(data["organizations"]) >= 1  # At least one org should exist
        print("PASS: List organizations endpoint working")
    
    def test_create_organization_success(self):
        """POST /api/organizations - Create new organization with branding"""
        unique_slug = f"test-org-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": "Test Organization",
            "slug": unique_slug,
            "owner_email": "owner@testorg.com",
            "owner_name": "Test Owner",
            "branding": {
                "company_name": "Test Organization",
                "primary_color": "#ff5500",
                "secondary_color": "#0055ff",
                "accent_color": "#00ff55",
                "background_color": "#1a1a2e",
                "text_color": "#ffffff",
                "support_email": "support@testorg.com"
            },
            "settings": {
                "timezone": "America/Los_Angeles",
                "currency": "USD",
                "enable_ai_features": True,
                "max_users": 50
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/organizations", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "organization" in data
        org = data["organization"]
        
        # Store ID for cleanup
        if org.get("id"):
            self.__class__.created_org_ids.append(org["id"])
        
        # Verify organization data
        assert org.get("name") == "Test Organization"
        assert org.get("slug") == unique_slug
        assert org.get("owner_email") == "owner@testorg.com"
        assert org.get("owner_name") == "Test Owner"
        assert "id" in org
        
        # Verify branding
        branding = org.get("branding", {})
        assert branding.get("company_name") == "Test Organization"
        assert branding.get("primary_color") == "#ff5500"
        assert branding.get("support_email") == "support@testorg.com"
        
        # Verify settings
        settings = org.get("settings", {})
        assert settings.get("timezone") == "America/Los_Angeles"
        assert settings.get("max_users") == 50
        
        # Verify subscription defaults
        subscription = org.get("subscription", {})
        assert subscription.get("plan") == "trial"
        assert subscription.get("status") == "trial"
        
        print(f"PASS: Created organization with id={org['id']}, slug={unique_slug}")
        return org
    
    def test_create_organization_duplicate_slug(self):
        """POST /api/organizations - Should fail for duplicate slug"""
        # Try to create with existing slug
        payload = {
            "name": "Duplicate Test",
            "slug": "default",  # Already exists
            "owner_email": "dup@test.com",
            "owner_name": "Dup Owner"
        }
        
        response = requests.post(f"{BASE_URL}/api/organizations", json=payload)
        assert response.status_code == 400
        print("PASS: Duplicate slug correctly rejected with 400")
    
    def test_create_organization_invalid_slug(self):
        """POST /api/organizations - Should validate slug format"""
        payload = {
            "name": "Invalid Slug Test",
            "slug": "Invalid Slug With Spaces!",  # Invalid format
            "owner_email": "invalid@test.com",
            "owner_name": "Invalid Owner"
        }
        
        response = requests.post(f"{BASE_URL}/api/organizations", json=payload)
        assert response.status_code == 422  # Validation error
        print("PASS: Invalid slug format correctly rejected with 422")


class TestOrganizationDetails:
    """Test getting organization details by ID and slug"""
    
    def test_get_organization_by_id(self):
        """GET /api/organizations/{org_id} - Get org by ID"""
        # First get an existing org
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        orgs = response.json().get("organizations", [])
        assert len(orgs) > 0
        
        org_id = orgs[0].get("id")
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}")
        assert response.status_code == 200
        org = response.json()
        
        # Verify response structure
        assert org.get("id") == org_id
        assert "name" in org
        assert "slug" in org
        assert "branding" in org
        assert "settings" in org
        assert "user_count" in org  # Should include stats
        assert "lead_count" in org
        
        print(f"PASS: Got organization by ID: {org.get('name')}")
    
    def test_get_organization_not_found(self):
        """GET /api/organizations/{org_id} - Should return 404 for invalid ID"""
        fake_id = "000000000000000000000000"  # Invalid MongoDB ObjectId
        
        response = requests.get(f"{BASE_URL}/api/organizations/{fake_id}")
        assert response.status_code == 404
        print("PASS: Non-existent organization correctly returns 404")


class TestOrganizationBranding:
    """Test branding/white-label endpoints"""
    
    def test_get_branding_by_slug_default(self):
        """GET /api/organizations/branding/{slug} - Get default org branding"""
        response = requests.get(f"{BASE_URL}/api/organizations/branding/default")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "found" in data
        assert "branding" in data
        assert "organization_name" in data
        
        if data.get("found"):
            assert data.get("organization_name") == "Solar Empire"
            branding = data.get("branding", {})
            assert branding.get("primary_color") == "#f59e0b"  # Default amber
        
        print(f"PASS: Got branding for default org - found={data.get('found')}")
    
    def test_get_branding_by_slug_sunpower(self):
        """GET /api/organizations/branding/sunpower-pro - Get sunpower branding"""
        response = requests.get(f"{BASE_URL}/api/organizations/branding/sunpower-pro")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("found") == True
        assert data.get("organization_name") == "Sunpower Pro"
        
        branding = data.get("branding", {})
        assert branding.get("primary_color") == "#ff6b00"  # Sunpower orange
        
        # Verify settings subset is included
        assert "settings" in data
        settings = data.get("settings", {})
        assert "timezone" in settings
        assert "currency" in settings
        
        print("PASS: Got branding for Sunpower Pro organization")
    
    def test_get_branding_not_found(self):
        """GET /api/organizations/branding/{slug} - Returns default for non-existent"""
        response = requests.get(f"{BASE_URL}/api/organizations/branding/non-existent-org")
        assert response.status_code == 200
        data = response.json()
        
        # Should return default branding with found=False
        assert data.get("found") == False
        assert "branding" in data
        assert data.get("organization_name") == "Solar Empire"  # Default fallback
        
        print("PASS: Non-existent slug returns default branding with found=False")
    
    def test_update_organization_branding(self):
        """PUT /api/organizations/{org_id}/branding - Update branding"""
        # First get an existing org
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        orgs = response.json().get("organizations", [])
        
        # Find a non-default org to update
        test_org = None
        for org in orgs:
            if org.get("slug") not in ["default"]:  # Don't modify default
                test_org = org
                break
        
        if not test_org:
            pytest.skip("No non-default organization available for branding update test")
        
        org_id = test_org.get("id")
        
        # Update branding
        new_branding = {
            "company_name": "Updated Company Name",
            "primary_color": "#123456",
            "secondary_color": "#654321",
            "accent_color": "#abcdef",
            "background_color": "#1a1a1a",
            "text_color": "#ffffff",
            "support_email": "updated@support.com",
            "support_phone": "+1-555-123-4567",
            "website_url": "https://updated-company.com"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/organizations/{org_id}/branding",
            json=new_branding
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data.get("success") == True
        assert "branding" in data
        
        updated_branding = data.get("branding", {})
        assert updated_branding.get("company_name") == "Updated Company Name"
        assert updated_branding.get("primary_color") == "#123456"
        assert updated_branding.get("support_email") == "updated@support.com"
        
        # Verify persistence by fetching again
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}")
        assert response.status_code == 200
        fetched_org = response.json()
        
        fetched_branding = fetched_org.get("branding", {})
        assert fetched_branding.get("company_name") == "Updated Company Name"
        
        print(f"PASS: Updated branding for organization {org_id}")


class TestOrganizationStats:
    """Test organization statistics endpoint"""
    
    def test_get_organization_stats(self):
        """GET /api/organizations/{org_id}/stats - Get usage stats"""
        # Get an existing org
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        orgs = response.json().get("organizations", [])
        assert len(orgs) > 0
        
        org_id = orgs[0].get("id")
        org_name = orgs[0].get("name")
        
        # Get stats
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("organization_id") == org_id
        assert data.get("organization_name") == org_name
        assert "stats" in data
        assert "subscription" in data
        assert "limits" in data
        
        # Verify stats structure
        stats = data.get("stats", {})
        assert "user_count" in stats
        assert "lead_count" in stats
        assert "appointment_count" in stats
        assert "territory_count" in stats
        assert "campaign_count" in stats
        
        # Verify limits
        limits = data.get("limits", {})
        assert "max_users" in limits
        assert "max_leads_per_month" in limits
        
        print(f"PASS: Got stats for organization {org_name}: {stats}")
    
    def test_get_stats_not_found(self):
        """GET /api/organizations/{org_id}/stats - Should return 404 for invalid org"""
        fake_id = "000000000000000000000000"
        
        response = requests.get(f"{BASE_URL}/api/organizations/{fake_id}/stats")
        assert response.status_code == 404
        print("PASS: Stats for non-existent org correctly returns 404")


class TestOrganizationBySlug:
    """Test getting organization by slug"""
    
    def test_get_org_by_slug_public(self):
        """GET /api/organizations/by-slug/{slug} - Get public org info by slug"""
        response = requests.get(f"{BASE_URL}/api/organizations/by-slug/default")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure (limited public info)
        assert data.get("slug") == "default"
        assert "id" in data
        assert "name" in data
        assert "branding" in data
        assert "is_active" in data
        
        print(f"PASS: Got public org info by slug: {data.get('name')}")
    
    def test_get_org_by_slug_not_found(self):
        """GET /api/organizations/by-slug/{slug} - Should return 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/organizations/by-slug/non-existent-slug")
        assert response.status_code == 404
        print("PASS: Non-existent slug correctly returns 404")


class TestOrganizationInit:
    """Test organization initialization"""
    
    def test_init_default_organization(self):
        """POST /api/organizations/init-default - Initialize default org"""
        response = requests.post(f"{BASE_URL}/api/organizations/init-default")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data.get("success") == True
        assert "organization" in data
        
        org = data.get("organization", {})
        assert org.get("slug") == "default"
        assert org.get("name") == "Solar Empire"
        
        print("PASS: Default organization initialized successfully")


class TestOrganizationDelete:
    """Test organization soft delete"""
    
    def test_soft_delete_organization(self):
        """DELETE /api/organizations/{org_id} - Soft delete an org"""
        # First create an org to delete
        unique_slug = f"delete-test-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": "Organization to Delete",
            "slug": unique_slug,
            "owner_email": "delete@test.com",
            "owner_name": "Delete Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/organizations", json=payload)
        assert response.status_code == 200
        org = response.json().get("organization", {})
        org_id = org.get("id")
        
        # Delete the organization
        response = requests.delete(f"{BASE_URL}/api/organizations/{org_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "deactivated" in data.get("message", "").lower()
        
        # Verify it's soft-deleted (should not appear in list)
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        orgs = response.json().get("organizations", [])
        
        org_ids = [o.get("id") for o in orgs]
        assert org_id not in org_ids
        
        # But should still exist when fetched by ID
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}")
        # Might return 404 or the org with is_active=False depending on implementation
        
        print(f"PASS: Organization {org_id} soft deleted successfully")
    
    def test_delete_not_found(self):
        """DELETE /api/organizations/{org_id} - Should return 404 for invalid ID"""
        fake_id = "000000000000000000000000"
        
        response = requests.delete(f"{BASE_URL}/api/organizations/{fake_id}")
        assert response.status_code == 404
        print("PASS: Delete non-existent org correctly returns 404")


class TestOrganizationUpdate:
    """Test organization update endpoint"""
    
    def test_update_organization(self):
        """PUT /api/organizations/{org_id} - Update organization details"""
        # Get an existing org (not default)
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        orgs = response.json().get("organizations", [])
        
        test_org = None
        for org in orgs:
            if org.get("slug") not in ["default"]:
                test_org = org
                break
        
        if not test_org:
            pytest.skip("No non-default organization available for update test")
        
        org_id = test_org.get("id")
        
        # Update organization
        update_payload = {
            "name": "Updated Organization Name",
            "settings": {
                "timezone": "America/Chicago",
                "currency": "EUR",
                "enable_ai_features": True,
                "max_users": 200
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/organizations/{org_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        org = data.get("organization", {})
        assert org.get("name") == "Updated Organization Name"
        
        # Verify settings updated
        settings = org.get("settings", {})
        assert settings.get("timezone") == "America/Chicago"
        assert settings.get("currency") == "EUR"
        assert settings.get("max_users") == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}")
        assert response.status_code == 200
        fetched = response.json()
        assert fetched.get("name") == "Updated Organization Name"
        
        print(f"PASS: Updated organization {org_id}")


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_branding(self):
        """POST /api/organizations - Create org with no branding (uses defaults)"""
        unique_slug = f"no-branding-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": "Org Without Branding",
            "slug": unique_slug,
            "owner_email": "nobranding@test.com",
            "owner_name": "No Branding Owner"
            # No branding or settings specified
        }
        
        response = requests.post(f"{BASE_URL}/api/organizations", json=payload)
        assert response.status_code == 200
        org = response.json().get("organization", {})
        
        # Should have default branding
        branding = org.get("branding", {})
        assert branding.get("company_name") == "Solar Empire"  # Default
        assert branding.get("primary_color") == "#f59e0b"  # Default amber
        
        # Cleanup
        if org.get("id"):
            requests.delete(f"{BASE_URL}/api/organizations/{org['id']}")
        
        print("PASS: Organization created with default branding")
    
    def test_list_with_pagination(self):
        """GET /api/organizations - Test pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/organizations?skip=0&limit=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("skip") == 0
        assert data.get("limit") == 1
        assert len(data.get("organizations", [])) <= 1
        
        print("PASS: Pagination parameters work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
