"""
Admin Authentication & Role-Based Access Control (RBAC)
Provides authentication, authorization, and user permission management.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import os
import hashlib
import secrets
import jwt

# MongoDB connection
from pymongo import MongoClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'solar_empire')
client = MongoClient(mongo_url)
db = client[db_name]

router = APIRouter(prefix="/api/auth", tags=["admin-auth"])

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'solar-empire-super-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ============ Permission Levels ============
ROLES = {
    "super_admin": {
        "level": 100,
        "description": "Full system access - can manage everything",
        "permissions": ["*"]  # Wildcard = all permissions
    },
    "admin": {
        "level": 80,
        "description": "Admin access - can manage users and view all data",
        "permissions": [
            "dashboard.view", "users.view", "users.edit", 
            "leads.view", "leads.edit", "territories.view", "territories.edit",
            "campaigns.view", "campaigns.edit", "commissions.view",
            "analytics.view", "settings.view"
        ]
    },
    "manager": {
        "level": 60,
        "description": "Manager access - can view team data and manage leads",
        "permissions": [
            "dashboard.view", "users.view", "leads.view", "leads.edit",
            "territories.view", "campaigns.view", "commissions.view", "analytics.view"
        ]
    },
    "sales_rep": {
        "level": 40,
        "description": "Sales rep access - can view own data only",
        "permissions": [
            "dashboard.view", "leads.view", "territories.view", "commissions.view"
        ]
    },
    "viewer": {
        "level": 20,
        "description": "Read-only access",
        "permissions": ["dashboard.view", "analytics.view"]
    }
}

# ============ Models ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: Dict[str, Any]
    expires_at: str

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "sales_rep"
    territories: List[str] = []
    custom_permissions: List[str] = []

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    territories: Optional[List[str]] = None
    custom_permissions: Optional[List[str]] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ============ Utility Functions ============

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = "solar_empire_salt_2024"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == hashed

def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token."""
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": expiration,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_user_permissions(role: str, custom_permissions: List[str] = []) -> List[str]:
    """Get all permissions for a user based on role and custom permissions."""
    role_perms = ROLES.get(role, {}).get("permissions", [])
    if "*" in role_perms:
        return ["*"]
    return list(set(role_perms + custom_permissions))

def has_permission(user_permissions: List[str], required_permission: str) -> bool:
    """Check if user has a specific permission."""
    if "*" in user_permissions:
        return True
    return required_permission in user_permissions

# ============ Auth Dependency ============

async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    """Dependency to get current authenticated user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Support "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    payload = decode_token(token)
    
    # Get fresh user data from DB
    user = db.admin_users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=401, detail="User account is not active")
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "permissions": get_user_permissions(user["role"], user.get("custom_permissions", []))
    }

# ============ Initialize Super Admin ============

def ensure_super_admin():
    """Ensure at least one super admin exists."""
    existing = db.admin_users.find_one({"role": "super_admin"})
    if not existing:
        # Create default super admin
        db.admin_users.insert_one({
            "name": "Super Admin",
            "email": "admin@solarempire.com",
            "password_hash": hash_password("SolarEmpire2024!"),
            "role": "super_admin",
            "status": "active",
            "territories": [],
            "custom_permissions": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        })
        print("✅ Default super admin created: admin@solarempire.com / SolarEmpire2024!")

# Run on module load
ensure_super_admin()

# ============ Authentication Endpoints ============

@router.post("/login", response_model=LoginResponse)
async def admin_login(request: LoginRequest):
    """Login to admin dashboard."""
    user = db.admin_users.find_one({"email": request.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is not active")
    
    # Update last login
    db.admin_users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(str(user["_id"]), user["email"], user["role"])
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    return LoginResponse(
        success=True,
        token=token,
        user={
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "permissions": get_user_permissions(user["role"], user.get("custom_permissions", []))
        },
        expires_at=expiration.isoformat()
    )

@router.get("/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current logged-in user info."""
    return {
        "success": True,
        "user": current_user
    }

