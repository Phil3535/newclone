"""
AI Power Tools - Phase 2 Elite Features
1. AI Objection Handler - Get perfect rebuttals for customer objections
2. Predictive Close Probability - AI predicts which leads will close
3. Smart Follow-up Timing - Best time to contact each lead
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import logging
import json
import random
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

# OpenAI configuration
EMERGENT_API_KEY = os.environ.get('EMERGENT_API_KEY')

router = APIRouter(prefix="/api/ai-tools", tags=["ai-power-tools"])


# ============== DATA MODELS ==============

class ObjectionRequest(BaseModel):
    objection: str = Field(..., description="The customer's objection or concern")
    context: Optional[str] = None  # Additional context like customer profile
    tone: str = "professional"  # professional, friendly, empathetic, direct

class LeadForPrediction(BaseModel):
    lead_id: Optional[str] = None
    # Lead attributes
    bill_amount: Optional[float] = None
    homeowner: bool = True
    roof_type: Optional[str] = None
    roof_age: Optional[int] = None
    credit_score_range: Optional[str] = None  # excellent, good, fair, poor
    timeline: Optional[str] = None  # immediate, 1-3 months, 3-6 months, just looking
    # Engagement signals
    appointments_scheduled: int = 0
    appointments_completed: int = 0
    proposals_sent: int = 0
    follow_ups_completed: int = 0
    days_in_pipeline: int = 0
    last_contact_days_ago: int = 0
    # Source quality
    source: Optional[str] = None  # qr_scan, referral, web_form, cold_call
    responded_to_sms: bool = False
    opened_emails: int = 0
    clicked_proposal: bool = False

class FollowUpTimingRequest(BaseModel):
    lead_id: Optional[str] = None
    # Lead info
    lead_name: Optional[str] = None
    timezone: str = "America/Los_Angeles"
    occupation: Optional[str] = None  # professional, retired, self-employed, unknown
    # Past engagement data
    previous_contact_times: List[str] = []  # List of ISO timestamps
    response_times: List[str] = []  # Times when they responded
    preferred_channel: str = "phone"  # phone, sms, email
    # Current status
    pipeline_stage: str = "new"  # new, contacted, appointment_set, proposal_sent, negotiating
    urgency_level: str = "medium"  # low, medium, high, critical


# ============== COMMON OBJECTIONS DATABASE ==============

OBJECTION_CATEGORIES = {
    "price": {
        "keywords": ["expensive", "cost", "afford", "price", "money", "budget", "cheap"],
        "rebuttals": [
            {
                "objection_type": "Too expensive",
                "rebuttal": "I completely understand cost is a major factor. Here's what most homeowners don't realize: with the 30% federal tax credit, state incentives, and $0 down financing, your monthly payment is often LESS than your current electric bill. You're essentially trading your electric bill for a lower solar payment - but the solar payment goes away in 10-15 years while electric bills never stop.",
                "stats": "Average homeowner saves $1,500/year. Over 25 years, that's $37,500+ in savings.",
                "closing_question": "If I could show you how to pay less per month than your current bill while building equity in your home, would that be worth 15 minutes of your time?"
            },
            {
                "objection_type": "Can't afford it right now",
                "rebuttal": "That's exactly why $0 down financing exists - you don't need any money upfront. The solar payment replaces your electric bill, so there's no additional monthly expense. In fact, most customers see day-one savings because the solar payment is lower than their electric bill was.",
                "stats": "85% of our customers have $0 out of pocket and save money from day one.",
                "closing_question": "What if you could start saving money immediately without any upfront cost?"
            }
        ]
    },
    "timing": {
        "keywords": ["later", "not now", "thinking", "wait", "decide", "time", "busy"],
        "rebuttals": [
            {
                "objection_type": "Not the right time",
                "rebuttal": "I hear that a lot, and here's what I tell everyone: electricity rates have increased 15% in the last 3 years and are projected to rise another 20% over the next 5 years. Every month you wait, you're paying the utility company instead of investing in your own home. Plus, the 30% federal tax credit is scheduled to decrease - locking in now protects you from both rising rates AND ensures maximum incentives.",
                "stats": "Homeowners who wait 1 year typically pay $2,000-3,000 more due to rate increases and reduced incentives.",
                "closing_question": "Would it make sense to at least lock in today's pricing and incentives while you think it over? There's no obligation."
            }
        ]
    },
    "trust": {
        "keywords": ["scam", "trust", "reliable", "company", "warranty", "guarantee", "reviews"],
        "rebuttals": [
            {
                "objection_type": "Don't trust solar companies",
                "rebuttal": "Your skepticism is actually healthy - there are some bad actors in this industry. That's why we focus on transparency: we use tier-1 equipment with 25-year warranties backed by the manufacturers (not just us), we're fully licensed and insured, and we have hundreds of 5-star reviews from homeowners in your area. I'd be happy to connect you with a few neighbors who went solar with us.",
                "stats": "We have a 4.9-star rating with 500+ reviews. Our equipment is warrantied by companies like Tesla, Enphase, and QCells - not fly-by-night manufacturers.",
                "closing_question": "Would you like me to send you some references from homeowners in your neighborhood?"
            }
        ]
    },
    "roof": {
        "keywords": ["roof", "old", "replace", "damage", "condition", "shingles"],
        "rebuttals": [
            {
                "objection_type": "Roof is too old",
                "rebuttal": "Great question - we always assess the roof first. If your roof has 10+ years of life left, we can install now. If it needs replacement, many homeowners bundle the roof with solar because: 1) you can finance both together, 2) removing panels later for re-roofing costs $3,000-5,000, and 3) solar actually PROTECTS the roof underneath, extending its life.",
                "stats": "Panels protect shingles from UV damage and can extend roof life by 5-10 years.",
                "closing_question": "Would you like us to include a free roof assessment with your solar consultation?"
            }
        ]
    },
    "moving": {
        "keywords": ["moving", "sell", "house", "relocate", "stay"],
        "rebuttals": [
            {
                "objection_type": "Might move soon",
                "rebuttal": "That's actually a great reason TO go solar. Studies show homes with solar sell 4.1% higher than comparable homes without solar - that's an extra $15,000-20,000 on a $400K home. Plus, they sell 20% faster because buyers love the idea of low/no electric bills. You're not losing the investment - you're increasing your home's value.",
                "stats": "Zillow: Solar homes sell for 4.1% more. National Renewable Energy Lab: Solar homes sell 20% faster.",
                "closing_question": "Would increasing your home value by $15-20K while also saving on electricity interest you?"
            }
        ]
    },
    "spouse": {
        "keywords": ["spouse", "husband", "wife", "partner", "discuss", "family"],
        "rebuttals": [
            {
                "objection_type": "Need to discuss with spouse",
                "rebuttal": "Absolutely, this is a family decision. What I'd suggest is: let me put together a personalized savings analysis so you have real numbers to discuss. I can also schedule a time when both of you are available - most couples find it easier to make a decision together when they can both ask questions.",
                "stats": "89% of couples who see the analysis together move forward within 2 weeks.",
                "closing_question": "What time works best for both of you? I want to make sure all questions get answered."
            }
        ]
    },
    "technology": {
        "keywords": ["technology", "better", "wait", "improve", "new", "efficiency", "battery"],
        "rebuttals": [
            {
                "objection_type": "Waiting for better technology",
                "rebuttal": "Solar technology has actually plateaued - panels today are 20-22% efficient, and even the most advanced labs are only at 25%. The improvements now are incremental, maybe 1% per year. Meanwhile, you're losing $3,000+ per year to the utility company while waiting. It's like saying 'I'll wait for a better iPhone' while paying $500/month for no phone.",
                "stats": "Panel efficiency has only improved 3% in the last 5 years. Waiting 1 year = $3,000+ in lost savings.",
                "closing_question": "Would you rather save $3,000 this year or wait for 1% better efficiency?"
            }
        ]
    }
}


# ============== AI OBJECTION HANDLER ==============

async def generate_ai_rebuttal(objection: str, context: str = None, tone: str = "professional") -> dict:
    """Generate a custom AI rebuttal using OpenAI"""
    if not EMERGENT_API_KEY:
        return None
    
    try:
        from emergentintegrations.llm.openai import OpenAIClient
        
        ai_client = OpenAIClient(api_key=EMERGENT_API_KEY)
        
        system_prompt = f"""You are an expert solar sales consultant. Generate a persuasive, {tone} rebuttal to the customer's objection.

