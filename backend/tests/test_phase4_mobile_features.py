"""
Phase 4 Mobile-First API Tests
Tests for: Voice Notes, Business Card Scanner, NFC/Bluetooth Card Exchange, Offline Sync
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestHealthEndpoint:
    """Health check endpoint test"""
    
    def test_health_check(self):
        """Test /api/health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("✓ Health check passed")


class TestVoiceNotes:
    """Voice Notes API tests - POST and GET endpoints"""
    
    def test_create_voice_note(self):
        """Test POST /api/advanced/voice/notes - Create voice note"""
        payload = {
            "content": f"Test voice note created at {datetime.now().isoformat()}",
            "created_at": datetime.now().isoformat(),
            "lead_id": f"test-lead-{uuid.uuid4().hex[:8]}",
            "rep_id": f"test-rep-{uuid.uuid4().hex[:8]}"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/voice/notes",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["content"] == payload["content"]
        assert data["created_at"] == payload["created_at"]
        assert data["lead_id"] == payload["lead_id"]
        assert data["rep_id"] == payload["rep_id"]
        
        # Validate ID format (should be real ID, not offline)
        assert data["id"].startswith("vn-")
        assert "offline" not in data["id"], "Note should be saved to database, not offline"
        
        print(f"✓ Voice note created with ID: {data['id']}")
        return data["id"]
    
    def test_create_voice_note_minimal(self):
        """Test POST /api/advanced/voice/notes with minimal data"""
        payload = {
            "content": "Minimal voice note test",
            "created_at": datetime.now().isoformat()
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/voice/notes",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == payload["content"]
        print("✓ Minimal voice note created")
    
    def test_get_voice_notes_list(self):
        """Test GET /api/advanced/voice/notes - Get voice notes list"""
        response = requests.get(f"{BASE_URL}/api/advanced/voice/notes")
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} voice notes")
    
    def test_get_voice_notes_with_rep_filter(self):
        """Test GET /api/advanced/voice/notes with rep_id filter"""
        test_rep_id = f"filter-test-rep-{uuid.uuid4().hex[:8]}"
        
        # First create a note with specific rep_id
        create_payload = {
            "content": "Note for filter test",
            "created_at": datetime.now().isoformat(),
            "rep_id": test_rep_id
        }
        requests.post(f"{BASE_URL}/api/advanced/voice/notes", json=create_payload)
        
        # Now query with filter
        response = requests.get(f"{BASE_URL}/api/advanced/voice/notes?rep_id={test_rep_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved voice notes with rep_id filter: {len(data)} notes")
    
    def test_get_voice_notes_with_limit(self):
        """Test GET /api/advanced/voice/notes with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/advanced/voice/notes?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        print(f"✓ Retrieved voice notes with limit: {len(data)} notes")


class TestBusinessCardScanner:
    """Business Card Scanner API tests - MOCKED endpoint"""
    
    def test_scan_business_card(self):
        """Test POST /api/advanced/scan-business-card - OCR scanning (MOCKED)"""
        payload = {
            "image": "base64_encoded_image_data_here"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/scan-business-card",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert data["success"] is True
        assert "contact" in data
        assert "confidence" in data
        assert data["confidence"] >= 0.9  # Mocked returns high confidence
        
        # Validate contact structure
        contact = data["contact"]
        assert "name" in contact
        assert "company" in contact
        assert "title" in contact
        assert "phone" in contact
        assert "email" in contact
        assert "address" in contact
        assert "website" in contact
        
        print(f"✓ Business card scanned: {contact['name']} - {contact['company']} (MOCKED)")
    
    def test_scan_business_card_response_format(self):
        """Test business card scan returns proper contact fields"""
        response = requests.post(
            f"{BASE_URL}/api/advanced/scan-business-card",
            json={"image": "test_image_data"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check raw_text field
        assert "raw_text" in data
        print(f"✓ Raw text extraction: {data.get('raw_text', 'N/A')}")


class TestCardExchange:
    """NFC/Bluetooth Card Exchange API tests - MOCKED endpoint"""
    
    def test_bluetooth_card_exchange(self):
        """Test POST /api/advanced/card-exchange - Bluetooth exchange (MOCKED)"""
        payload = {
            "sender_name": "Test User",
            "sender_company": "Test Solar Company",
            "sender_title": "Sales Representative",
            "sender_phone": "(555) 123-4567",
            "sender_email": "test@testsolar.com",
            "exchange_method": "bluetooth"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/card-exchange",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response
        assert data["success"] is True
        assert "exchange_id" in data
        assert data["method"] == "bluetooth"
        assert "timestamp" in data
        assert data["contact_saved"] is True  # Should be True when DB is working
        
        # Validate exchange_id format (real ID, not offline)
        assert data["exchange_id"].startswith("exc-")
        print(f"✓ Bluetooth card exchange: {data['exchange_id']} (MOCKED)")
    
    def test_nfc_card_exchange(self):
        """Test POST /api/advanced/card-exchange - NFC exchange (MOCKED)"""
        payload = {
            "sender_name": "NFC Test User",
            "sender_company": "NFC Solar Inc",
            "sender_title": "Manager",
            "sender_phone": "(555) 987-6543",
            "sender_email": "nfc@nfcsolar.com",
            "exchange_method": "nfc"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/card-exchange",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["method"] == "nfc"
        print(f"✓ NFC card exchange: {data['exchange_id']} (MOCKED)")
    
    def test_qr_card_exchange(self):
        """Test POST /api/advanced/card-exchange - QR code exchange (MOCKED)"""
        payload = {
            "sender_name": "QR Test User",
            "sender_company": "QR Solar LLC",
            "sender_title": "Technician",
            "sender_phone": "(555) 456-7890",
            "sender_email": "qr@qrsolar.com",
            "exchange_method": "qr"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/card-exchange",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["method"] == "qr"
        print(f"✓ QR card exchange: {data['exchange_id']} (MOCKED)")


class TestOfflineSync:
    """Offline Data Synchronization API tests"""
    
    def test_sync_empty_actions(self):
        """Test POST /api/advanced/offline/sync with no pending actions"""
        payload = {
            "pending_actions": [],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["synced_count"] == 0
        assert data["failed_count"] == 0
        assert "sync_timestamp" in data
        assert "server_updates" in data
        print("✓ Empty sync completed successfully")
    
    def test_sync_create_lead_action(self):
        """Test offline sync with CREATE_LEAD action"""
        payload = {
            "pending_actions": [
                {
                    "type": "CREATE_LEAD",
                    "data": {
                        "name": f"Offline Test Lead {uuid.uuid4().hex[:8]}",
                        "email": "offlinelead@test.com",
                        "phone": "(555) 111-2222",
                        "address": "123 Offline St, Phoenix, AZ 85001"
                    }
                }
            ],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["synced_count"] == 1
        assert data["failed_count"] == 0
        print(f"✓ CREATE_LEAD synced: {data['synced_count']} actions")
    
    def test_sync_create_appointment_action(self):
        """Test offline sync with CREATE_APPOINTMENT action"""
        payload = {
            "pending_actions": [
                {
                    "type": "CREATE_APPOINTMENT",
                    "data": {
                        "lead_name": f"Offline Appointment {uuid.uuid4().hex[:8]}",
                        "scheduled_time": "2026-02-15T14:00:00Z",
                        "address": "456 Sync Ave, Scottsdale, AZ 85251"
                    }
                }
            ],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["synced_count"] == 1
        print(f"✓ CREATE_APPOINTMENT synced: {data['synced_count']} actions")
    
    def test_sync_multiple_actions(self):
        """Test offline sync with multiple different actions"""
        payload = {
            "pending_actions": [
                {
                    "type": "CREATE_LEAD",
                    "data": {"name": "Multi Lead 1", "email": "multi1@test.com"}
                },
                {
                    "type": "CREATE_LEAD",
                    "data": {"name": "Multi Lead 2", "email": "multi2@test.com"}
                },
                {
                    "type": "CREATE_APPOINTMENT",
                    "data": {"lead_name": "Multi Appt", "scheduled_time": "2026-03-01T10:00:00Z"}
                }
            ],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["synced_count"] == 3
        assert data["failed_count"] == 0
        print(f"✓ Multiple actions synced: {data['synced_count']} actions, {data['failed_count']} failed")
    
    def test_sync_update_actions(self):
        """Test offline sync with UPDATE_LEAD and UPDATE_APPOINTMENT actions"""
        payload = {
            "pending_actions": [
                {
                    "type": "UPDATE_LEAD",
                    "data": {
                        "id": "existing-lead-123",
                        "updates": {"status": "contacted", "notes": "Updated via offline sync"}
                    }
                },
                {
                    "type": "UPDATE_APPOINTMENT",
                    "data": {
                        "id": "existing-appt-456",
                        "updates": {"status": "completed", "outcome": "Successful"}
                    }
                }
            ],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        # Updates may succeed or fail based on whether IDs exist
        print(f"✓ Update actions processed: {data['synced_count']} synced, {data['failed_count']} failed")
    
    def test_sync_unknown_action_type(self):
        """Test offline sync with unknown action type (should fail gracefully)"""
        payload = {
            "pending_actions": [
                {
                    "type": "UNKNOWN_ACTION_TYPE",
                    "data": {"foo": "bar"}
                }
            ],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": None
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Unknown action should be counted as failed, not cause 500 error
        assert data["success"] is True
        assert data["failed_count"] == 1
        print(f"✓ Unknown action type handled gracefully: {data['failed_count']} failed")
    
    def test_sync_with_last_sync_timestamp(self):
        """Test offline sync with last_sync parameter for server updates"""
        payload = {
            "pending_actions": [],
            "device_id": f"device-{uuid.uuid4().hex[:8]}",
            "last_sync": "2026-01-01T00:00:00Z"
        }
        response = requests.post(
            f"{BASE_URL}/api/advanced/offline/sync",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "server_updates" in data
        assert isinstance(data["server_updates"], list)
        print(f"✓ Sync with last_sync: {len(data['server_updates'])} server updates")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
