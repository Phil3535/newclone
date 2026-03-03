"""
Elite Tools Phase 1 API Tests
Tests all 4 Elite Tools:
1. Deal Stacking Calculator - Federal + State + Utility rebates
2. Payment Calculator - Financing options
3. Live Proposal Builder - Generate/retrieve/list proposals
4. Upsell Recommender - AI-powered product recommendations

Supported States: CA, TX, FL, AZ, NY, NJ, MA, CO, NV, NC
Upsell Products: battery, ev_charger, pool_pump, smart_panel, heat_pump, insulation
"""

import pytest
import requests
import os
import uuid

# Use the production URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://solar-lead-monetize.preview.emergentagent.com').rstrip('/')


# ============== DEAL STACKING CALCULATOR TESTS ==============

class TestDealStackerStates:
    """Test GET /api/elite/deal-stacker/states endpoint"""
    
    def test_get_supported_states_returns_10_states(self):
        """Should return list of 10 supported states with incentive data"""
        response = requests.get(f"{BASE_URL}/api/elite/deal-stacker/states")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "states" in data, "Response should contain 'states' key"
        states = data["states"]
        
        # Should have exactly 10 states
        assert len(states) == 10, f"Expected 10 states, got {len(states)}"
        
        # Verify state structure and expected states
        state_codes = [s["code"] for s in states]
        expected_codes = ["CA", "TX", "FL", "AZ", "NY", "NJ", "MA", "CO", "NV", "NC"]
        for code in expected_codes:
            assert code in state_codes, f"Missing state: {code}"
        
        # Verify state data structure
        for state in states:
            assert "code" in state
            assert "name" in state
            assert "has_rebates" in state
            assert "has_tax_credits" in state
            assert "has_srecs" in state
            assert "avg_utility_rate" in state
            assert isinstance(state["has_rebates"], bool)
            assert isinstance(state["avg_utility_rate"], (int, float))
        
        print(f"✓ Retrieved {len(states)} states with incentive data")
        print(f"  States with rebates: {sum(1 for s in states if s['has_rebates'])}")
        print(f"  States with SRECs: {sum(1 for s in states if s['has_srecs'])}")


