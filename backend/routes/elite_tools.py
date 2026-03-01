"""
Elite Tools - Phase 1 Features
1. Deal Stacking Calculator - Federal + State + Utility rebates
2. Live Proposal Builder - Generate PDF proposals
3. Payment Calculator - Monthly payment estimator
4. Upsell Recommender - AI-powered add-on suggestions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

router = APIRouter(prefix="/api/elite", tags=["elite-tools"])


# ============== DATA MODELS ==============

class DealStackingRequest(BaseModel):
    system_cost: float = Field(..., description="Total system cost before incentives")
    system_size_kw: float = Field(..., description="System size in kW")
    state: str = Field(..., description="US State code (e.g., CA, TX, FL)")
    utility_company: Optional[str] = None
    annual_electric_bill: Optional[float] = 12000
    is_battery_included: bool = False
    battery_cost: Optional[float] = 0

class PaymentCalculatorRequest(BaseModel):
    system_cost: float
    down_payment: float = 0
    loan_term_years: int = 25
    interest_rate: float = 6.99
    incentives_applied: float = 0

class ProposalRequest(BaseModel):
    customer_name: str
    customer_address: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    system_size_kw: float
    panel_count: int
    system_cost: float
    monthly_production_kwh: float
    annual_savings: float
    roof_type: str = "Asphalt Shingle"
    panel_brand: str = "Tier 1 Monocrystalline"
    inverter_type: str = "String Inverter"
    warranty_years: int = 25
    include_battery: bool = False
    battery_size_kwh: Optional[float] = None
    state: str = "CA"
    notes: Optional[str] = None

class UpsellRequest(BaseModel):
    system_size_kw: float
    annual_electric_bill: float
    has_ev: bool = False
    has_pool: bool = False
    home_size_sqft: Optional[int] = None
    current_battery: bool = False
    state: str = "CA"
    outage_concerns: bool = False


# ============== INCENTIVE DATA ==============

# Federal Tax Credit (ITC) - 30% through 2032
FEDERAL_ITC_RATE = 0.30

# State incentives database (simplified - real data would come from DSIRE)
STATE_INCENTIVES = {
    "CA": {
        "name": "California",
        "rebates": [
            {"name": "SGIP (Battery)", "type": "rebate", "amount_per_kwh": 150, "requires_battery": True, "max_amount": 10000},
            {"name": "NEM 3.0 Export Credits", "type": "credit", "description": "Net metering credits for excess production"},
        ],
        "tax_credits": [],
        "avg_utility_rate": 0.30,
        "utilities": ["PG&E", "SCE", "SDG&E", "LADWP"]
    },
    "TX": {
        "name": "Texas",
        "rebates": [
            {"name": "Austin Energy Rebate", "type": "rebate", "amount_per_watt": 0.50, "max_amount": 4000, "utility": "Austin Energy"},
            {"name": "CPS Energy Rebate", "type": "rebate", "amount_per_watt": 0.60, "max_amount": 5000, "utility": "CPS Energy"},
        ],
        "tax_credits": [
            {"name": "Property Tax Exemption", "type": "exemption", "description": "100% property tax exemption on solar value"}
        ],
        "avg_utility_rate": 0.12,
        "utilities": ["Oncor", "CenterPoint", "Austin Energy", "CPS Energy"]
    },
    "FL": {
        "name": "Florida",
        "rebates": [],
        "tax_credits": [
            {"name": "Sales Tax Exemption", "type": "exemption", "description": "No sales tax on solar equipment"},
            {"name": "Property Tax Exemption", "type": "exemption", "description": "100% property tax exemption on solar value"}
        ],
        "avg_utility_rate": 0.13,
        "utilities": ["FPL", "Duke Energy", "Tampa Electric", "JEA"]
    },
    "AZ": {
        "name": "Arizona",
        "rebates": [
            {"name": "APS Rebate", "type": "rebate", "amount_per_kw": 100, "max_amount": 1000, "utility": "APS"},
        ],
        "tax_credits": [
            {"name": "State Tax Credit", "type": "credit", "rate": 0.25, "max_amount": 1000},
            {"name": "Property Tax Exemption", "type": "exemption", "description": "100% property tax exemption"}
        ],
        "avg_utility_rate": 0.13,
        "utilities": ["APS", "SRP", "TEP"]
    },
    "NY": {
        "name": "New York",
        "rebates": [
            {"name": "NY-Sun Incentive", "type": "rebate", "amount_per_watt": 0.20, "max_amount": 5000},
        ],
        "tax_credits": [
            {"name": "NY State Tax Credit", "type": "credit", "rate": 0.25, "max_amount": 5000}
        ],
        "avg_utility_rate": 0.21,
        "utilities": ["Con Edison", "National Grid", "PSEG LI", "Central Hudson"]
    },
    "NJ": {
        "name": "New Jersey",
        "rebates": [],
        "tax_credits": [
            {"name": "Sales Tax Exemption", "type": "exemption", "description": "No sales tax on solar"},
            {"name": "Property Tax Exemption", "type": "exemption", "description": "100% property tax exemption"}
        ],
        "srecs": {"name": "SREC-II", "value_per_mwh": 85, "description": "Earn ~$85 per MWh produced"},
        "avg_utility_rate": 0.17,
        "utilities": ["PSE&G", "JCP&L", "Atlantic City Electric"]
    },
    "MA": {
        "name": "Massachusetts",
        "rebates": [],
        "tax_credits": [
            {"name": "State Tax Credit", "type": "credit", "rate": 0.15, "max_amount": 1000}
        ],
        "srecs": {"name": "SMART Program", "value_per_kwh": 0.08, "description": "Performance-based incentive"},
        "avg_utility_rate": 0.25,
        "utilities": ["National Grid", "Eversource", "Unitil"]
    },
    "CO": {
        "name": "Colorado",
        "rebates": [
            {"name": "Xcel Energy Rebate", "type": "rebate", "amount_per_watt": 0.50, "max_amount": 4500, "utility": "Xcel Energy"},
        ],
        "tax_credits": [],
        "avg_utility_rate": 0.14,
        "utilities": ["Xcel Energy", "Black Hills Energy", "Colorado Springs Utilities"]
    },
    "NV": {
        "name": "Nevada",
        "rebates": [],
        "tax_credits": [
            {"name": "Property Tax Exemption", "type": "exemption", "description": "100% property tax exemption"}
        ],
        "avg_utility_rate": 0.12,
        "utilities": ["NV Energy"]
    },
    "NC": {
        "name": "North Carolina",
        "rebates": [
            {"name": "Duke Energy Rebate", "type": "rebate", "amount_per_watt": 0.40, "max_amount": 6000, "utility": "Duke Energy"},
        ],
        "tax_credits": [],
        "avg_utility_rate": 0.11,
        "utilities": ["Duke Energy", "Dominion Energy"]
    }
}

# Default for states not in database
DEFAULT_STATE = {
    "name": "Other",
    "rebates": [],
    "tax_credits": [],
    "avg_utility_rate": 0.14,
    "utilities": []
}


# ============== DEAL STACKING CALCULATOR ==============

@router.post("/deal-stacker/calculate")
async def calculate_deal_stack(request: DealStackingRequest):
    """
    Calculate all available incentives stacked together
    Returns total savings breakdown: Federal + State + Utility + Other
    """
    state_data = STATE_INCENTIVES.get(request.state.upper(), DEFAULT_STATE)
    
    total_system_cost = request.system_cost + (request.battery_cost or 0)
    system_watts = request.system_size_kw * 1000
    
    incentives = {
        "federal": [],
        "state": [],
        "utility": [],
        "other": []
    }
    
    # 1. Federal ITC (30%)
    federal_itc = total_system_cost * FEDERAL_ITC_RATE
    incentives["federal"].append({
        "name": "Federal Solar Tax Credit (ITC)",
        "amount": round(federal_itc, 2),
        "type": "tax_credit",
        "description": f"30% of ${total_system_cost:,.0f} system cost",
        "how_to_claim": "Claim on IRS Form 5695 with your tax return"
    })
    
    # 2. State Rebates
    for rebate in state_data.get("rebates", []):
        amount = 0
        applicable = True
        
        # Check if utility-specific
        if rebate.get("utility") and request.utility_company:
            if rebate["utility"].lower() not in request.utility_company.lower():
                applicable = False
        
        # Check battery requirement
        if rebate.get("requires_battery") and not request.is_battery_included:
            applicable = False
        
        if applicable:
            if rebate.get("amount_per_watt"):
                amount = min(system_watts * rebate["amount_per_watt"], rebate.get("max_amount", 999999))
            elif rebate.get("amount_per_kw"):
                amount = min(request.system_size_kw * rebate["amount_per_kw"], rebate.get("max_amount", 999999))
            elif rebate.get("amount_per_kwh") and request.is_battery_included:
                battery_kwh = request.battery_cost / 500 if request.battery_cost else 13.5  # Estimate
                amount = min(battery_kwh * rebate["amount_per_kwh"], rebate.get("max_amount", 999999))
            
            if amount > 0:
                incentives["state"].append({
                    "name": rebate["name"],
                    "amount": round(amount, 2),
                    "type": "rebate",
                    "description": rebate.get("description", f"State rebate program"),
                    "how_to_claim": "Applied by installer or claim through state program"
                })
    
    # 3. State Tax Credits
    for credit in state_data.get("tax_credits", []):
        if credit["type"] == "credit" and credit.get("rate"):
            amount = min(total_system_cost * credit["rate"], credit.get("max_amount", 999999))
            incentives["state"].append({
                "name": credit["name"],
                "amount": round(amount, 2),
                "type": "tax_credit",
                "description": credit.get("description", f"{credit['rate']*100}% state tax credit"),
                "how_to_claim": "Claim on state tax return"
            })
        elif credit["type"] == "exemption":
            # Exemptions don't have direct dollar amounts but are valuable
            incentives["other"].append({
                "name": credit["name"],
                "amount": 0,
                "type": "exemption",
                "description": credit["description"],
                "value_note": "Ongoing savings - not a direct rebate"
            })
    
    # 4. SRECs (Solar Renewable Energy Credits)
    if state_data.get("srecs"):
        srec = state_data["srecs"]
        # Estimate 10-year SREC value based on production
        annual_production_mwh = request.system_size_kw * 1.4  # Rough estimate
        if srec.get("value_per_mwh"):
            ten_year_value = annual_production_mwh * srec["value_per_mwh"] * 10
            incentives["other"].append({
                "name": srec["name"],
                "amount": round(ten_year_value, 2),
                "type": "srec",
                "description": f"{srec['description']} (~${srec['value_per_mwh']}/MWh)",
                "value_note": "Estimated 10-year earnings based on production"
            })
        elif srec.get("value_per_kwh"):
            annual_kwh = request.system_size_kw * 1400
            annual_value = annual_kwh * srec["value_per_kwh"]
            incentives["other"].append({
                "name": srec["name"],
                "amount": round(annual_value * 10, 2),
                "type": "performance_incentive",
                "description": srec["description"],
                "value_note": f"~${annual_value:,.0f}/year for 10 years"
            })
    
    # Calculate totals
    federal_total = sum(i["amount"] for i in incentives["federal"])
    state_total = sum(i["amount"] for i in incentives["state"])
    utility_total = sum(i["amount"] for i in incentives["utility"])
    other_total = sum(i["amount"] for i in incentives["other"])
    
    grand_total = federal_total + state_total + utility_total + other_total
    net_cost = total_system_cost - grand_total
    
    # Calculate 25-year savings
    annual_bill = request.annual_electric_bill or 12000
    savings_rate = 0.85  # Assume 85% offset
    annual_savings = annual_bill * savings_rate
    twenty_five_year_savings = annual_savings * 25
    
    # Add utility rate escalation (3% per year average)
    escalated_savings = 0
    for year in range(25):
        escalated_savings += annual_savings * (1.03 ** year)
    
    return {
        "system_details": {
            "gross_cost": total_system_cost,
            "system_size_kw": request.system_size_kw,
            "state": request.state.upper(),
            "state_name": state_data["name"],
            "includes_battery": request.is_battery_included
        },
        "incentives": incentives,
        "totals": {
            "federal_incentives": round(federal_total, 2),
            "state_incentives": round(state_total, 2),
            "utility_incentives": round(utility_total, 2),
            "other_incentives": round(other_total, 2),
            "total_incentives": round(grand_total, 2),
            "net_system_cost": round(net_cost, 2),
            "savings_percentage": round((grand_total / total_system_cost) * 100, 1)
        },
        "long_term_value": {
            "annual_electric_savings": round(annual_savings, 2),
            "twenty_five_year_savings": round(escalated_savings, 2),
            "total_lifetime_benefit": round(grand_total + escalated_savings, 2),
            "roi_percentage": round(((escalated_savings + grand_total - net_cost) / net_cost) * 100, 1)
        },
        "utility_info": {
            "avg_rate_per_kwh": state_data["avg_utility_rate"],
            "common_utilities": state_data.get("utilities", [])
        }
    }


@router.get("/deal-stacker/states")
async def get_supported_states():
    """Get list of states with incentive data"""
    states = []
    for code, data in STATE_INCENTIVES.items():
        states.append({
            "code": code,
            "name": data["name"],
            "has_rebates": len(data.get("rebates", [])) > 0,
            "has_tax_credits": len(data.get("tax_credits", [])) > 0,
            "has_srecs": "srecs" in data,
            "avg_utility_rate": data["avg_utility_rate"]
        })
    return {"states": sorted(states, key=lambda x: x["name"])}


# ============== PAYMENT CALCULATOR ==============

@router.post("/payment-calculator/calculate")
async def calculate_monthly_payment(request: PaymentCalculatorRequest):
    """
    Calculate monthly loan payment with multiple financing options
    """
    principal = request.system_cost - request.down_payment - request.incentives_applied
    
    financing_options = []
    
    # Option 1: User's specified terms
    monthly_rate = (request.interest_rate / 100) / 12
    num_payments = request.loan_term_years * 12
    
    if monthly_rate > 0:
        monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    else:
        monthly_payment = principal / num_payments
    
    total_paid = monthly_payment * num_payments
    total_interest = total_paid - principal
    
    financing_options.append({
        "name": "Your Selected Terms",
        "term_years": request.loan_term_years,
        "apr": request.interest_rate,
        "monthly_payment": round(monthly_payment, 2),
        "total_paid": round(total_paid, 2),
        "total_interest": round(total_interest, 2),
        "is_selected": True
    })
    
    # Option 2: 12-year aggressive payoff
    term_12 = 12
    rate_12 = 5.99
    monthly_rate_12 = (rate_12 / 100) / 12
    num_payments_12 = term_12 * 12
    monthly_12 = principal * (monthly_rate_12 * (1 + monthly_rate_12)**num_payments_12) / ((1 + monthly_rate_12)**num_payments_12 - 1)
    
    financing_options.append({
        "name": "Aggressive Payoff",
        "term_years": 12,
        "apr": rate_12,
        "monthly_payment": round(monthly_12, 2),
        "total_paid": round(monthly_12 * num_payments_12, 2),
        "total_interest": round(monthly_12 * num_payments_12 - principal, 2),
        "savings_vs_selected": round(total_interest - (monthly_12 * num_payments_12 - principal), 2)
    })
    
    # Option 3: 20-year low payment
    term_20 = 20
    rate_20 = 7.49
    monthly_rate_20 = (rate_20 / 100) / 12
    num_payments_20 = term_20 * 12
    monthly_20 = principal * (monthly_rate_20 * (1 + monthly_rate_20)**num_payments_20) / ((1 + monthly_rate_20)**num_payments_20 - 1)
    
    financing_options.append({
        "name": "Low Monthly Payment",
        "term_years": 20,
        "apr": rate_20,
        "monthly_payment": round(monthly_20, 2),
        "total_paid": round(monthly_20 * num_payments_20, 2),
        "total_interest": round(monthly_20 * num_payments_20 - principal, 2)
    })
    
    # Option 4: Same-as-cash (0% for limited time)
    if principal <= 50000:
        term_sac = 18  # months
        monthly_sac = principal / term_sac
        financing_options.append({
            "name": "Same-as-Cash (18 months)",
            "term_years": 1.5,
            "apr": 0,
            "monthly_payment": round(monthly_sac, 2),
            "total_paid": round(principal, 2),
            "total_interest": 0,
            "note": "Must pay in full within 18 months"
        })
    
    return {
        "loan_details": {
            "system_cost": request.system_cost,
            "down_payment": request.down_payment,
            "incentives_applied": request.incentives_applied,
            "amount_financed": round(principal, 2)
        },
        "financing_options": financing_options,
        "recommendation": {
            "best_value": "Aggressive Payoff" if principal > 15000 else "Same-as-Cash (18 months)",
            "reason": "Minimizes total interest paid while keeping payments manageable"
        }
    }


# ============== LIVE PROPOSAL BUILDER ==============

@router.post("/proposal/generate")
async def generate_proposal(request: ProposalRequest):
    """
    Generate a professional solar proposal
    Returns structured data for PDF generation on frontend
    """
    proposal_id = str(uuid.uuid4())
    
    # Calculate deal stack for this proposal
    deal_stack = await calculate_deal_stack(DealStackingRequest(
        system_cost=request.system_cost,
        system_size_kw=request.system_size_kw,
        state=request.state,
        annual_electric_bill=request.annual_savings / 0.85,  # Reverse calculate
        is_battery_included=request.include_battery,
        battery_cost=request.battery_size_kwh * 500 if request.battery_size_kwh else 0
    ))
    
    # Calculate payment options
    payment_calc = await calculate_monthly_payment(PaymentCalculatorRequest(
        system_cost=request.system_cost,
        incentives_applied=deal_stack["totals"]["total_incentives"]
    ))
    
    # Build proposal sections
    proposal = {
        "id": proposal_id,
        "created_at": datetime.utcnow().isoformat(),
        "valid_until": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        
        "customer": {
            "name": request.customer_name,
            "address": request.customer_address,
            "email": request.customer_email,
            "phone": request.customer_phone
        },
        
        "system_design": {
            "size_kw": request.system_size_kw,
            "panel_count": request.panel_count,
            "panel_brand": request.panel_brand,
            "inverter_type": request.inverter_type,
            "roof_type": request.roof_type,
            "warranty_years": request.warranty_years,
            "monthly_production_kwh": request.monthly_production_kwh,
            "annual_production_kwh": request.monthly_production_kwh * 12,
            "battery": {
                "included": request.include_battery,
                "size_kwh": request.battery_size_kwh
            } if request.include_battery else None
        },
        
        "pricing": {
            "gross_cost": request.system_cost,
            "incentives": deal_stack["totals"],
            "net_cost": deal_stack["totals"]["net_system_cost"],
            "price_per_watt": round(request.system_cost / (request.system_size_kw * 1000), 2),
            "incentive_breakdown": deal_stack["incentives"]
        },
        
        "financing": payment_calc["financing_options"],
        
        "savings": {
            "annual_savings": request.annual_savings,
            "monthly_savings": round(request.annual_savings / 12, 2),
            "twenty_five_year_savings": deal_stack["long_term_value"]["twenty_five_year_savings"],
            "payback_years": round(deal_stack["totals"]["net_system_cost"] / request.annual_savings, 1),
            "roi_percentage": deal_stack["long_term_value"]["roi_percentage"]
        },
        
        "environmental_impact": {
            "co2_offset_lbs_per_year": round(request.monthly_production_kwh * 12 * 0.92, 0),
            "trees_equivalent": round(request.monthly_production_kwh * 12 * 0.92 / 48, 0),
            "cars_off_road_equivalent": round(request.monthly_production_kwh * 12 * 0.92 / 10000, 1),
            "homes_powered": round(request.monthly_production_kwh * 12 / 10500, 1)
        },
        
        "next_steps": [
            {"step": 1, "title": "Review & Sign", "description": "Review this proposal and sign to lock in pricing"},
            {"step": 2, "title": "Site Survey", "description": "Our team will conduct a detailed site assessment"},
            {"step": 3, "title": "Permitting", "description": "We handle all permits and utility paperwork"},
            {"step": 4, "title": "Installation", "description": "Professional installation in 1-2 days"},
            {"step": 5, "title": "Inspection", "description": "Final inspection and utility approval"},
            {"step": 6, "title": "Power On", "description": "Start generating clean energy and savings!"}
        ],
        
        "company_info": {
            "name": "Solar Empire",
            "tagline": "Your Territory. Your Power.",
            "phone": "(888) SOLAR-99",
            "email": "sales@solarempire.com",
            "website": "www.solarempire.com",
            "license": "CA License #1234567"
        },
        
        "notes": request.notes
    }
    
    # Save proposal to database
    await db.proposals.insert_one({
        **proposal,
        "_id": proposal_id
    })
    
    return proposal


@router.get("/proposal/{proposal_id}")
async def get_proposal(proposal_id: str):
    """Retrieve a saved proposal"""
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.get("/proposals")
async def list_proposals(limit: int = 20):
    """List recent proposals"""
    proposals = await db.proposals.find(
        {},
        {"_id": 0, "id": 1, "customer.name": 1, "customer.address": 1, 
         "system_design.size_kw": 1, "pricing.net_cost": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"proposals": proposals}


# ============== UPSELL RECOMMENDER ==============

UPSELL_PRODUCTS = {
    "battery": {
        "name": "Home Battery Storage",
        "brands": [
            {"name": "Tesla Powerwall 3", "capacity_kwh": 13.5, "price": 12000, "backup_hours": 10},
            {"name": "Enphase IQ Battery 5P", "capacity_kwh": 5, "price": 6000, "backup_hours": 4},
            {"name": "Franklin WholePower", "capacity_kwh": 13.6, "price": 14000, "backup_hours": 12}
        ],
        "benefits": [
            "Backup power during outages",
            "Store excess solar for night use",
            "Avoid peak utility rates",
            "Qualify for additional incentives"
        ]
    },
    "ev_charger": {
        "name": "EV Charging Station",
        "brands": [
            {"name": "Tesla Wall Connector", "power_kw": 11.5, "price": 1500},
            {"name": "ChargePoint Home Flex", "power_kw": 12, "price": 700},
            {"name": "Emporia Smart Charger", "power_kw": 9.6, "price": 500}
        ],
        "benefits": [
            "Charge your EV with free solar power",
            "Save $1,500+/year vs gas",
            "Smart scheduling for optimal charging",
            "Increase home value"
        ]
    },
    "smart_panel": {
        "name": "Smart Electrical Panel",
        "brands": [
            {"name": "Span Smart Panel", "price": 5500},
            {"name": "Lumin Smart Panel", "price": 4500}
        ],
        "benefits": [
            "Control every circuit from your phone",
            "Prioritize critical loads during outages",
            "Real-time energy monitoring",
            "No main panel upgrade needed"
        ]
    },
    "pool_pump": {
        "name": "Variable Speed Pool Pump",
        "brands": [
            {"name": "Pentair IntelliFlo", "price": 1500},
            {"name": "Hayward TriStar VS", "price": 1200}
        ],
        "benefits": [
            "Reduce pool energy use by 80%",
            "Run on solar during the day",
            "Quieter operation",
            "Extends equipment life"
        ]
    },
    "heat_pump": {
        "name": "Heat Pump HVAC",
        "brands": [
            {"name": "Mitsubishi Hyper Heat", "price": 15000},
            {"name": "Daikin Fit", "price": 12000},
            {"name": "Carrier Infinity", "price": 14000}
        ],
        "benefits": [
            "Heat AND cool with one system",
            "300-400% more efficient than gas",
            "Pairs perfectly with solar",
            "Qualifies for federal tax credit"
        ]
    },
    "insulation": {
        "name": "Home Insulation Upgrade",
        "options": [
            {"name": "Attic Insulation", "price": 2500},
            {"name": "Wall Insulation", "price": 4000},
            {"name": "Full Home Package", "price": 6000}
        ],
        "benefits": [
            "Reduce heating/cooling costs 20-30%",
            "Smaller solar system needed",
            "More comfortable home",
            "May qualify for utility rebates"
        ]
    }
}


@router.post("/upsell/recommend")
async def get_upsell_recommendations(request: UpsellRequest):
    """
    AI-powered upsell recommendations based on customer profile
    """
    recommendations = []
    priority_score = 0
    
    # 1. Battery Storage - High priority for outage concerns or high bills
    if not request.current_battery:
        battery_priority = 50
        battery_reasons = []
        
        if request.outage_concerns:
            battery_priority += 30
            battery_reasons.append("You mentioned power outage concerns")
        
        if request.state in ["CA", "TX", "FL"]:
            battery_priority += 15
            battery_reasons.append(f"{request.state} has frequent outages/storms")
        
        if request.annual_electric_bill > 3000:
            battery_priority += 10
            battery_reasons.append("High electric usage = more savings from storage")
        
        # Find best battery option
        battery = UPSELL_PRODUCTS["battery"]
        recommended_brand = battery["brands"][0]  # Default to Powerwall
        
        if request.system_size_kw < 6:
            recommended_brand = battery["brands"][1]  # Smaller system = smaller battery
        
        recommendations.append({
            "product": "battery",
            "name": battery["name"],
            "priority": battery_priority,
            "priority_label": "HIGH" if battery_priority > 70 else "MEDIUM" if battery_priority > 50 else "CONSIDER",
            "recommended_option": recommended_brand,
            "all_options": battery["brands"],
            "benefits": battery["benefits"],
            "why_for_you": battery_reasons if battery_reasons else ["Maximize your solar investment"],
            "monthly_value": round(request.annual_electric_bill * 0.15 / 12, 2),  # ~15% additional savings
            "incentives_available": request.state in ["CA", "NY", "MA"]
        })
    
    # 2. EV Charger - High priority if they have EV
    if request.has_ev:
        ev = UPSELL_PRODUCTS["ev_charger"]
        recommendations.append({
            "product": "ev_charger",
            "name": ev["name"],
            "priority": 85,
            "priority_label": "HIGH",
            "recommended_option": ev["brands"][1],  # ChargePoint is best value
            "all_options": ev["brands"],
            "benefits": ev["benefits"],
            "why_for_you": [
                "You own an EV - charge it FREE with solar!",
                "Average EV owner saves $1,500/year vs gas"
            ],
            "monthly_value": 125,
            "incentives_available": True
        })
    
    # 3. Pool Pump - If they have pool
    if request.has_pool:
        pool = UPSELL_PRODUCTS["pool_pump"]
        recommendations.append({
            "product": "pool_pump",
            "name": pool["name"],
            "priority": 75,
            "priority_label": "HIGH",
            "recommended_option": pool["brands"][0],
            "all_options": pool["brands"],
            "benefits": pool["benefits"],
            "why_for_you": [
                "Pool pumps use 2,500+ kWh/year",
                "Variable speed = 80% energy reduction",
                "Run during solar peak for FREE pool operation"
            ],
            "monthly_value": 50,
            "incentives_available": False
        })
    
    # 4. Smart Panel - Good for larger homes
    if (request.home_size_sqft and request.home_size_sqft > 2500) or request.outage_concerns:
        panel = UPSELL_PRODUCTS["smart_panel"]
        recommendations.append({
            "product": "smart_panel",
            "name": panel["name"],
            "priority": 60,
            "priority_label": "MEDIUM",
            "recommended_option": panel["brands"][0],
            "all_options": panel["brands"],
            "benefits": panel["benefits"],
            "why_for_you": [
                "Control your entire home from your phone",
                "Prioritize critical loads when battery is needed"
            ],
            "monthly_value": 30,
            "incentives_available": False
        })
    
    # 5. Heat Pump - For high bill customers
    if request.annual_electric_bill > 3600:
        hp = UPSELL_PRODUCTS["heat_pump"]
        recommendations.append({
            "product": "heat_pump",
            "name": hp["name"],
            "priority": 65,
            "priority_label": "MEDIUM",
            "recommended_option": hp["brands"][1],  # Daikin is good value
            "all_options": hp["brands"],
            "benefits": hp["benefits"],
            "why_for_you": [
                "Your high electric bill suggests HVAC opportunity",
                "Heat pumps are 3-4x more efficient than gas",
                "Qualifies for 30% federal tax credit"
            ],
            "monthly_value": round(request.annual_electric_bill * 0.25 / 12, 2),
            "incentives_available": True
        })
    
    # Sort by priority
    recommendations.sort(key=lambda x: x["priority"], reverse=True)
    
    # Calculate total potential value
    total_monthly_value = sum(r["monthly_value"] for r in recommendations)
    total_package_cost = sum(r["recommended_option"]["price"] for r in recommendations if "price" in r.get("recommended_option", {}))
    
    return {
        "customer_profile": {
            "system_size_kw": request.system_size_kw,
            "annual_bill": request.annual_electric_bill,
            "has_ev": request.has_ev,
            "has_pool": request.has_pool,
            "outage_concerns": request.outage_concerns,
            "state": request.state
        },
        "recommendations": recommendations[:5],  # Top 5 recommendations
        "bundle_summary": {
            "total_products": len(recommendations),
            "total_monthly_savings": round(total_monthly_value, 2),
            "estimated_package_cost": total_package_cost,
            "annual_value": round(total_monthly_value * 12, 2)
        },
        "sales_tip": "Lead with the highest priority recommendation and bundle for better margins"
    }


@router.get("/upsell/products")
async def get_upsell_products():
    """Get all available upsell products"""
    return {"products": UPSELL_PRODUCTS}
