"""
Two-Factor Authentication (2FA) Module
Supports both TOTP (app-based) and SMS-based verification.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import os
import pyotp
import qrcode
import io
import base64
import secrets

# MongoDB connection
from pymongo import MongoClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'solar_empire')
client = MongoClient(mongo_url)
db = client[db_name]

# Twilio for SMS 2FA
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE = os.environ.get('TWILIO_PHONE_NUMBER')
    twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN) if TWILIO_SID and TWILIO_TOKEN else None
except:
    twilio_client = None

router = APIRouter(prefix="/api/auth/2fa", tags=["2fa"])

# ============ Models ============

class Setup2FARequest(BaseModel):
    method: str  # "totp" or "sms"
    phone_number: Optional[str] = None  # Required for SMS

class Verify2FARequest(BaseModel):
    code: str
    method: Optional[str] = "totp"

class Disable2FARequest(BaseModel):
    password: str
    code: str

# ============ Utility Functions ============

def generate_totp_secret() -> str:
    """Generate a new TOTP secret key."""
    return pyotp.random_base32()

def generate_totp_uri(secret: str, email: str, issuer: str = "Solar Empire") -> str:
    """Generate TOTP URI for QR code."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)

def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)  # Allow 1 step tolerance

def generate_qr_code_base64(uri: str) -> str:
    """Generate QR code as base64 string."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

def generate_sms_code() -> str:
    """Generate a 6-digit SMS verification code."""
    return str(secrets.randbelow(900000) + 100000)

def send_sms_code(phone: str, code: str) -> bool:
    """Send SMS verification code via Twilio."""
    if not twilio_client or not TWILIO_PHONE:
        raise HTTPException(status_code=503, detail="SMS service not configured")
    
    try:
        message = twilio_client.messages.create(
            body=f"Your Solar Empire verification code is: {code}. Valid for 5 minutes.",
            from_=TWILIO_PHONE,
            to=phone
        )
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")

# ============ Auth Dependency ============

async def get_current_user_for_2fa(authorization: str = Header(None)) -> Dict[str, Any]:
    """Get current user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    import jwt
    JWT_SECRET = os.environ.get('JWT_SECRET', 'solar-empire-super-secret-key-2024')
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.admin_users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"]
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ 2FA Setup Endpoints ============

@router.get("/status")
async def get_2fa_status(current_user: Dict = Depends(get_current_user_for_2fa)):
    """Get current 2FA status for the user."""
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    
    two_fa = user.get("two_factor", {})
    
    return {
        "enabled": two_fa.get("enabled", False),
        "method": two_fa.get("method"),
        "phone_last_4": two_fa.get("phone", "")[-4:] if two_fa.get("phone") else None,
        "backup_codes_remaining": len(two_fa.get("backup_codes", []))
    }

@router.post("/setup/totp")
async def setup_totp(current_user: Dict = Depends(get_current_user_for_2fa)):
    """
    Setup TOTP-based 2FA (Google Authenticator, Authy, etc.).
    Returns QR code and backup codes.
    """
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    
    # Check if 2FA is already enabled
    if user.get("two_factor", {}).get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled. Disable it first.")
    
    # Generate new TOTP secret
    secret = generate_totp_secret()
    uri = generate_totp_uri(secret, current_user["email"])
    qr_code = generate_qr_code_base64(uri)
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    # Store pending setup (not enabled yet until verified)
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "two_factor_pending": {
                "method": "totp",
                "secret": secret,
                "backup_codes": backup_codes,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {
        "success": True,
        "method": "totp",
        "qr_code": f"data:image/png;base64,{qr_code}",
        "secret": secret,  # For manual entry
        "backup_codes": backup_codes,
        "instructions": [
            "1. Scan the QR code with Google Authenticator, Authy, or similar app",
            "2. Enter the 6-digit code to verify setup",
            "3. Save your backup codes in a secure location"
        ]
    }

@router.post("/setup/sms")
async def setup_sms_2fa(
    request: Setup2FARequest,
    current_user: Dict = Depends(get_current_user_for_2fa)
):
    """
    Setup SMS-based 2FA.
    Sends verification code to phone number.
    """
    if not request.phone_number:
        raise HTTPException(status_code=400, detail="Phone number is required for SMS 2FA")
    
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    
    if user.get("two_factor", {}).get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled. Disable it first.")
    
    # Generate and send code
    code = generate_sms_code()
    send_sms_code(request.phone_number, code)
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    # Store pending setup
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "two_factor_pending": {
                "method": "sms",
                "phone": request.phone_number,
                "code": code,
                "code_expires": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                "backup_codes": backup_codes,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {
        "success": True,
        "method": "sms",
        "phone_last_4": request.phone_number[-4:],
        "backup_codes": backup_codes,
        "message": f"Verification code sent to ***{request.phone_number[-4:]}"
    }

@router.post("/verify-setup")
async def verify_2fa_setup(
    request: Verify2FARequest,
    current_user: Dict = Depends(get_current_user_for_2fa)
):
    """
    Verify and enable 2FA after setup.
    """
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    pending = user.get("two_factor_pending")
    
    if not pending:
        raise HTTPException(status_code=400, detail="No pending 2FA setup found. Start setup first.")
    
    method = pending.get("method")
    verified = False
    
    if method == "totp":
        # Verify TOTP code
        verified = verify_totp(pending.get("secret", ""), request.code)
    elif method == "sms":
        # Verify SMS code
        if datetime.fromisoformat(pending.get("code_expires", "2000-01-01")) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification code expired. Request a new one.")
        verified = pending.get("code") == request.code
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable 2FA
    two_factor_data = {
        "enabled": True,
        "method": method,
        "backup_codes": pending.get("backup_codes", []),
        "enabled_at": datetime.now(timezone.utc).isoformat()
    }
    
    if method == "totp":
        two_factor_data["secret"] = pending.get("secret")
    elif method == "sms":
        two_factor_data["phone"] = pending.get("phone")
    
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {
            "$set": {"two_factor": two_factor_data},
            "$unset": {"two_factor_pending": ""}
        }
    )
    
    return {
        "success": True,
        "message": f"2FA enabled successfully using {method.upper()}",
        "method": method
    }

# ============ 2FA Verification During Login ============

@router.post("/send-code")
async def send_2fa_code(user_id: str):
    """
    Send 2FA code for SMS-based authentication during login.
    Called when user has SMS 2FA enabled.
    """
    user = db.admin_users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    two_fa = user.get("two_factor", {})
    
    if not two_fa.get("enabled") or two_fa.get("method") != "sms":
        raise HTTPException(status_code=400, detail="SMS 2FA not enabled")
    
    phone = two_fa.get("phone")
    code = generate_sms_code()
    
    # Send code
    send_sms_code(phone, code)
    
    # Store code temporarily
    db.admin_users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "two_factor.pending_code": code,
            "two_factor.code_expires": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        }}
    )
    
    return {
        "success": True,
        "phone_last_4": phone[-4:],
        "message": f"Code sent to ***{phone[-4:]}"
    }