class TestDealStackerCalculate:
    """Test POST /api/elite/deal-stacker/calculate endpoint"""
    
    def test_calculate_california_basic_system(self):
        """Calculate incentives for a basic CA system without battery"""
        payload = {
            "system_cost": 30000,
            "system_size_kw": 8.5,
            "state": "CA",
            "annual_electric_bill": 3000,
            "is_battery_included": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "system_details" in data
        assert "incentives" in data
        assert "totals" in data
        assert "long_term_value" in data
        assert "utility_info" in data
        
        # Verify system details
        assert data["system_details"]["gross_cost"] == 30000
        assert data["system_details"]["system_size_kw"] == 8.5
        assert data["system_details"]["state"] == "CA"
        
        # Verify federal ITC (30%)
        incentives = data["incentives"]
        assert "federal" in incentives
        federal = incentives["federal"]
        assert len(federal) >= 1, "Should have federal ITC"
        
        federal_itc = federal[0]
        assert federal_itc["name"] == "Federal Solar Tax Credit (ITC)"
        assert federal_itc["amount"] == 9000, "30% of 30000 should be 9000"
        
        # Verify totals
        totals = data["totals"]
        assert totals["federal_incentives"] == 9000
        assert totals["net_system_cost"] < 30000, "Net cost should be less than gross"
        assert totals["savings_percentage"] > 0
        
        # Verify long term value
        ltv = data["long_term_value"]
        assert ltv["annual_electric_savings"] > 0
        assert ltv["twenty_five_year_savings"] > 0
        
        print(f"✓ CA basic system calculated successfully")
        print(f"  Gross cost: ${payload['system_cost']:,}")
        print(f"  Federal ITC: ${totals['federal_incentives']:,}")
        print(f"  Net cost: ${totals['net_system_cost']:,}")
        print(f"  Savings: {totals['savings_percentage']}%")
    
    def test_calculate_california_with_battery(self):
        """Calculate incentives for CA system WITH battery (SGIP eligible)"""
        payload = {
            "system_cost": 30000,
            "system_size_kw": 8.5,
            "state": "CA",
            "annual_electric_bill": 3000,
            "is_battery_included": True,
            "battery_cost": 15000
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        totals = data["totals"]
        
        # With battery, federal ITC should be 30% of (30000 + 15000)
        expected_federal = (30000 + 15000) * 0.30
        assert totals["federal_incentives"] == expected_federal, f"Expected {expected_federal}, got {totals['federal_incentives']}"
        
        # CA has SGIP battery rebate
        state_incentives = data["incentives"]["state"]
        sgip_found = any("SGIP" in s.get("name", "") for s in state_incentives)
        assert sgip_found, "CA with battery should get SGIP rebate"
        
        print(f"✓ CA battery system includes SGIP rebate")
        print(f"  Total incentives: ${totals['total_incentives']:,}")
    
    def test_calculate_texas_with_utility_rebate(self):
        """Calculate TX incentives - should include property tax exemption"""
        payload = {
            "system_cost": 25000,
            "system_size_kw": 7.5,
            "state": "TX",
            "utility_company": "Austin Energy",
            "annual_electric_bill": 2400
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # TX has property tax exemption in "other"
        other = data["incentives"]["other"]
        exemption_found = any("Property Tax" in o.get("name", "") for o in other)
        assert exemption_found, "TX should have property tax exemption"
        
        # With Austin Energy utility, should get utility rebate
        state = data["incentives"]["state"]
        austin_rebate = any("Austin" in s.get("name", "") for s in state)
        assert austin_rebate, "Austin Energy customer should get utility rebate"
        
        print(f"✓ TX incentives include utility rebate and property tax exemption")
    
    def test_calculate_new_jersey_srecs(self):
        """NJ should include SREC earnings in calculations"""
        payload = {
            "system_cost": 28000,
            "system_size_kw": 8.0,
            "state": "NJ",
            "annual_electric_bill": 2800
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # NJ should have SRECs
        other = data["incentives"]["other"]
        srec_found = any("SREC" in o.get("name", "") for o in other)
        assert srec_found, "NJ should include SREC-II incentives"
        
        print(f"✓ NJ incentives include SREC-II program")
    
    def test_calculate_new_york_state_tax_credit(self):
        """NY should include state tax credit (25% up to $5000)"""
        payload = {
            "system_cost": 30000,
            "system_size_kw": 8.5,
            "state": "NY",
            "annual_electric_bill": 3600
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # NY has state tax credit
        state = data["incentives"]["state"]
        ny_credit = any("NY State Tax Credit" in s.get("name", "") for s in state)
        assert ny_credit, "NY should include state tax credit"
        
        # Should be capped at $5000
        for incentive in state:
            if "NY State Tax Credit" in incentive.get("name", ""):
                assert incentive["amount"] <= 5000, "NY state credit should be capped at $5000"
        
        print(f"✓ NY state tax credit calculated (capped at $5000)")
    
    def test_calculate_unsupported_state_returns_federal_only(self):
        """Unsupported state should still get federal ITC"""
        payload = {
            "system_cost": 20000,
            "system_size_kw": 6.0,
            "state": "WA",  # Not in the 10 supported states
            "annual_electric_bill": 2000
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Should still get federal ITC
        assert data["totals"]["federal_incentives"] == 6000  # 30% of 20000
        
        # State name should be "Other"
        assert data["system_details"]["state_name"] == "Other"
        
        print(f"✓ Unsupported state returns federal ITC only")
    
    def test_calculate_all_10_states(self):
        """Test calculation works for all 10 supported states"""
        states = ["CA", "TX", "FL", "AZ", "NY", "NJ", "MA", "CO", "NV", "NC"]
        
        for state in states:
            payload = {
                "system_cost": 25000,
                "system_size_kw": 7.5,
                "state": state,
                "annual_electric_bill": 2500
            }
            
            response = requests.post(f"{BASE_URL}/api/elite/deal-stacker/calculate", json=payload)
            assert response.status_code == 200, f"Failed for state {state}"
            
            data = response.json()
            assert data["system_details"]["state"] == state
            assert data["totals"]["federal_incentives"] == 7500  # 30% of 25000
        
        print(f"✓ All 10 states calculate correctly")


# ============== PAYMENT CALCULATOR TESTS ==============

class TestPaymentCalculator:
    """Test POST /api/elite/payment-calculator/calculate endpoint"""
    
    def test_calculate_basic_payment(self):
        """Calculate monthly payment with default terms"""
        payload = {
            "system_cost": 30000,
            "down_payment": 0,
            "loan_term_years": 25,
            "interest_rate": 6.99,
            "incentives_applied": 9000  # After federal ITC
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/payment-calculator/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "loan_details" in data
        assert "financing_options" in data
        assert "recommendation" in data
        
        # Verify loan details
        loan = data["loan_details"]
        assert loan["system_cost"] == 30000
        assert loan["down_payment"] == 0
        assert loan["incentives_applied"] == 9000
        assert loan["amount_financed"] == 21000  # 30000 - 9000
        
        # Should have multiple financing options
        options = data["financing_options"]
        assert len(options) >= 3, f"Expected 3+ financing options, got {len(options)}"
        
        # First option should be user's selected terms
        selected = options[0]
        assert selected["is_selected"] is True
        assert selected["term_years"] == 25
        assert selected["apr"] == 6.99
        assert selected["monthly_payment"] > 0
        
        # Verify payment math (principal * rate / (1 - (1+rate)^-n))
        assert selected["total_paid"] > 21000  # Should include interest
        assert selected["total_interest"] > 0
        
        print(f"✓ Payment calculated successfully")
        print(f"  Amount financed: ${loan['amount_financed']:,}")
        print(f"  Monthly payment: ${selected['monthly_payment']:,.2f}")
        print(f"  Total interest: ${selected['total_interest']:,.2f}")
    
    def test_calculate_with_down_payment(self):
        """Payment with down payment reduces financed amount"""
        payload = {
            "system_cost": 30000,
            "down_payment": 5000,
            "loan_term_years": 20,
            "interest_rate": 7.49,
            "incentives_applied": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/payment-calculator/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        loan = data["loan_details"]
        
        assert loan["amount_financed"] == 25000  # 30000 - 5000
        
        print(f"✓ Down payment correctly reduces financed amount")
    
    def test_financing_options_include_aggressive_and_low(self):
        """Should include aggressive payoff and low payment options"""
        payload = {
            "system_cost": 30000,
            "incentives_applied": 9000
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/payment-calculator/calculate", json=payload)
        assert response.status_code == 200
        
        options = response.json()["financing_options"]
        option_names = [o["name"] for o in options]
        
        assert "Aggressive Payoff" in option_names, "Should include aggressive payoff option"
        assert "Low Monthly Payment" in option_names, "Should include low payment option"
        
        # Aggressive should have shorter term and lower interest
        aggressive = next(o for o in options if o["name"] == "Aggressive Payoff")
        assert aggressive["term_years"] == 12
        assert aggressive["apr"] < 7
        
        # Low payment should have longer term
        low = next(o for o in options if o["name"] == "Low Monthly Payment")
        assert low["term_years"] == 20
        
        print(f"✓ Multiple financing options available")
    
    def test_same_as_cash_for_smaller_systems(self):
        """Systems under $50k should have same-as-cash option"""
        payload = {
            "system_cost": 25000,
            "incentives_applied": 7500  # 17500 financed
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/payment-calculator/calculate", json=payload)
        assert response.status_code == 200
        
        options = response.json()["financing_options"]
        sac = [o for o in options if "Same-as-Cash" in o["name"]]
        
        assert len(sac) > 0, "Small systems should have same-as-cash option"
        assert sac[0]["apr"] == 0
        assert sac[0]["total_interest"] == 0
        
        print(f"✓ Same-as-cash option available for smaller systems")


# ============== PROPOSAL BUILDER TESTS ==============

class TestProposalBuilder:
    """Test proposal generation, retrieval, and listing"""
    
    @pytest.fixture
    def proposal_payload(self):
        """Standard proposal request payload"""
        return {
            "customer_name": "TEST_John Smith",
            "customer_address": "123 Solar St, San Diego, CA 92101",
            "customer_email": "test@example.com",
            "customer_phone": "(555) 123-4567",
            "system_size_kw": 8.5,
            "panel_count": 20,
            "system_cost": 30000,
            "monthly_production_kwh": 1100,
            "annual_savings": 3000,
            "roof_type": "Asphalt Shingle",
            "panel_brand": "REC Alpha Pure",
            "inverter_type": "Enphase IQ8+",
            "warranty_years": 25,
            "include_battery": False,
            "state": "CA",
            "notes": "Customer prefers south-facing installation"
        }
    
    def test_generate_proposal_creates_complete_document(self, proposal_payload):
        """POST /api/elite/proposal/generate should create full proposal"""
        response = requests.post(f"{BASE_URL}/api/elite/proposal/generate", json=proposal_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify proposal ID
        assert "id" in data
        assert len(data["id"]) == 36  # UUID format
        
        # Verify timestamps
        assert "created_at" in data
        assert "valid_until" in data
        
        # Verify customer section
        customer = data["customer"]
        assert customer["name"] == proposal_payload["customer_name"]
        assert customer["address"] == proposal_payload["customer_address"]
        assert customer["email"] == proposal_payload["customer_email"]
        
        # Verify system design section
        design = data["system_design"]
        assert design["size_kw"] == 8.5
        assert design["panel_count"] == 20
        assert design["panel_brand"] == "REC Alpha Pure"
        assert design["monthly_production_kwh"] == 1100
        assert design["annual_production_kwh"] == 1100 * 12
        
        # Verify pricing section includes incentives
        pricing = data["pricing"]
        assert pricing["gross_cost"] == 30000
        assert pricing["net_cost"] < 30000  # After incentives
        assert "incentives" in pricing
        assert pricing["incentives"]["federal_incentives"] == 9000  # 30% of 30000
        
        # Verify financing options are included
        assert "financing" in data
        assert len(data["financing"]) >= 3
        
        # Verify savings calculations
        savings = data["savings"]
        assert savings["annual_savings"] == 3000
        assert savings["monthly_savings"] == 250  # 3000/12
        assert savings["payback_years"] > 0
        
        # Verify environmental impact
        env = data["environmental_impact"]
        assert env["co2_offset_lbs_per_year"] > 0
        assert env["trees_equivalent"] > 0
        
        # Verify next steps
        assert "next_steps" in data
        assert len(data["next_steps"]) == 6
        
        # Verify company info
        company = data["company_info"]
        assert company["name"] == "Solar Empire"
        
        print(f"✓ Proposal generated successfully")
        print(f"  ID: {data['id']}")
        print(f"  Customer: {customer['name']}")
        print(f"  Net cost: ${pricing['net_cost']:,}")
        
        return data["id"]
    
    def test_generate_proposal_with_battery(self, proposal_payload):
        """Proposal with battery should include battery details"""
        proposal_payload["include_battery"] = True
        proposal_payload["battery_size_kwh"] = 13.5
        
        response = requests.post(f"{BASE_URL}/api/elite/proposal/generate", json=proposal_payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Battery should be included in system design
        battery = data["system_design"]["battery"]
        assert battery is not None
        assert battery["included"] is True
        assert battery["size_kwh"] == 13.5
        
        print(f"✓ Proposal with battery generated")
    
    def test_retrieve_proposal_by_id(self, proposal_payload):
        """GET /api/elite/proposal/{id} should retrieve saved proposal"""
        # First create a proposal
        create_response = requests.post(f"{BASE_URL}/api/elite/proposal/generate", json=proposal_payload)
        assert create_response.status_code == 200
        proposal_id = create_response.json()["id"]
        
        # Now retrieve it
        get_response = requests.get(f"{BASE_URL}/api/elite/proposal/{proposal_id}")
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        data = get_response.json()
        assert data["id"] == proposal_id
        assert data["customer"]["name"] == proposal_payload["customer_name"]
        
        print(f"✓ Proposal retrieved successfully by ID")
    
    def test_retrieve_nonexistent_proposal_returns_404(self):
        """GET /api/elite/proposal/{id} with invalid ID should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/elite/proposal/{fake_id}")
        assert response.status_code == 404
        
        print(f"✓ 404 returned for nonexistent proposal")
    
    def test_list_proposals(self, proposal_payload):
        """GET /api/elite/proposals should return recent proposals"""
        # Create a proposal first
        requests.post(f"{BASE_URL}/api/elite/proposal/generate", json=proposal_payload)
        
        # List proposals
        response = requests.get(f"{BASE_URL}/api/elite/proposals")
        assert response.status_code == 200
        
        data = response.json()
        assert "proposals" in data
        proposals = data["proposals"]
        
        assert len(proposals) >= 1, "Should have at least 1 proposal"
        
        # Find a recently created proposal (has all expected fields)
        recent_with_customer = [p for p in proposals if "customer" in p]
        assert len(recent_with_customer) >= 1, "Should have at least 1 proposal with customer data"
        
        # Verify list contains summary fields
        recent = recent_with_customer[0]
        assert "id" in recent
        assert "customer" in recent
        assert "created_at" in recent
        
        print(f"✓ Listed {len(proposals)} proposals ({len(recent_with_customer)} with full data)")
    
    def test_list_proposals_with_limit(self):
        """GET /api/elite/proposals?limit=5 should limit results"""
        response = requests.get(f"{BASE_URL}/api/elite/proposals?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["proposals"]) <= 5
        
        print(f"✓ Proposal listing respects limit parameter")


# ============== UPSELL RECOMMENDER TESTS ==============

class TestUpsellProducts:
    """Test GET /api/elite/upsell/products endpoint"""
    
    def test_get_all_upsell_products(self):
        """Should return all 6 upsell product categories"""
        response = requests.get(f"{BASE_URL}/api/elite/upsell/products")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        products = data["products"]
        
        # Should have all 6 product categories
        expected_products = ["battery", "ev_charger", "pool_pump", "smart_panel", "heat_pump", "insulation"]
        for prod in expected_products:
            assert prod in products, f"Missing product category: {prod}"
        
        # Verify battery structure
        battery = products["battery"]
        assert "name" in battery
        assert "brands" in battery
        assert "benefits" in battery
        assert len(battery["brands"]) >= 3
        
        # Verify EV charger
        ev = products["ev_charger"]
        assert len(ev["brands"]) >= 3
        
        print(f"✓ Retrieved all {len(products)} upsell product categories")
        print(f"  Products: {', '.join(products.keys())}")


class TestUpsellRecommend:
    """Test POST /api/elite/upsell/recommend endpoint"""
    
    def test_recommend_for_basic_customer(self):
        """Basic customer should get battery recommendation"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 3000,
            "has_ev": False,
            "has_pool": False,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "customer_profile" in data
        assert "recommendations" in data
        assert "bundle_summary" in data
        assert "sales_tip" in data
        
        # Verify customer profile echoed back
        profile = data["customer_profile"]
        assert profile["system_size_kw"] == 8.5
        assert profile["annual_bill"] == 3000
        
        # Should have at least battery recommendation
        recs = data["recommendations"]
        assert len(recs) >= 1
        
        # Battery should be recommended for customers without one
        battery_rec = [r for r in recs if r["product"] == "battery"]
        assert len(battery_rec) > 0, "Should recommend battery for customer without one"
        
        # Verify recommendation structure
        rec = battery_rec[0]
        assert "priority" in rec
        assert "priority_label" in rec
        assert "recommended_option" in rec
        assert "benefits" in rec
        assert "why_for_you" in rec
        
        print(f"✓ Basic customer gets {len(recs)} recommendations")
    
    def test_recommend_high_priority_for_outage_concerns(self):
        """Customer with outage concerns should get HIGH priority battery"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 3000,
            "has_ev": False,
            "has_pool": False,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": True  # Key flag
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        battery = next((r for r in recs if r["product"] == "battery"), None)
        
        assert battery is not None
        assert battery["priority"] >= 80, "Battery should be high priority for outage concerns"
        assert battery["priority_label"] == "HIGH"
        assert any("outage" in reason.lower() for reason in battery["why_for_you"])
        
        print(f"✓ Outage concerns trigger HIGH priority battery (priority={battery['priority']})")
    
    def test_recommend_ev_charger_for_ev_owner(self):
        """EV owner should get HIGH priority EV charger"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 3000,
            "has_ev": True,  # Key flag
            "has_pool": False,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        ev_rec = next((r for r in recs if r["product"] == "ev_charger"), None)
        
        assert ev_rec is not None, "EV owner should get EV charger recommendation"
        assert ev_rec["priority_label"] == "HIGH"
        assert ev_rec["monthly_value"] > 0
        
        print(f"✓ EV owner gets HIGH priority charger recommendation")
    
    def test_recommend_pool_pump_for_pool_owner(self):
        """Pool owner should get pool pump recommendation"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 4000,
            "has_ev": False,
            "has_pool": True,  # Key flag
            "current_battery": False,
            "state": "AZ",
            "outage_concerns": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        pool_rec = next((r for r in recs if r["product"] == "pool_pump"), None)
        
        assert pool_rec is not None, "Pool owner should get pool pump recommendation"
        assert pool_rec["priority_label"] == "HIGH"
        
        print(f"✓ Pool owner gets pool pump recommendation")
    
    def test_recommend_smart_panel_for_large_home(self):
        """Large home (>2500 sqft) should get smart panel recommendation"""
        payload = {
            "system_size_kw": 10,
            "annual_electric_bill": 4500,
            "has_ev": False,
            "has_pool": False,
            "home_size_sqft": 3500,  # Large home
            "current_battery": False,
            "state": "TX",
            "outage_concerns": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        panel_rec = next((r for r in recs if r["product"] == "smart_panel"), None)
        
        assert panel_rec is not None, "Large home should get smart panel recommendation"
        
        print(f"✓ Large home gets smart panel recommendation")
    
    def test_recommend_heat_pump_for_high_bill(self):
        """High bill (>$3600/year) should get heat pump recommendation"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 5000,  # High bill
            "has_ev": False,
            "has_pool": False,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": False
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        hp_rec = next((r for r in recs if r["product"] == "heat_pump"), None)
        
        assert hp_rec is not None, "High bill customer should get heat pump recommendation"
        assert hp_rec["incentives_available"] is True
        
        print(f"✓ High bill customer gets heat pump recommendation")
    
    def test_no_battery_rec_if_already_has_battery(self):
        """Customer with battery should NOT get battery recommendation"""
        payload = {
            "system_size_kw": 8.5,
            "annual_electric_bill": 3000,
            "has_ev": False,
            "has_pool": False,
            "current_battery": True,  # Already has battery
            "state": "CA",
            "outage_concerns": True
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        battery_rec = [r for r in recs if r["product"] == "battery"]
        
        assert len(battery_rec) == 0, "Should NOT recommend battery if customer already has one"
        
        print(f"✓ No battery recommendation for existing battery owner")
    
    def test_bundle_summary_calculations(self):
        """Bundle summary should calculate total values correctly"""
        payload = {
            "system_size_kw": 10,
            "annual_electric_bill": 5000,
            "has_ev": True,
            "has_pool": True,
            "home_size_sqft": 3000,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": True
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        bundle = data["bundle_summary"]
        
        assert bundle["total_products"] == len(data["recommendations"])
        assert bundle["total_monthly_savings"] > 0
        assert bundle["annual_value"] == round(bundle["total_monthly_savings"] * 12, 2)
        
        print(f"✓ Bundle summary: {bundle['total_products']} products, ${bundle['annual_value']}/year value")
    
    def test_recommendations_sorted_by_priority(self):
        """Recommendations should be sorted by priority (highest first)"""
        payload = {
            "system_size_kw": 10,
            "annual_electric_bill": 5000,
            "has_ev": True,
            "has_pool": True,
            "current_battery": False,
            "state": "CA",
            "outage_concerns": True
        }
        
        response = requests.post(f"{BASE_URL}/api/elite/upsell/recommend", json=payload)
        assert response.status_code == 200
        
        recs = response.json()["recommendations"]
        priorities = [r["priority"] for r in recs]
        
        assert priorities == sorted(priorities, reverse=True), "Recommendations should be sorted by priority"
        
        print(f"✓ Recommendations correctly sorted by priority")


# Run all tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
