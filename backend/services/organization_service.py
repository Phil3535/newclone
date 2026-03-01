"""
Organization/Multi-tenancy Models and Service
Enables full white-label support with custom branding per organization.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]


# ============== PYDANTIC MODELS ==============

class OrganizationBranding(BaseModel):
    """White-label branding configuration"""
    company_name: str = "Solar Empire"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#f59e0b"  # Amber/Orange
    secondary_color: str = "#3b82f6"  # Blue
    accent_color: str = "#22c55e"  # Green
    background_color: str = "#0a1628"  # Dark blue
    text_color: str = "#ffffff"
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    website_url: Optional[str] = None
    custom_css: Optional[str] = None
    
class OrganizationSettings(BaseModel):
    """Organization-specific settings"""
    timezone: str = "America/New_York"
    currency: str = "USD"
    date_format: str = "MM/DD/YYYY"
    default_commission_rate: float = 0.10
    enable_ai_features: bool = True
    enable_sms: bool = True
    enable_email_campaigns: bool = True
    enable_2fa_required: bool = False
    max_users: int = 100
    max_leads_per_month: int = 10000
    
class OrganizationSubscription(BaseModel):
    """Subscription/billing info"""
    plan: str = "professional"  # starter, professional, enterprise
    status: str = "active"  # active, trial, suspended, cancelled
    trial_ends_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None

class CreateOrganizationRequest(BaseModel):
    """Request to create a new organization"""
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=50, pattern="^[a-z0-9-]+$")
    owner_email: str
    owner_name: str
    branding: Optional[OrganizationBranding] = None
    settings: Optional[OrganizationSettings] = None

class UpdateOrganizationRequest(BaseModel):
    """Request to update organization"""
    name: Optional[str] = None
    branding: Optional[OrganizationBranding] = None
    settings: Optional[OrganizationSettings] = None

class OrganizationResponse(BaseModel):
    """Organization response model"""
    id: str
    name: str
    slug: str
    branding: OrganizationBranding
    settings: OrganizationSettings
    subscription: OrganizationSubscription
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    user_count: int = 0
    lead_count: int = 0


# ============== ORGANIZATION SERVICE ==============

class OrganizationService:
    """Service for managing organizations and multi-tenancy"""
    
    def __init__(self):
        self.collection = db.organizations
        self.users_collection = db.admin_users
        
    async def create_organization(self, request: CreateOrganizationRequest) -> dict:
        """Create a new organization with default branding"""
        # Check if slug is unique
        existing = await self.collection.find_one({"slug": request.slug})
        if existing:
            raise ValueError(f"Organization with slug '{request.slug}' already exists")
        
        now = datetime.now(timezone.utc)
        
        org_data = {
            "name": request.name,
            "slug": request.slug,
            "branding": (request.branding or OrganizationBranding()).model_dump(),
            "settings": (request.settings or OrganizationSettings()).model_dump(),
            "subscription": OrganizationSubscription(
                plan="trial",
                status="trial",
                trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14)
            ).model_dump(),
            "owner_email": request.owner_email,
            "owner_name": request.owner_name,
            "owner_id": None,
            "created_at": now,
            "updated_at": now,
            "is_active": True
        }
        
        result = await self.collection.insert_one(org_data)
        org_data["id"] = str(result.inserted_id)
        if "_id" in org_data:
            del org_data["_id"]
        
        return org_data
    
    async def get_organization(self, org_id: str) -> Optional[dict]:
        """Get organization by ID"""
        try:
            org = await self.collection.find_one({"_id": ObjectId(org_id)})
            if org:
                org["id"] = str(org.pop("_id"))
                # Get counts
                org["user_count"] = await db.admin_users.count_documents({"organization_id": org["id"]})
                org["lead_count"] = await db.leads.count_documents({"organization_id": org["id"]})
            return org
        except:
            return None
    
    async def get_organization_by_slug(self, slug: str) -> Optional[dict]:
        """Get organization by slug (for white-label routing)"""
        org = await self.collection.find_one({"slug": slug, "is_active": True})
        if org:
            org["id"] = str(org.pop("_id"))
        return org
    
    async def update_organization(self, org_id: str, updates: UpdateOrganizationRequest) -> Optional[dict]:
        """Update organization details"""
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if updates.name:
            update_data["name"] = updates.name
        if updates.branding:
            update_data["branding"] = updates.branding.model_dump()
        if updates.settings:
            update_data["settings"] = updates.settings.model_dump()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(org_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["id"] = str(result.pop("_id"))
        return result
    
    async def update_branding(self, org_id: str, branding: OrganizationBranding) -> Optional[dict]:
        """Update only branding settings"""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(org_id)},
            {
                "$set": {
                    "branding": branding.model_dump(),
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            return_document=True
        )
        if result:
            result["id"] = str(result.pop("_id"))
        return result
    
    async def list_organizations(self, skip: int = 0, limit: int = 50) -> List[dict]:
        """List all organizations (for super admin)"""
        cursor = self.collection.find({"is_active": True}).skip(skip).limit(limit).sort("created_at", -1)
        orgs = []
        async for org in cursor:
            org["id"] = str(org.pop("_id"))
            org["user_count"] = await db.admin_users.count_documents({"organization_id": org["id"]})
            org["lead_count"] = await db.leads.count_documents({"organization_id": org["id"]})
            orgs.append(org)
        return orgs
    
    async def deactivate_organization(self, org_id: str) -> bool:
        """Soft delete an organization"""
        result = await self.collection.update_one(
            {"_id": ObjectId(org_id)},
            {
                "$set": {
                    "is_active": False,
                    "deactivated_at": datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0
    
    async def get_organization_stats(self, org_id: str) -> dict:
        """Get usage statistics for an organization"""
        return {
            "user_count": await db.admin_users.count_documents({"organization_id": org_id}),
            "lead_count": await db.leads.count_documents({"organization_id": org_id}),
            "appointment_count": await db.appointments.count_documents({"organization_id": org_id}),
            "territory_count": await db.territories.count_documents({"organization_id": org_id}),
            "campaign_count": await db.drip_campaigns.count_documents({"organization_id": org_id}),
        }
    
    async def ensure_default_organization(self) -> dict:
        """Ensure a default organization exists for backward compatibility"""
        default_org = await self.collection.find_one({"slug": "default"})
        
        if not default_org:
            default_org = await self.create_organization(CreateOrganizationRequest(
                name="Solar Empire",
                slug="default",
                owner_email="admin@solarempire.com",
                owner_name="Super Admin",
                branding=OrganizationBranding(),
                settings=OrganizationSettings()
            ))
        else:
            default_org["id"] = str(default_org.pop("_id"))
        
        return default_org


# Global service instance
organization_service = OrganizationService()
