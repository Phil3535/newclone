"""
Test Legal Agreement API Endpoints
Tests for the mandatory legal agreement feature including:
- POST /api/legal/accept - Record user acceptance
- GET /api/legal/status/{user_id} - Check acceptance status
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://empire-sales-suite.preview.emergentagent.com').rstrip('/')

class TestLegalAgreementAPI:
    """Legal Agreement endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test-legal-{uuid.uuid4().hex[:8]}"
        self.test_agreements = ["terms", "privacy", "nda", "acceptable_use"]
        yield
        # Cleanup would happen here if needed
    
    def test_health_check(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_accept_legal_agreements_success(self):
        """Test successfully accepting legal agreements"""
        payload = {
            "user_id": self.test_user_id,
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": self.test_agreements,
            "version": "1.0"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True
        assert "message" in data
        assert "accepted" in data["message"].lower()
        print(f"✓ Legal acceptance recorded for user: {self.test_user_id}")
    
    def test_get_legal_status_after_acceptance(self):
        """Test getting legal status after accepting agreements - CREATE then GET pattern"""
        # First CREATE - accept the agreements
        accept_payload = {
            "user_id": self.test_user_id,
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": self.test_agreements,
            "version": "1.0"
        }
        
        accept_response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=accept_payload,
            headers={"Content-Type": "application/json"}
        )
        assert accept_response.status_code == 200
        
        # Then GET to verify persistence
        response = requests.get(f"{BASE_URL}/api/legal/status/{self.test_user_id}")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions - verify data was persisted
        data = response.json()
        assert data["accepted"] == True, f"Expected accepted=True, got {data}"
        assert "accepted_at" in data
        assert data["version"] == "1.0"
        assert "agreements" in data
        assert set(data["agreements"]) == set(self.test_agreements)
        print(f"✓ Legal status verified for user: {self.test_user_id}")
    
    def test_get_legal_status_non_existent_user(self):
        """Test getting legal status for user who hasn't accepted"""
        non_existent_user = f"non-existent-{uuid.uuid4().hex[:8]}"
        
        response = requests.get(f"{BASE_URL}/api/legal/status/{non_existent_user}")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert data["accepted"] == False
        print(f"✓ Non-existent user correctly returns accepted=False")
    
    def test_accept_with_partial_agreements(self):
        """Test accepting with only some agreements"""
        partial_user = f"test-partial-{uuid.uuid4().hex[:8]}"
        
        # Accept with only 2 agreements
        payload = {
            "user_id": partial_user,
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": ["terms", "privacy"],  # Missing nda and acceptable_use
            "version": "1.0"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        
        # Verify partial acceptance was stored
        status_response = requests.get(f"{BASE_URL}/api/legal/status/{partial_user}")
        data = status_response.json()
        assert data["accepted"] == True
        assert len(data["agreements"]) == 2
        print("✓ Partial agreements acceptance recorded correctly")
    
    def test_accept_with_empty_agreements(self):
        """Test accepting with empty agreements list"""
        empty_user = f"test-empty-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "user_id": empty_user,
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": [],
            "version": "1.0"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should still accept (backend doesn't validate agreement list)
        assert response.status_code == 200
        print("✓ Empty agreements list handled")
    
    def test_accept_with_missing_user_id(self):
        """Test accepting without user_id"""
        payload = {
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": self.test_agreements,
            "version": "1.0"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Backend accepts null user_id (may want to validate in production)
        assert response.status_code == 200
        print("✓ Missing user_id handled (accepted with null)")
    
    def test_multiple_acceptances_same_user(self):
        """Test user accepting agreements multiple times"""
        multi_user = f"test-multi-{uuid.uuid4().hex[:8]}"
        
        # First acceptance
        payload1 = {
            "user_id": multi_user,
            "accepted_at": "2026-01-01T00:00:00.000Z",
            "agreements": ["terms", "privacy"],
            "version": "1.0"
        }
        requests.post(f"{BASE_URL}/api/legal/accept", json=payload1)
        
        # Second acceptance with updated agreements
        payload2 = {
            "user_id": multi_user,
            "accepted_at": "2026-02-01T00:00:00.000Z",
            "agreements": self.test_agreements,
            "version": "1.1"
        }
        response = requests.post(f"{BASE_URL}/api/legal/accept", json=payload2)
        
        assert response.status_code == 200
        
        # Get status - should return first acceptance (find_one behavior)
        status_response = requests.get(f"{BASE_URL}/api/legal/status/{multi_user}")
        data = status_response.json()
        assert data["accepted"] == True
        print("✓ Multiple acceptances handled")


class TestLegalAgreementEndpointsIntegration:
    """Integration tests for legal agreement feature"""
    
    def test_full_acceptance_flow(self):
        """Test complete flow: check status -> accept -> verify status"""
        flow_user = f"test-flow-{uuid.uuid4().hex[:8]}"
        
        # Step 1: Check initial status (should be false)
        initial_response = requests.get(f"{BASE_URL}/api/legal/status/{flow_user}")
        assert initial_response.status_code == 200
        initial_data = initial_response.json()
        assert initial_data["accepted"] == False
        print(f"Step 1: Initial status = not accepted")
        
        # Step 2: Accept all agreements
        accept_payload = {
            "user_id": flow_user,
            "accepted_at": datetime.utcnow().isoformat(),
            "agreements": ["terms", "privacy", "nda", "acceptable_use"],
            "version": "1.0"
        }
        accept_response = requests.post(
            f"{BASE_URL}/api/legal/accept",
            json=accept_payload
        )
        assert accept_response.status_code == 200
        assert accept_response.json()["success"] == True
        print(f"Step 2: Agreements accepted")
        
        # Step 3: Verify status changed
        final_response = requests.get(f"{BASE_URL}/api/legal/status/{flow_user}")
        assert final_response.status_code == 200
        final_data = final_response.json()
        assert final_data["accepted"] == True
        assert final_data["version"] == "1.0"
        assert set(final_data["agreements"]) == {"terms", "privacy", "nda", "acceptable_use"}
        print(f"Step 3: Status verified = accepted")
        print("✓ Full acceptance flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
