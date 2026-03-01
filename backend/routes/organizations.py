"""
Organization/Multi-tenancy API Routes
Endpoints for managing organizations, branding, and white-label settings.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import logging
from services.organization_service import (
    organization_service,
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
    OrganizationBranding,
    OrganizationSettings
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


# ============== PUBLIC ENDPOINTS (for white-label) ==============

@router.get("/branding/{slug}")
async def get_organization_branding(slug: str):
    """
    Get branding/theming for a white-label organization.
    This is a public endpoint used by the frontend to load custom branding.
    """
    org = await organization_service.get_organization_by_slug(slug)
    
    if not org:
        # Return default branding if org not found
        return {
            "found": False,
            "branding": OrganizationBranding().model_dump(),
            "organization_name": "Solar Empire"
        }
    
    return {
        "found": True,
        "organization_id": org["id"],
        "organization_name": org["name"],
        "branding": org.get("branding", OrganizationBranding().model_dump()),
        "settings": {
            "timezone": org.get("settings", {}).get("timezone", "America/New_York"),
            "currency": org.get("settings", {}).get("currency", "USD"),
            "date_format": org.get("settings", {}).get("date_format", "MM/DD/YYYY")
        }
    }


@router.get("/by-slug/{slug}")
async def get_organization_by_slug(slug: str):
    """
    Get organization info by slug (public, limited info).
    Used for white-label routing.
    """
    org = await organization_service.get_organization_by_slug(slug)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Return limited public info
    return {
        "id": org["id"],
        "name": org["name"],
        "slug": org["slug"],
        "branding": org.get("branding", {}),
        "is_active": org.get("is_active", True)
    }


# ============== ADMIN ENDPOINTS ==============

@router.post("")
async def create_organization(request: CreateOrganizationRequest):
    """
    Create a new organization (super admin only).
    """
    try:
        org = await organization_service.create_organization(request)
        return {
            "success": True,
            "message": "Organization created successfully",
            "organization": org
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating organization: {e}")
        raise HTTPException(status_code=500, detail="Failed to create organization")


@router.get("")
async def list_organizations(skip: int = 0, limit: int = 50):
    """
    List all organizations (super admin only).
    """
    try:
        orgs = await organization_service.list_organizations(skip, limit)
        return {
            "organizations": orgs,
            "total": len(orgs),
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing organizations: {e}")
        raise HTTPException(status_code=500, detail="Failed to list organizations")


@router.get("/{org_id}")
async def get_organization(org_id: str):
    """
    Get organization details by ID.
    """
    org = await organization_service.get_organization(org_id)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return org


@router.put("/{org_id}")
async def update_organization(org_id: str, request: UpdateOrganizationRequest):
    """
    Update organization details.
    """
    org = await organization_service.update_organization(org_id, request)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "success": True,
        "message": "Organization updated successfully",
        "organization": org
    }


@router.put("/{org_id}/branding")
async def update_organization_branding(org_id: str, branding: OrganizationBranding):
    """
    Update organization branding/white-label settings.
    """
    org = await organization_service.update_branding(org_id, branding)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "success": True,
        "message": "Branding updated successfully",
        "branding": org.get("branding", {})
    }


@router.get("/{org_id}/stats")
async def get_organization_stats(org_id: str):
    """
    Get usage statistics for an organization.
    """
    org = await organization_service.get_organization(org_id)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    stats = await organization_service.get_organization_stats(org_id)
    
    return {
        "organization_id": org_id,
        "organization_name": org["name"],
        "stats": stats,
        "subscription": org.get("subscription", {}),
        "limits": {
            "max_users": org.get("settings", {}).get("max_users", 100),
            "max_leads_per_month": org.get("settings", {}).get("max_leads_per_month", 10000)
        }
    }


@router.delete("/{org_id}")
async def deactivate_organization(org_id: str):
    """
    Soft delete/deactivate an organization (super admin only).
    """
    success = await organization_service.deactivate_organization(org_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "success": True,
        "message": "Organization deactivated successfully"
    }


# ============== INITIALIZATION ==============

@router.post("/init-default")
async def initialize_default_organization():
    """
    Initialize the default organization (for backward compatibility).
    This should be called once during system setup.
    """
    try:
        org = await organization_service.ensure_default_organization()
        return {
            "success": True,
            "message": "Default organization initialized",
            "organization": org
        }
    except Exception as e:
        logger.error(f"Error initializing default organization: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize default organization")
