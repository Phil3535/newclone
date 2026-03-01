"""
Referral Program Routes
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime
from database import db
import random
import string
import uuid

router = APIRouter(prefix="/referrals", tags=["referrals"])


def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code"""
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SOLAR{random_part}"


@router.get("/{user_id}")
async def get_referral_info(user_id: str):
    """Get user's referral code and stats"""
    referral_code = await db.referral_codes.find_one({"user_id": user_id}, {"_id": 0})
    
    if not referral_code:
        code = generate_referral_code(user_id)
        referral_code = {
            "user_id": user_id,
            "code": code,
            "created_at": datetime.utcnow()
        }
        await db.referral_codes.insert_one(referral_code)
    
    if "_id" in referral_code:
        del referral_code["_id"]
    
    referrals_made = await db.referrals.count_documents({"referrer_id": user_id})
    successful_referrals = await db.referrals.count_documents({
        "referrer_id": user_id, 
        "status": {"$in": ["completed", "rewarded"]}
    })
    
    rewards = await db.referral_rewards.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    total_months_earned = sum(r.get("months_earned", 0) for r in rewards)
    total_months_used = sum(r.get("months_used", 0) for r in rewards)
    
    recent_referrals = await db.referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "code": referral_code.get("code"),
        "share_url": f"https://solarempire.app/signup?ref={referral_code.get('code')}",
        "stats": {
            "total_referrals": referrals_made,
            "successful_referrals": successful_referrals,
            "pending_referrals": referrals_made - successful_referrals,
            "months_earned": total_months_earned,
            "months_available": total_months_earned - total_months_used,
            "value_earned": total_months_earned * 149
        },
        "recent_referrals": recent_referrals,
        "rewards": {
            "per_referral": "1 month free",
            "referee_bonus": "1 month free",
            "description": "Both you and your friend get 1 month free when they subscribe!"
        }
    }


@router.post("/apply")
async def apply_referral_code(request: Request):
    """Apply a referral code when a new user signs up"""
    data = await request.json()
    code = data.get("code", "").upper()
    referee_id = data.get("referee_id")
    referee_email = data.get("referee_email")
    
    if not code or not referee_id:
        raise HTTPException(status_code=400, detail="Code and referee_id are required")
    
    referral_code = await db.referral_codes.find_one({"code": code})
    if not referral_code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_id = referral_code["user_id"]
    
    if referrer_id == referee_id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    existing = await db.referrals.find_one({"referee_id": referee_id})
    if existing:
        raise HTTPException(status_code=400, detail="This account has already used a referral code")
    
    referral = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer_id,
        "referee_id": referee_id,
        "referee_email": referee_email or "",
        "status": "pending",
        "reward_months": 1,
        "created_at": datetime.utcnow()
    }
    await db.referrals.insert_one(referral)
    
    return {
        "success": True,
        "message": "Referral code applied! You'll both get 1 month free when you subscribe.",
        "referral_id": referral["id"]
    }


@router.post("/complete/{referral_id}")
async def complete_referral(referral_id: str):
    """Complete a referral when referee makes their first payment"""
    referral = await db.referrals.find_one({"id": referral_id})
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    if referral["status"] != "pending":
        return {"success": True, "message": "Referral already processed"}
    
    await db.referrals.update_one(
        {"id": referral_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    
    reward_months = referral.get("reward_months", 1)
    
    await db.referral_rewards.insert_one({
        "user_id": referral["referrer_id"],
        "months_earned": reward_months,
        "months_used": 0,
        "source": "referral_made",
        "referral_id": referral_id,
        "created_at": datetime.utcnow()
    })
    
    await db.referral_rewards.insert_one({
        "user_id": referral["referee_id"],
        "months_earned": reward_months,
        "months_used": 0,
        "source": "referral_received",
        "referral_id": referral_id,
        "created_at": datetime.utcnow()
    })
    
    await db.referrals.update_one(
        {"id": referral_id},
        {"$set": {"status": "rewarded"}}
    )
    
    return {
        "success": True,
        "message": f"Referral completed! Both users received {reward_months} month(s) free.",
        "rewards_given": {"referrer": reward_months, "referee": reward_months}
    }


@router.get("/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers leaderboard"""
    pipeline = [
        {"$match": {"status": {"$in": ["completed", "rewarded"]}}},
        {"$group": {
            "_id": "$referrer_id",
            "total_referrals": {"$sum": 1},
            "total_months_earned": {"$sum": "$reward_months"}
        }},
        {"$sort": {"total_referrals": -1}},
        {"$limit": 10}
    ]
    
    results = await db.referrals.aggregate(pipeline).to_list(10)
    
    leaderboard = []
    for i, result in enumerate(results, 1):
        leaderboard.append({
            "rank": i,
            "user_id": result["_id"],
            "total_referrals": result["total_referrals"],
            "total_months_earned": result["total_months_earned"],
            "total_value": result["total_months_earned"] * 149
        })
    
    return {"leaderboard": leaderboard}