Your response MUST be a valid JSON object with these exact fields:
{{
    "rebuttal": "Your main response (2-3 sentences, conversational)",
    "key_stat": "One compelling statistic with source",
    "closing_question": "A soft closing question to advance the sale",
    "empathy_statement": "Brief acknowledgment of their concern"
}}

Guidelines:
- Be conversational, not salesy
- Use specific numbers and statistics
- Address the emotional concern behind the objection
- End with a question that invites further discussion
- Never be pushy or dismissive"""

        user_prompt = f"Customer objection: {objection}"
        if context:
            user_prompt += f"\n\nContext: {context}"
        
        response = await ai_client.chat(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            model="gpt-4o"
        )
        
        # Parse AI response
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            ai_rebuttal = json.loads(response_text.strip())
            return ai_rebuttal
        except json.JSONDecodeError:
            # If JSON parsing fails, create structured response from text
            return {
                "rebuttal": response,
                "key_stat": "Solar saves homeowners an average of $1,500/year",
                "closing_question": "Would you like to see what you could save?",
                "empathy_statement": "I understand your concern."
            }
            
    except Exception as e:
        logger.error(f"AI rebuttal generation failed: {e}")
        return None


def find_matching_objection(objection: str) -> tuple:
    """Find the best matching pre-built rebuttal"""
    objection_lower = objection.lower()
    
    best_match = None
    best_category = None
    max_matches = 0
    
    for category, data in OBJECTION_CATEGORIES.items():
        matches = sum(1 for keyword in data["keywords"] if keyword in objection_lower)
        if matches > max_matches:
            max_matches = matches
            best_category = category
            best_match = data["rebuttals"][0] if data["rebuttals"] else None
    
    return best_category, best_match


@router.post("/objection-handler")
async def handle_objection(request: ObjectionRequest):
    """
    AI-powered objection handler that provides perfect rebuttals
    Uses pre-built responses + AI customization
    """
    # Find matching pre-built rebuttal
    category, prebuilt = find_matching_objection(request.objection)
    
    # Try to get AI-enhanced rebuttal
    ai_rebuttal = await generate_ai_rebuttal(
        request.objection, 
        request.context, 
        request.tone
    )
    
    response = {
        "objection": request.objection,
        "category": category or "general",
        "confidence": "high" if prebuilt else "medium",
    }
    
    if ai_rebuttal:
        response["ai_response"] = {
            "empathy": ai_rebuttal.get("empathy_statement", "I understand your concern."),
            "rebuttal": ai_rebuttal.get("rebuttal"),
            "key_stat": ai_rebuttal.get("key_stat"),
            "closing_question": ai_rebuttal.get("closing_question"),
            "source": "ai_generated"
        }
    
    if prebuilt:
        response["scripted_response"] = {
            "objection_type": prebuilt["objection_type"],
            "rebuttal": prebuilt["rebuttal"],
            "stats": prebuilt["stats"],
            "closing_question": prebuilt["closing_question"],
            "source": "expert_script"
        }
    
    # Use AI if available, otherwise scripted
    if ai_rebuttal:
        response["recommended_response"] = response["ai_response"]
    elif prebuilt:
        response["recommended_response"] = response["scripted_response"]
    else:
        response["recommended_response"] = {
            "empathy": "I appreciate you sharing that concern.",
            "rebuttal": "That's a great question. Many homeowners have the same concern initially. What I've found is that once we look at the actual numbers for your specific situation, the decision becomes much clearer.",
            "closing_question": "Would you like me to put together a personalized analysis for your home?",
            "source": "fallback"
        }
    
    # Log for training/improvement
    await db.objection_logs.insert_one({
        "id": str(uuid.uuid4()),
        "objection": request.objection,
        "category": category,
        "response_used": response["recommended_response"]["source"],
        "timestamp": datetime.utcnow()
    })
    
    return response


@router.get("/objection-handler/categories")
async def get_objection_categories():
    """Get all objection categories and sample rebuttals"""
    categories = []
    for cat_name, data in OBJECTION_CATEGORIES.items():
        categories.append({
            "category": cat_name,
            "keywords": data["keywords"],
            "sample_objections": [r["objection_type"] for r in data["rebuttals"]],
            "rebuttal_count": len(data["rebuttals"])
        })
    return {"categories": categories}


# ============== PREDICTIVE CLOSE PROBABILITY ==============

def calculate_base_score(lead: LeadForPrediction) -> dict:
    """Calculate base closing probability from lead attributes"""
    score = 50  # Start at 50%
    factors = []
    
    # Bill amount (higher bills = more motivated)
    if lead.bill_amount:
        if lead.bill_amount >= 300:
            score += 15
            factors.append({"factor": "High electric bill ($300+)", "impact": +15})
        elif lead.bill_amount >= 200:
            score += 10
            factors.append({"factor": "Medium electric bill ($200-300)", "impact": +10})
        elif lead.bill_amount >= 150:
            score += 5
            factors.append({"factor": "Moderate electric bill ($150-200)", "impact": +5})
        else:
            score -= 10
            factors.append({"factor": "Low electric bill (<$150)", "impact": -10})
    
    # Homeowner status
    if not lead.homeowner:
        score -= 30
        factors.append({"factor": "Not homeowner", "impact": -30})
    
    # Timeline
    if lead.timeline:
        timeline_scores = {
            "immediate": 20,
            "1-3 months": 15,
            "3-6 months": 5,
            "just looking": -15
        }
        impact = timeline_scores.get(lead.timeline.lower(), 0)
        score += impact
        factors.append({"factor": f"Timeline: {lead.timeline}", "impact": impact})
    
    # Credit score
    if lead.credit_score_range:
        credit_scores = {
            "excellent": 15,
            "good": 10,
            "fair": 0,
            "poor": -20
        }
        impact = credit_scores.get(lead.credit_score_range.lower(), 0)
        score += impact
        factors.append({"factor": f"Credit: {lead.credit_score_range}", "impact": impact})
    
    # Lead source quality
    if lead.source:
        source_scores = {
            "referral": 25,
            "qr_scan": 15,
            "web_form": 10,
            "cold_call": -5
        }
        impact = source_scores.get(lead.source.lower(), 0)
        score += impact
        factors.append({"factor": f"Source: {lead.source}", "impact": impact})
    
    return {"base_score": max(0, min(100, score)), "factors": factors}


def calculate_engagement_score(lead: LeadForPrediction) -> dict:
    """Calculate score boost from engagement signals"""
    score = 0
    factors = []
    
    # Appointments
    if lead.appointments_completed > 0:
        impact = min(lead.appointments_completed * 10, 25)
        score += impact
        factors.append({"factor": f"{lead.appointments_completed} appointments completed", "impact": impact})
    elif lead.appointments_scheduled > 0:
        impact = min(lead.appointments_scheduled * 5, 15)
        score += impact
        factors.append({"factor": f"{lead.appointments_scheduled} appointments scheduled", "impact": impact})
    
    # Proposals
    if lead.proposals_sent > 0:
        score += 15
        factors.append({"factor": "Proposal sent", "impact": +15})
        
        if lead.clicked_proposal:
            score += 10
            factors.append({"factor": "Clicked/viewed proposal", "impact": +10})
    
    # SMS/Email engagement
    if lead.responded_to_sms:
        score += 10
        factors.append({"factor": "Responded to SMS", "impact": +10})
    
    if lead.opened_emails >= 3:
        score += 8
        factors.append({"factor": "Opened 3+ emails", "impact": +8})
    elif lead.opened_emails >= 1:
        score += 4
        factors.append({"factor": "Opened emails", "impact": +4})
    
    # Recency penalty
    if lead.last_contact_days_ago > 30:
        impact = -15
        score += impact
        factors.append({"factor": "No contact in 30+ days", "impact": impact})
    elif lead.last_contact_days_ago > 14:
        impact = -8
        score += impact
        factors.append({"factor": "No contact in 14+ days", "impact": impact})
    
    # Pipeline duration (too long = cooling off)
    if lead.days_in_pipeline > 90:
        impact = -20
        score += impact
        factors.append({"factor": "In pipeline 90+ days", "impact": impact})
    elif lead.days_in_pipeline > 60:
        impact = -10
        score += impact
        factors.append({"factor": "In pipeline 60+ days", "impact": impact})
    
    return {"engagement_score": score, "factors": factors}


@router.post("/close-probability")
async def predict_close_probability(lead: LeadForPrediction):
    """
    AI-powered prediction of lead closing probability
    Returns probability score (0-100) with contributing factors
    """
    # Calculate base score from lead attributes
    base_result = calculate_base_score(lead)
    
    # Calculate engagement boost
    engagement_result = calculate_engagement_score(lead)
    
    # Combined score
    raw_score = base_result["base_score"] + engagement_result["engagement_score"]
    final_score = max(0, min(100, raw_score))
    
    # Determine tier
    if final_score >= 80:
        tier = "HOT"
        tier_color = "#ef4444"
        recommendation = "Contact immediately - high intent buyer"
    elif final_score >= 60:
        tier = "WARM"
        tier_color = "#f97316"
        recommendation = "Priority follow-up within 24 hours"
    elif final_score >= 40:
        tier = "NURTURE"
        tier_color = "#eab308"
        recommendation = "Add to drip campaign, follow up weekly"
    else:
        tier = "COLD"
        tier_color = "#3b82f6"
        recommendation = "Low priority - focus on higher-scoring leads"
    
    # Generate next best action
    actions = []
    if not lead.appointments_completed and final_score >= 50:
        actions.append("Schedule an appointment")
    if lead.appointments_completed and not lead.proposals_sent:
        actions.append("Send a proposal")
    if lead.proposals_sent and not lead.clicked_proposal:
        actions.append("Follow up on proposal - they haven't viewed it")
    if lead.last_contact_days_ago > 7 and final_score >= 40:
        actions.append("Re-engage - it's been over a week")
    if not actions:
        actions.append("Continue nurturing through automated campaigns")
    
    result = {
        "probability_score": final_score,
        "tier": tier,
        "tier_color": tier_color,
        "recommendation": recommendation,
        "next_best_actions": actions,
        "score_breakdown": {
            "base_score": base_result["base_score"],
            "engagement_boost": engagement_result["engagement_score"],
            "final_score": final_score
        },
        "contributing_factors": base_result["factors"] + engagement_result["factors"],
        "analysis_timestamp": datetime.utcnow().isoformat()
    }
    
    # If lead_id provided, save prediction
    if lead.lead_id:
        await db.close_predictions.update_one(
            {"lead_id": lead.lead_id},
            {"$set": {
                "lead_id": lead.lead_id,
                "probability": final_score,
                "tier": tier,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    return result


@router.post("/close-probability/batch")
async def batch_predict(leads: List[LeadForPrediction]):
    """Score multiple leads at once"""
    results = []
    for lead in leads[:50]:  # Limit to 50 leads
        result = await predict_close_probability(lead)
        results.append({
            "lead_id": lead.lead_id,
            "score": result["probability_score"],
            "tier": result["tier"],
            "recommendation": result["recommendation"]
        })
    
    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "predictions": results,
        "summary": {
            "total_leads": len(results),
            "hot_leads": len([r for r in results if r["tier"] == "HOT"]),
            "warm_leads": len([r for r in results if r["tier"] == "WARM"]),
            "nurture_leads": len([r for r in results if r["tier"] == "NURTURE"]),
            "cold_leads": len([r for r in results if r["tier"] == "COLD"])
        }
    }


# ============== SMART FOLLOW-UP TIMING ==============

# Best times by occupation/lifestyle
TIMING_PROFILES = {
    "professional": {
        "best_days": ["Tuesday", "Wednesday", "Thursday"],
        "best_hours": [12, 17, 18, 19],  # Lunch and after work
        "avoid_hours": [9, 10, 11, 14, 15, 16],  # Work meetings
        "notes": "Working professionals respond best during lunch (12pm) or after work (5-7pm)"
    },
    "retired": {
        "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "best_hours": [10, 11, 14, 15],  # Mid-morning and afternoon
        "avoid_hours": [8, 9, 18, 19, 20],  # Too early or dinner time
        "notes": "Retired individuals prefer mid-morning to afternoon calls"
    },
    "self-employed": {
        "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday"],
        "best_hours": [9, 10, 15, 16],
        "avoid_hours": [12, 13],  # Likely taking meetings
        "notes": "Self-employed people have flexible schedules, try different times"
    },
    "unknown": {
        "best_days": ["Tuesday", "Wednesday", "Thursday"],
        "best_hours": [10, 11, 17, 18],
        "avoid_hours": [8, 13, 21, 22],
        "notes": "Default timing - optimize based on response patterns"
    }
}

# Channel timing preferences
CHANNEL_TIMING = {
    "phone": {"peak_hours": [10, 11, 17, 18], "avoid": [8, 9, 12, 21, 22]},
    "sms": {"peak_hours": [9, 12, 17, 20], "avoid": [22, 23, 0, 1, 2, 3, 4, 5, 6, 7]},
    "email": {"peak_hours": [6, 7, 8, 12, 17], "avoid": []}  # Email is always okay
}

# Stage-based urgency
STAGE_URGENCY = {
    "new": {"max_wait_hours": 2, "ideal_followup": "immediate"},
    "contacted": {"max_wait_hours": 48, "ideal_followup": "next day"},
    "appointment_set": {"max_wait_hours": 24, "ideal_followup": "day before appointment"},
    "proposal_sent": {"max_wait_hours": 24, "ideal_followup": "24-48 hours after sending"},
    "negotiating": {"max_wait_hours": 4, "ideal_followup": "same day"}
}


def analyze_response_patterns(response_times: List[str]) -> dict:
    """Analyze when the lead typically responds"""
    if not response_times:
        return {"pattern": "unknown", "best_hours": [], "best_days": []}
    
    hours = []
    days = []
    
    for time_str in response_times:
        try:
            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            hours.append(dt.hour)
            days.append(dt.strftime("%A"))
        except:
            continue
    
    if not hours:
        return {"pattern": "unknown", "best_hours": [], "best_days": []}
    
    # Find most common hours and days
    hour_counts = {}
    for h in hours:
        hour_counts[h] = hour_counts.get(h, 0) + 1
    
    day_counts = {}
    for d in days:
        day_counts[d] = day_counts.get(d, 0) + 1
    
    best_hours = sorted(hour_counts.keys(), key=lambda x: hour_counts[x], reverse=True)[:3]
    best_days = sorted(day_counts.keys(), key=lambda x: day_counts[x], reverse=True)[:3]
    
    return {
        "pattern": "learned",
        "best_hours": best_hours,
        "best_days": best_days,
        "total_responses": len(hours)
    }


@router.post("/follow-up-timing")
async def get_optimal_followup_time(request: FollowUpTimingRequest):
    """
    AI-powered recommendation for best time to follow up with a lead
    """
    # Get occupation-based profile
    profile = TIMING_PROFILES.get(request.occupation or "unknown", TIMING_PROFILES["unknown"])
    
    # Analyze past response patterns
    response_analysis = analyze_response_patterns(request.response_times)
    
    # Get channel timing
    channel_prefs = CHANNEL_TIMING.get(request.preferred_channel, CHANNEL_TIMING["phone"])
    
    # Get stage urgency
    stage_info = STAGE_URGENCY.get(request.pipeline_stage, STAGE_URGENCY["contacted"])
    
    # Calculate optimal times
    now = datetime.utcnow()
    current_hour = now.hour
    current_day = now.strftime("%A")
    
    # Combine all timing signals
    recommended_hours = []
    
    # Priority 1: Learned pattern from responses
    if response_analysis["pattern"] == "learned":
        recommended_hours.extend(response_analysis["best_hours"])
    
    # Priority 2: Occupation-based hours
    recommended_hours.extend(profile["best_hours"])
    
    # Priority 3: Channel peak hours
    recommended_hours.extend(channel_prefs["peak_hours"])
    
    # Remove duplicates and avoid hours
    avoid_hours = set(profile["avoid_hours"]) | set(channel_prefs.get("avoid", []))
    recommended_hours = list(set(h for h in recommended_hours if h not in avoid_hours))
    recommended_hours.sort()
    
    # Find next optimal slot
    next_slots = []
    for hour in recommended_hours[:5]:
        slot_time = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        if slot_time <= now:
            slot_time += timedelta(days=1)
        
        # Skip weekends if professional
        if request.occupation == "professional":
            while slot_time.strftime("%A") in ["Saturday", "Sunday"]:
                slot_time += timedelta(days=1)
        
        next_slots.append({
            "datetime": slot_time.isoformat(),
            "day": slot_time.strftime("%A"),
            "time": slot_time.strftime("%I:%M %p"),
            "hours_from_now": round((slot_time - now).total_seconds() / 3600, 1)
        })
    
    # Sort by soonest
    next_slots.sort(key=lambda x: x["hours_from_now"])
    
    # Urgency check
    urgent = False
    urgency_message = None
    
    if request.urgency_level == "critical" or request.pipeline_stage == "new":
        urgent = True
        urgency_message = "NEW LEAD - Contact within 5 minutes for 9x higher connection rate!"
    elif request.urgency_level == "high" or request.pipeline_stage == "negotiating":
        urgent = True
        urgency_message = "High priority - follow up today to maintain momentum"
    
    result = {
        "lead_name": request.lead_name,
        "recommended_channel": request.preferred_channel,
        "urgent": urgent,
        "urgency_message": urgency_message,
        "optimal_times": next_slots[:3],
        "best_time": next_slots[0] if next_slots else None,
        "timing_factors": {
            "occupation_profile": request.occupation or "unknown",
            "profile_notes": profile["notes"],
            "response_pattern": response_analysis["pattern"],
            "learned_best_hours": response_analysis.get("best_hours", []),
            "pipeline_stage": request.pipeline_stage,
            "stage_guidance": stage_info["ideal_followup"]
        },
        "avoid_times": {
            "hours": list(avoid_hours),
            "reason": "Based on occupation and channel preferences"
        },
        "pro_tips": [
            f"Best days for {request.occupation or 'this contact'}: {', '.join(profile['best_days'][:3])}",
            f"For {request.preferred_channel}, peak engagement is {channel_prefs['peak_hours'][0]}:00 - {channel_prefs['peak_hours'][-1]}:00",
            stage_info["ideal_followup"]
        ]
    }
    
    # Save timing analysis
    if request.lead_id:
        await db.timing_analysis.update_one(
            {"lead_id": request.lead_id},
            {"$set": {
                "lead_id": request.lead_id,
                "best_hours": recommended_hours[:3],
                "occupation": request.occupation,
                "last_analyzed": datetime.utcnow()
            }},
            upsert=True
        )
    
    return result


@router.get("/follow-up-timing/profiles")
async def get_timing_profiles():
    """Get all occupation timing profiles"""
    return {
        "profiles": TIMING_PROFILES,
        "channel_timing": CHANNEL_TIMING,
        "stage_urgency": STAGE_URGENCY
    }