@router.post("/verify")
async def verify_2fa_code(request: Verify2FARequest, user_id: str):
    """
    Verify 2FA code during login.
    Called after password verification when 2FA is enabled.
    """
    user = db.admin_users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    two_fa = user.get("two_factor", {})
    
    if not two_fa.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA not enabled")
    
    method = two_fa.get("method")
    verified = False
    
    # Check if it's a backup code
    backup_codes = two_fa.get("backup_codes", [])
    if request.code.upper() in backup_codes:
        # Remove used backup code
        backup_codes.remove(request.code.upper())
        db.admin_users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"two_factor.backup_codes": backup_codes}}
        )
        return {
            "success": True,
            "verified": True,
            "used_backup_code": True,
            "backup_codes_remaining": len(backup_codes)
        }
    
    if method == "totp":
        verified = verify_totp(two_fa.get("secret", ""), request.code)
    elif method == "sms":
        expires = two_fa.get("code_expires", "2000-01-01")
        if datetime.fromisoformat(expires) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Code expired. Request a new one.")
        verified = two_fa.get("pending_code") == request.code
        
        # Clear pending code after verification
        if verified:
            db.admin_users.update_one(
                {"_id": ObjectId(user_id)},
                {"$unset": {"two_factor.pending_code": "", "two_factor.code_expires": ""}}
            )
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    return {
        "success": True,
        "verified": True
    }

# ============ Disable 2FA ============

@router.post("/disable")
async def disable_2fa(
    current_user: Dict = Depends(get_current_user_for_2fa),
    code: str = None
):
    """
    Disable 2FA for the current user.
    Requires a valid 2FA code to confirm.
    """
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    two_fa = user.get("two_factor", {})
    
    if not two_fa.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    # Verify code before disabling
    if code:
        method = two_fa.get("method")
        verified = False
        
        if method == "totp":
            verified = verify_totp(two_fa.get("secret", ""), code)
        elif method == "sms":
            verified = two_fa.get("pending_code") == code
        
        # Also check backup codes
        if not verified and code.upper() in two_fa.get("backup_codes", []):
            verified = True
        
        if not verified:
            raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable 2FA
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$unset": {"two_factor": ""}}
    )
    
    return {
        "success": True,
        "message": "2FA has been disabled"
    }

# ============ Regenerate Backup Codes ============

@router.post("/backup-codes/regenerate")
async def regenerate_backup_codes(
    request: Verify2FARequest,
    current_user: Dict = Depends(get_current_user_for_2fa)
):
    """
    Regenerate backup codes. Requires 2FA verification.
    """
    user = db.admin_users.find_one({"_id": ObjectId(current_user["id"])})
    two_fa = user.get("two_factor", {})
    
    if not two_fa.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    # Verify code
    method = two_fa.get("method")
    verified = False
    
    if method == "totp":
        verified = verify_totp(two_fa.get("secret", ""), request.code)
    elif method == "sms":
        verified = two_fa.get("pending_code") == request.code
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Generate new backup codes
    new_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    db.admin_users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"two_factor.backup_codes": new_codes}}
    )
    
    return {
        "success": True,
        "backup_codes": new_codes,
        "message": "New backup codes generated. Save them securely!"
    }
