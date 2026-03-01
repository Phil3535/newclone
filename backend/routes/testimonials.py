"""
Testimonials Routes - Customer success stories
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import db
from models import Testimonial, TestimonialCreate
from typing import List
import uuid

router = APIRouter(prefix="/testimonials", tags=["testimonials"])


@router.post("/", response_model=Testimonial)
async def create_testimonial(testimonial: TestimonialCreate):
    """Create a new testimonial"""
    testimonial_dict = testimonial.dict()
    testimonial_dict["id"] = str(uuid.uuid4())
    testimonial_dict["verified"] = False  # Admin needs to verify
    testimonial_dict["created_at"] = datetime.utcnow()
    
    await db.testimonials.insert_one(testimonial_dict)
    return Testimonial(**testimonial_dict)


@router.get("/", response_model=List[Testimonial])
async def get_testimonials(verified_only: bool = True, limit: int = 20):
    """Get all testimonials"""
    query = {"verified": True} if verified_only else {}
    testimonials = await db.testimonials.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # If no testimonials in DB, return seed data
    if not testimonials:
        testimonials = [
            {
                "id": "test-001",
                "customer_name": "Robert & Maria Santos",
                "location": "Phoenix, AZ",
                "system_size": "8.5 kW",
                "rating": 5,
                "review": "Solar Empire made going solar incredibly easy. From the first consultation to the final installation, everything was seamless. We're now saving over $200/month on electricity!",
                "savings_amount": 2400,
                "image_url": None,
                "verified": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": "test-002",
                "customer_name": "Jennifer Thompson",
                "location": "Austin, TX",
                "system_size": "6.2 kW",
                "rating": 5,
                "review": "The team at Solar Empire was professional and knowledgeable. They helped me understand all the incentives available and the installation was completed in just 2 days!",
                "savings_amount": 1800,
                "image_url": None,
                "verified": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": "test-003",
                "customer_name": "Michael & Susan Chen",
                "location": "San Diego, CA",
                "system_size": "10.4 kW",
                "rating": 5,
                "review": "Best investment we ever made! Our electric bill went from $350/month to practically nothing. The Solar Empire rep was fantastic and answered all our questions.",
                "savings_amount": 4200,
                "image_url": None,
                "verified": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": "test-004",
                "customer_name": "David Martinez",
                "location": "Las Vegas, NV",
                "system_size": "7.8 kW",
                "rating": 4,
                "review": "Great experience overall. The solar panels look sleek and our home value has increased. Highly recommend Solar Empire to anyone considering solar.",
                "savings_amount": 2100,
                "image_url": None,
                "verified": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": "test-005",
                "customer_name": "Lisa & Tom Wilson",
                "location": "Denver, CO",
                "system_size": "9.0 kW",
                "rating": 5,
                "review": "We were hesitant about solar at first, but the Solar Empire team addressed all our concerns. Now we're generating more power than we use and getting credits from the utility company!",
                "savings_amount": 2800,
                "image_url": None,
                "verified": True,
                "created_at": datetime.utcnow()
            }
        ]
    
    return testimonials


@router.get("/{testimonial_id}", response_model=Testimonial)
async def get_testimonial(testimonial_id: str):
    """Get a specific testimonial"""
    testimonial = await db.testimonials.find_one({"id": testimonial_id}, {"_id": 0})
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return Testimonial(**testimonial)


@router.put("/{testimonial_id}/verify")
async def verify_testimonial(testimonial_id: str):
    """Admin: Verify a testimonial"""
    result = await db.testimonials.update_one(
        {"id": testimonial_id},
        {"$set": {"verified": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True, "message": "Testimonial verified"}


@router.delete("/{testimonial_id}")
async def delete_testimonial(testimonial_id: str):
    """Admin: Delete a testimonial"""
    result = await db.testimonials.delete_one({"id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True}