@router.post("/logout")
async def admin_logout():
    """Logout (client should discard token)."""
    return {"success": True, "message": "Logged out successfully"}

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Change current user's password."""
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "password_hash": hash_password(request.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Password changed successfully"}

# ============ User Management (Super Admin / Admin Only) ============

@router.get("/users")
async def list_admin_users(current_user: Dict = Depends(get_current_user)):
    """List all admin users."""
    if not has_permission(current_user["permissions"], "users.view"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    users = []
    cursor = db.admin_users.find({})
    
    for user in cursor:
        users.append({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "status": user.get("status", "active"),
            "territories": user.get("territories", []),
            "permissions": get_user_permissions(user["role"], user.get("custom_permissions", [])),
            "last_login": user.get("last_login"),
            "created_at": user.get("created_at")
        })
    
    return {"success": True, "users": users}

@router.post("/users")
async def create_admin_user(
    request: CreateUserRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new admin user."""
    if not has_permission(current_user["permissions"], "users.edit"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if role is valid
    if request.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(ROLES.keys())}")
    
    # Check if email already exists
    existing = db.admin_users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Only super_admin can create other super_admins
    if request.role == "super_admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create other super admins")
    
    user_data = {
        "name": request.name,
        "email": request.email.lower(),
        "password_hash": hash_password(request.password),
        "role": request.role,
        "status": "active",
        "territories": request.territories,
        "custom_permissions": request.custom_permissions,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "last_login": None
    }
    
    result = db.admin_users.insert_one(user_data)
    
    return {
        "success": True,
        "message": f"User {request.name} created successfully",
        "user_id": str(result.inserted_id)
    }

@router.put("/users/{user_id}")
async def update_admin_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Update an admin user."""
    if not has_permission(current_user["permissions"], "users.edit"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Get target user
    target_user = db.admin_users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent editing super_admin unless you are super_admin
    if target_user["role"] == "super_admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify super admin")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.name:
        update_data["name"] = request.name
    if request.role:
        if request.role not in ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role")
        # Only super_admin can promote to super_admin
        if request.role == "super_admin" and current_user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="Cannot promote to super admin")
        update_data["role"] = request.role
    if request.status:
        if request.status not in ["active", "inactive", "suspended"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = request.status
    if request.territories is not None:
        update_data["territories"] = request.territories
    if request.custom_permissions is not None:
        update_data["custom_permissions"] = request.custom_permissions
    
    db.admin_users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    return {"success": True, "message": "User updated successfully"}

@router.delete("/users/{user_id}")
async def delete_admin_user(
    user_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete an admin user."""
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can delete users")
    
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Prevent deleting the last super_admin
    target = db.admin_users.find_one({"_id": ObjectId(user_id)})
    if target and target["role"] == "super_admin":
        super_admin_count = db.admin_users.count_documents({"role": "super_admin"})
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last super admin")
    
    db.admin_users.delete_one({"_id": ObjectId(user_id)})
    
    return {"success": True, "message": "User deleted successfully"}

# ============ Roles & Permissions Info ============

@router.get("/roles")
async def get_available_roles(current_user: Dict = Depends(get_current_user)):
    """Get all available roles and their permissions."""
    roles_info = []
    for role_name, role_data in ROLES.items():
        roles_info.append({
            "name": role_name,
            "level": role_data["level"],
            "description": role_data["description"],
            "permissions": role_data["permissions"]
        })
    
    return {
        "success": True,
        "roles": sorted(roles_info, key=lambda x: -x["level"])
    }

@router.get("/permissions")
async def get_all_permissions():
    """Get all available permissions."""
    permissions = [
        {"key": "dashboard.view", "name": "View Dashboard", "category": "Dashboard"},
        {"key": "users.view", "name": "View Users", "category": "Users"},
        {"key": "users.edit", "name": "Edit Users", "category": "Users"},
        {"key": "leads.view", "name": "View Leads", "category": "Leads"},
        {"key": "leads.edit", "name": "Edit Leads", "category": "Leads"},
        {"key": "territories.view", "name": "View Territories", "category": "Territories"},
        {"key": "territories.edit", "name": "Edit Territories", "category": "Territories"},
        {"key": "campaigns.view", "name": "View Campaigns", "category": "Campaigns"},
        {"key": "campaigns.edit", "name": "Edit Campaigns", "category": "Campaigns"},
        {"key": "commissions.view", "name": "View Commissions", "category": "Commissions"},
        {"key": "commissions.edit", "name": "Edit Commissions", "category": "Commissions"},
        {"key": "analytics.view", "name": "View Analytics", "category": "Analytics"},
        {"key": "settings.view", "name": "View Settings", "category": "Settings"},
        {"key": "settings.edit", "name": "Edit Settings", "category": "Settings"},
    ]
    
    return {"success": True, "permissions": permissions}
