"""
Phase 5 Game-Changer Features API Tests
Tests 6 patent-strengthening features:
1. AI Sentiment Detection During Calls
2. Solar Panel Degradation Predictor
3. Neighborhood Viral Effect Tracker
4. Dynamic Pricing AI
5. AR Roof Visualizer
6. Smart Contract Blockchain Logging + Verification
"""

import pytest
import requests
import os
from datetime import datetime
import uuid

# Use localhost for testing as per environment setup
BASE_URL = "http://localhost:8001"


class TestHealthCheck:
    """Verify API is running before Phase 5 tests"""
    
    def test_health_endpoint(self):
        """Test that the API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestSentimentAnalysis:
    """Test AI Sentiment Detection During Calls endpoint"""
    
    def test_sentiment_analysis_basic(self):
        """Test sentiment analysis with basic transcript"""
        payload = {
            "call_id": f"test-call-{uuid.uuid4().hex[:8]}",
            "transcript_segment": "I'm really interested in solar panels. How much would it cost for my home? The savings sound great!",
            "timestamp_seconds": 120.5,
            "rep_id": "test-rep-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/sentiment-analysis", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "call_id" in data
        assert data["call_id"] == payload["call_id"]
        assert "overall_sentiment" in data
        assert data["overall_sentiment"] in ["positive", "negative", "neutral"]
        assert "sentiment_score" in data
        assert 0 <= data["sentiment_score"] <= 1
        assert "emotions" in data
        assert "buying_signals" in data
        assert "risk_indicators" in data
        assert "real_time_coaching" in data
        assert "predicted_outcome" in data
        assert "close_probability" in data
        print(f"✓ Sentiment analysis returned: {data['overall_sentiment']} (score: {data['sentiment_score']})")
    
    def test_sentiment_analysis_negative_signals(self):
        """Test sentiment analysis with hesitation indicators"""
        payload = {
            "call_id": f"test-call-{uuid.uuid4().hex[:8]}",
            "transcript_segment": "I'm not sure about this. It seems expensive. Maybe I'll think about it. We got a quote from another company.",
            "timestamp_seconds": 300.0,
            "rep_id": "test-rep-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/sentiment-analysis", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Should detect risk indicators
        assert "risk_indicators" in data
        assert len(data["risk_indicators"]) > 0, "Should detect risk indicators in negative transcript"
        print(f"✓ Detected {len(data['risk_indicators'])} risk indicators")
    
    def test_sentiment_analysis_buying_signals(self):
        """Test sentiment analysis detects buying signals"""
        payload = {
            "call_id": f"test-call-{uuid.uuid4().hex[:8]}",
            "transcript_segment": "When can you start the installation? What's the price? My neighbor has solar and loves it.",
            "timestamp_seconds": 180.0
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/sentiment-analysis", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "buying_signals" in data
        assert len(data["buying_signals"]) > 0, "Should detect buying signals"
        
        # Verify buying signal structure
        for signal in data["buying_signals"]:
            assert "signal_type" in signal
            assert "confidence" in signal
            assert "recommended_action" in signal
        print(f"✓ Detected {len(data['buying_signals'])} buying signals")
    
    def test_sentiment_emotions_structure(self):
        """Test that emotions metrics are properly structured"""
        payload = {
            "call_id": f"test-call-{uuid.uuid4().hex[:8]}",
            "transcript_segment": "Yes, I'm excited about going solar!",
            "timestamp_seconds": 60.0
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/sentiment-analysis", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        emotions = data["emotions"]
        
        # Verify all emotion metrics exist and are in valid range
        expected_emotions = ["excitement", "hesitation", "interest", "frustration", "confidence", "trust"]
        for emotion in expected_emotions:
            assert emotion in emotions, f"Missing emotion: {emotion}"
            assert 0 <= emotions[emotion] <= 100, f"Emotion {emotion} out of range: {emotions[emotion]}"
        print(f"✓ All emotion metrics present and valid")


class TestDegradationPredictor:
    """Test Solar Panel Degradation Predictor endpoint"""
    
    def test_degradation_prediction_basic(self):
        """Test degradation prediction with standard input"""
        payload = {
            "address": "123 Solar Lane, Phoenix, AZ 85001",
            "installation_date": "2020-06-15",
            "panel_manufacturer": "SunPower",
            "original_capacity_kw": 8.5
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/degradation-predictor", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "installation_id" in data
        assert "current_efficiency" in data
        assert "degradation_rate_annual" in data
        assert "years_since_install" in data
        assert "predicted_replacement_year" in data
        assert "remaining_lifespan_years" in data
        assert "environmental_factors" in data
        assert "maintenance_recommendations" in data
        assert "replacement_opportunity" in data
        assert "financial_impact" in data
        
        # Verify calculations make sense
        assert 50 <= data["current_efficiency"] <= 100, "Efficiency should be 50-100%"
        assert data["years_since_install"] > 0, "Years since install should be positive"
        print(f"✓ Degradation prediction: {data['current_efficiency']}% efficiency, {data['remaining_lifespan_years']} years remaining")
    
    def test_degradation_prediction_tier1_manufacturer(self):
        """Test with tier 1 premium manufacturer (should have lower degradation)"""
        payload = {
            "address": "456 Sunshine Blvd, Scottsdale, AZ",
            "installation_date": "2019-03-01",
            "panel_manufacturer": "LG",
            "original_capacity_kw": 10.0,
            "panel_model": "NeON R"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/degradation-predictor", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["environmental_factors"]["manufacturer_tier"] == "Tier 1 (Premium)"
        assert data["degradation_rate_annual"] < 0.5, "Premium panels should have <0.5% annual degradation"
        print(f"✓ Tier 1 manufacturer recognized, degradation rate: {data['degradation_rate_annual']}%")
    
    def test_degradation_prediction_tier3_manufacturer(self):
        """Test with budget tier manufacturer"""
        payload = {
            "address": "789 Economy St, Mesa, AZ",
            "installation_date": "2018-01-15",
            "panel_manufacturer": "Generic Brand",
            "original_capacity_kw": 6.0
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/degradation-predictor", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["environmental_factors"]["manufacturer_tier"] == "Tier 3 (Budget)"
        print(f"✓ Tier 3 manufacturer recognized")
    
    def test_degradation_maintenance_recommendations(self):
        """Test that maintenance recommendations are provided"""
        payload = {
            "address": "111 Test St, Phoenix, AZ",
            "installation_date": "2017-06-01",
            "panel_manufacturer": "Canadian Solar",
            "original_capacity_kw": 7.5
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/degradation-predictor", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["maintenance_recommendations"]) > 0, "Should provide maintenance recommendations"
        assert "replacement_opportunity" in data
        assert "is_replacement_candidate" in data["replacement_opportunity"]
        print(f"✓ Received {len(data['maintenance_recommendations'])} maintenance recommendations")


class TestViralEffectTracker:
    """Test Neighborhood Viral Effect Tracker endpoint"""
    
    def test_viral_effect_basic(self):
        """Test viral effect tracking with basic input"""
        payload = {
            "installation_address": "123 Viral Test Lane, Phoenix, AZ 85001",
            "installation_date": "2024-06-15",
            "customer_id": f"test-cust-{uuid.uuid4().hex[:8]}",
            "zip_code": "85001"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/viral-effect-tracker", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "installation_id" in data
        assert "social_proof_radius_meters" in data
        assert "viral_coefficient" in data
        assert "influenced_neighbors" in data
        assert "neighborhood_penetration" in data
        assert "referral_chain_depth" in data
        assert "estimated_future_conversions" in data
        assert "viral_score" in data
        assert "recommendations" in data
        assert "heatmap_data" in data
        print(f"✓ Viral effect tracked: coefficient {data['viral_coefficient']}, score {data['viral_score']}")
    
    def test_viral_effect_with_referral(self):
        """Test viral effect with referral chain"""
        payload = {
            "installation_address": "456 Referral Ave, Scottsdale, AZ",
            "installation_date": "2024-08-01",
            "customer_id": f"test-cust-{uuid.uuid4().hex[:8]}",
            "zip_code": "85251",
            "referred_by": "neighbor-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/viral-effect-tracker", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["referral_chain_depth"] >= 1
        print(f"✓ Referral chain depth: {data['referral_chain_depth']}")
    
    def test_viral_effect_neighbor_data(self):
        """Test that neighbor influence data is properly structured"""
        payload = {
            "installation_address": "789 Neighbor St, Mesa, AZ",
            "installation_date": "2024-07-01",
            "customer_id": f"test-cust-{uuid.uuid4().hex[:8]}",
            "zip_code": "85201"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/viral-effect-tracker", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        neighbors = data["influenced_neighbors"]
        assert len(neighbors) > 0, "Should have neighbor data"
        
        for neighbor in neighbors:
            assert "address" in neighbor
            assert "distance_meters" in neighbor
            assert "status" in neighbor
            assert neighbor["status"] in ["lead", "prospect", "customer", "declined", "not_contacted"]
            assert "influenced_by_installation" in neighbor
        print(f"✓ {len(neighbors)} neighbors tracked in viral analysis")
    
    def test_viral_effect_heatmap_data(self):
        """Test that heatmap data is provided for visualization"""
        payload = {
            "installation_address": "100 Heatmap Dr, Gilbert, AZ",
            "installation_date": "2024-09-01",
            "customer_id": f"test-cust-{uuid.uuid4().hex[:8]}",
            "zip_code": "85233"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/viral-effect-tracker", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        heatmap = data["heatmap_data"]
        assert "center" in heatmap
        assert "hot_zones" in heatmap
        assert len(heatmap["hot_zones"]) > 0
        print(f"✓ Heatmap data with {len(heatmap['hot_zones'])} hot zones")


class TestDynamicPricing:
    """Test Dynamic Pricing AI endpoint"""
    
    def test_dynamic_pricing_basic(self):
        """Test dynamic pricing with minimal input"""
        payload = {
            "system_size_kw": 8.0,
            "zip_code": "85001",
            "financing_type": "loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "recommended_price" in data
        assert "price_range" in data
        assert "pricing_breakdown" in data
        assert "competitive_position" in data
        assert "discount_available" in data
        assert "financing_options" in data
        assert "price_confidence" in data
        assert "market_analysis" in data
        assert "negotiation_floor" in data
        
        # Verify price range logic
        assert data["price_range"]["minimum"] <= data["price_range"]["recommended"]
        assert data["price_range"]["recommended"] <= data["price_range"]["maximum"]
        assert data["negotiation_floor"] <= data["recommended_price"]
        print(f"✓ Dynamic pricing: ${data['recommended_price']:,.2f} (range: ${data['price_range']['minimum']:,.2f} - ${data['price_range']['maximum']:,.2f})")
    
    def test_dynamic_pricing_with_credit_score(self):
        """Test pricing adjustments based on credit score"""
        payload = {
            "system_size_kw": 10.0,
            "customer_credit_score": 780,
            "zip_code": "85251",
            "financing_type": "loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        adjustments = data["pricing_breakdown"]["adjustments"]
        assert "excellent_credit_discount" in adjustments, "Excellent credit should get discount"
        assert adjustments["excellent_credit_discount"] < 0, "Discount should be negative"
        print(f"✓ Excellent credit discount applied: ${adjustments['excellent_credit_discount']:,.2f}")
    
    def test_dynamic_pricing_cash_discount(self):
        """Test cash payment discount"""
        payload = {
            "system_size_kw": 7.5,
            "zip_code": "85001",
            "financing_type": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        adjustments = data["pricing_breakdown"]["adjustments"]
        assert "cash_discount" in adjustments, "Cash should get discount"
        assert adjustments["cash_discount"] < 0, "Cash discount should be negative"
        print(f"✓ Cash discount applied: ${adjustments['cash_discount']:,.2f}")
    
    def test_dynamic_pricing_competitor_match(self):
        """Test competitor price matching"""
        payload = {
            "system_size_kw": 8.0,
            "zip_code": "85001",
            "competitor_quote": 18000.0,
            "financing_type": "loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # If our base price was higher, should apply competitor match
        adjustments = data["pricing_breakdown"]["adjustments"]
        print(f"✓ Pricing with competitor quote considered, position: {data['competitive_position']}")
    
    def test_dynamic_pricing_referral_discount(self):
        """Test referral discount"""
        payload = {
            "system_size_kw": 9.0,
            "zip_code": "85201",
            "is_referral": True,
            "financing_type": "loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        adjustments = data["pricing_breakdown"]["adjustments"]
        assert "referral_discount" in adjustments, "Referrals should get discount"
        print(f"✓ Referral discount applied: ${adjustments['referral_discount']:,.2f}")
    
    def test_dynamic_pricing_financing_options(self):
        """Test that financing options are provided"""
        payload = {
            "system_size_kw": 10.0,
            "zip_code": "85001",
            "financing_type": "loan"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["financing_options"]) >= 2, "Should provide multiple financing options"
        for option in data["financing_options"]:
            assert "type" in option
        print(f"✓ {len(data['financing_options'])} financing options provided")


class TestARVisualizer:
    """Test AR Roof Visualizer endpoint"""
    
    def test_ar_visualizer_basic(self):
        """Test AR visualization with basic input"""
        payload = {
            "latitude": 33.4484,
            "longitude": -112.0740,
            "system_size_kw": 8.0,
            "panel_type": "standard"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "session_id" in data
        assert "panel_layout" in data
        assert "total_panels" in data
        assert "coverage_area_sqft" in data
        assert "estimated_production_kwh" in data
        assert "ar_overlay_data" in data
        assert "sun_path_visualization" in data
        assert "shade_analysis" in data
        assert "installation_preview" in data
        
        # Verify panel count calculation (8kW / 400W panels = 20 panels)
        assert data["total_panels"] == 20, f"Expected 20 panels for 8kW system, got {data['total_panels']}"
        print(f"✓ AR visualization: {data['total_panels']} panels, {data['estimated_production_kwh']} kWh/year")
    
    def test_ar_visualizer_panel_layout(self):
        """Test panel layout generation"""
        payload = {
            "latitude": 33.5,
            "longitude": -111.9,
            "system_size_kw": 6.0,
            "panel_type": "all_black"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        panels = data["panel_layout"]
        assert len(panels) == data["total_panels"], "Panel layout should match total panels"
        
        for panel in panels:
            assert "panel_id" in panel
            assert "x_position" in panel
            assert "y_position" in panel
            assert "width_m" in panel
            assert "height_m" in panel
        print(f"✓ Panel layout generated with {len(panels)} panels")
    
    def test_ar_visualizer_overlay_data(self):
        """Test AR overlay data for rendering"""
        payload = {
            "latitude": 33.4,
            "longitude": -112.0,
            "system_size_kw": 10.0,
            "roof_pitch_degrees": 25,
            "roof_azimuth": 180
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        overlay = data["ar_overlay_data"]
        assert "anchor_point" in overlay
        assert overlay["anchor_point"]["latitude"] == 33.4
        assert overlay["anchor_point"]["longitude"] == -112.0
        assert "grid_dimensions" in overlay
        assert "panel_color" in overlay
        print(f"✓ AR overlay data complete with anchor point and grid dimensions")
    
    def test_ar_visualizer_sun_path(self):
        """Test sun path visualization data"""
        payload = {
            "latitude": 40.7128,  # New York latitude
            "longitude": -74.0060,
            "system_size_kw": 7.0
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        sun_path = data["sun_path_visualization"]
        assert "summer_solstice" in sun_path
        assert "winter_solstice" in sun_path
        assert "optimal_tilt" in sun_path
        print(f"✓ Sun path data: optimal tilt {sun_path['optimal_tilt']}°")
    
    def test_ar_visualizer_shade_analysis(self):
        """Test shade analysis output"""
        payload = {
            "latitude": 33.4484,
            "longitude": -112.0740,
            "system_size_kw": 9.0,
            "panel_type": "bifacial"
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        shade = data["shade_analysis"]
        assert "morning_shade_impact" in shade
        assert "afternoon_shade_impact" in shade
        assert "annual_shade_loss" in shade
        assert "recommendations" in shade
        print(f"✓ Shade analysis: annual loss {shade['annual_shade_loss']}")


class TestBlockchainContract:
    """Test Smart Contract Blockchain Logging and Verification endpoints"""
    
    def test_blockchain_contract_creation(self):
        """Test creating a blockchain contract record"""
        contract_id = f"TEST-contract-{uuid.uuid4().hex[:8]}"
        payload = {
            "contract_id": contract_id,
            "customer_name": "Test Customer",
            "customer_address": "123 Test St, Phoenix, AZ 85001",
            "system_details": {
                "size_kw": 8.0,
                "panels": 20,
                "inverter": "Enphase IQ8+"
            },
            "price": 24000.00,
            "terms": {
                "warranty_years": 25,
                "financing": "20-year loan",
                "installation_date": "2026-04-15"
            },
            "signatures": {
                "customer": "test-sig-customer-abc123",
                "company": "test-sig-company-xyz789"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "transaction_id" in data
        assert "contract_hash" in data
        assert "blockchain_record" in data
        assert "verification_url" in data
        assert "immutable_proof" in data
        assert "legal_compliance" in data
        assert "dispute_resolution_data" in data
        
        # Verify blockchain record structure
        blockchain = data["blockchain_record"]
        assert "block_hash" in blockchain
        assert "previous_hash" in blockchain
        assert "merkle_root" in blockchain
        assert "nonce" in blockchain
        assert "timestamp" in blockchain
        
        # Verify legal compliance
        assert data["legal_compliance"]["esign_compliant"] == True
        assert data["legal_compliance"]["ueta_compliant"] == True
        
        print(f"✓ Blockchain contract created: tx_id {data['transaction_id']}")
        
        # Return transaction_id for verification test
        return data["transaction_id"]
    
    def test_blockchain_contract_verification(self):
        """Test verifying a blockchain contract record"""
        # First create a contract
        contract_id = f"TEST-verify-{uuid.uuid4().hex[:8]}"
        create_payload = {
            "contract_id": contract_id,
            "customer_name": "Verify Test Customer",
            "customer_address": "456 Verify Ave, Scottsdale, AZ",
            "system_details": {"size_kw": 10.0, "panels": 25},
            "price": 30000.00,
            "terms": {"warranty_years": 25},
            "signatures": {"customer": "sig-verify-cust", "company": "sig-verify-co"}
        }
        
        create_response = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=create_payload)
        assert create_response.status_code == 200, f"Contract creation failed: {create_response.text}"
        
        transaction_id = create_response.json()["transaction_id"]
        
        # Now verify the contract
        verify_response = requests.get(f"{BASE_URL}/api/advanced/verify-contract/{transaction_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        data = verify_response.json()
        assert data["verified"] == True
        assert data["transaction_id"] == transaction_id
        assert "contract_hash" in data
        assert "block_hash" in data
        assert data["integrity_status"] == "intact"
        assert data["chain_verified"] == True
        print(f"✓ Contract verified successfully: {transaction_id}")
    
    def test_blockchain_contract_not_found(self):
        """Test verification of non-existent contract"""
        fake_tx_id = "tx-nonexistent-12345678"
        
        response = requests.get(f"{BASE_URL}/api/advanced/verify-contract/{fake_tx_id}")
        assert response.status_code == 404, f"Should return 404 for non-existent contract"
        print(f"✓ Non-existent contract properly returns 404")
    
    def test_blockchain_hash_uniqueness(self):
        """Test that different contracts produce different hashes"""
        # Create first contract
        payload1 = {
            "contract_id": f"TEST-hash1-{uuid.uuid4().hex[:8]}",
            "customer_name": "Hash Test Customer 1",
            "customer_address": "100 Hash St, Phoenix, AZ",
            "system_details": {"size_kw": 5.0},
            "price": 15000.00,
            "terms": {},
            "signatures": {"customer": "sig1", "company": "sig1"}
        }
        
        response1 = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=payload1)
        assert response1.status_code == 200
        hash1 = response1.json()["contract_hash"]
        
        # Create second different contract
        payload2 = {
            "contract_id": f"TEST-hash2-{uuid.uuid4().hex[:8]}",
            "customer_name": "Hash Test Customer 2",
            "customer_address": "200 Hash St, Phoenix, AZ",
            "system_details": {"size_kw": 6.0},
            "price": 18000.00,
            "terms": {},
            "signatures": {"customer": "sig2", "company": "sig2"}
        }
        
        response2 = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=payload2)
        assert response2.status_code == 200
        hash2 = response2.json()["contract_hash"]
        
        assert hash1 != hash2, "Different contracts should produce different hashes"
        print(f"✓ Hash uniqueness verified: {hash1[:16]}... != {hash2[:16]}...")
    
    def test_blockchain_legal_compliance_fields(self):
        """Test that all legal compliance fields are present"""
        payload = {
            "contract_id": f"TEST-legal-{uuid.uuid4().hex[:8]}",
            "customer_name": "Legal Test Customer",
            "customer_address": "789 Legal Blvd, Mesa, AZ",
            "system_details": {"size_kw": 8.0},
            "price": 24000.00,
            "terms": {"warranty": 25, "financing": "loan"},
            "signatures": {"customer": "legal-sig-cust", "company": "legal-sig-co"}
        }
        
        response = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        legal = data["legal_compliance"]
        
        assert "esign_compliant" in legal
        assert "ueta_compliant" in legal
        assert "record_retention_years" in legal
        assert legal["record_retention_years"] == 25
        assert "audit_trail_complete" in legal
        assert "non_repudiation" in legal
        print(f"✓ All legal compliance fields verified")


class TestPhase5Integration:
    """Integration tests combining multiple Phase 5 features"""
    
    def test_full_sales_flow(self):
        """Test a complete sales flow using Phase 5 features"""
        customer_id = f"test-flow-{uuid.uuid4().hex[:8]}"
        
        # Step 1: Analyze customer sentiment during call
        sentiment_payload = {
            "call_id": f"call-{customer_id}",
            "transcript_segment": "I'm really interested! How soon can we schedule an installation?",
            "timestamp_seconds": 180.0
        }
        sentiment_response = requests.post(f"{BASE_URL}/api/advanced/sentiment-analysis", json=sentiment_payload)
        assert sentiment_response.status_code == 200
        sentiment_data = sentiment_response.json()
        
        # Step 2: Generate AR visualization for their roof
        ar_payload = {
            "latitude": 33.4484,
            "longitude": -112.0740,
            "system_size_kw": 8.0
        }
        ar_response = requests.post(f"{BASE_URL}/api/advanced/ar-visualizer", json=ar_payload)
        assert ar_response.status_code == 200
        ar_data = ar_response.json()
        
        # Step 3: Get dynamic pricing
        pricing_payload = {
            "system_size_kw": 8.0,
            "zip_code": "85001",
            "financing_type": "loan"
        }
        pricing_response = requests.post(f"{BASE_URL}/api/advanced/dynamic-pricing", json=pricing_payload)
        assert pricing_response.status_code == 200
        pricing_data = pricing_response.json()
        
        # Step 4: Track viral effect for this installation
        viral_payload = {
            "installation_address": "123 Integration Test St, Phoenix, AZ",
            "installation_date": "2026-03-01",
            "customer_id": customer_id,
            "zip_code": "85001"
        }
        viral_response = requests.post(f"{BASE_URL}/api/advanced/viral-effect-tracker", json=viral_payload)
        assert viral_response.status_code == 200
        
        # Step 5: Create blockchain contract
        contract_payload = {
            "contract_id": f"TEST-flow-{customer_id}",
            "customer_name": "Integration Test Customer",
            "customer_address": "123 Integration Test St, Phoenix, AZ",
            "system_details": {"size_kw": 8.0, "panels": ar_data["total_panels"]},
            "price": pricing_data["recommended_price"],
            "terms": {"warranty": 25},
            "signatures": {"customer": "flow-sig-cust", "company": "flow-sig-co"}
        }
        contract_response = requests.post(f"{BASE_URL}/api/advanced/blockchain-contract", json=contract_payload)
        assert contract_response.status_code == 200
        contract_data = contract_response.json()
        
        # Step 6: Verify the contract
        verify_response = requests.get(f"{BASE_URL}/api/advanced/verify-contract/{contract_data['transaction_id']}")
        assert verify_response.status_code == 200
        assert verify_response.json()["verified"] == True
        
        print(f"✓ Full sales flow completed successfully")
        print(f"  - Sentiment: {sentiment_data['overall_sentiment']} (score: {sentiment_data['sentiment_score']})")
        print(f"  - AR Panels: {ar_data['total_panels']}")
        print(f"  - Price: ${pricing_data['recommended_price']:,.2f}")
        print(f"  - Contract TX: {contract_data['transaction_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
