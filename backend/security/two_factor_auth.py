"""
Two-Factor Authentication (2FA) System
TOTP-based authentication for admin and privileged users.
Uses pyotp for TOTP generation and verification.
"""

import os
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]


class TwoFactorAuth:
    """Service for managing Two-Factor Authentication"""
    
    def __init__(self, issuer_name: str = "Solar Empire"):
        self.issuer = issuer_name
        self.totp_interval = 30  # Time step in seconds
        self.totp_digits = 6     # Number of digits in OTP
    
    def generate_secret(self) -> str:
        """Generate a new TOTP secret for a user"""
        return pyotp.random_base32()
    
    def get_totp(self, secret: str) -> pyotp.TOTP:
        """Get TOTP instance for a secret"""
        return pyotp.TOTP(
            secret,
            interval=self.totp_interval,
            digits=self.totp_digits
        )
    
    def generate_qr_code(self, secret: str, user_email: str) -> str:
        """
        Generate a QR code for setting up 2FA in authenticator apps.
        Returns base64 encoded PNG image.
        """
        totp = self.get_totp(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user_email,
            issuer_name=self.issuer
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def verify_code(self, secret: str, code: str, valid_window: int = 1) -> bool:
        """
        Verify a TOTP code.
        
        Args:
            secret: User's TOTP secret
            code: The 6-digit code to verify
            valid_window: Number of time steps to check before/after current (default 1)
        
        Returns:
            True if code is valid, False otherwise
        """
        if not code or len(code) != 6 or not code.isdigit():
            return False
        
        totp = self.get_totp(secret)
        return totp.verify(code, valid_window=valid_window)
    
    def get_current_code(self, secret: str) -> str:
        """Get the current TOTP code (for testing purposes)"""
        totp = self.get_totp(secret)
        return totp.now()
    
    async def setup_2fa(self, user_id: str, user_email: str) -> Dict:
        """
        Initialize 2FA setup for a user.
        Generates a new secret and QR code.
        """
        # Generate new secret
        secret = self.generate_secret()
        
        # Generate QR code
        qr_code = self.generate_qr_code(secret, user_email)
        
        # Store pending setup (not yet verified)
        await db.two_factor_pending.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "user_email": user_email,
                    "secret": secret,
                    "created_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30)
                }
            },
            upsert=True
        )
        
        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_code}",
            "manual_entry_key": secret,
            "expires_in_minutes": 30
        }
    
    async def verify_and_enable_2fa(self, user_id: str, code: str) -> Tuple[bool, str]:
        """
        Verify the TOTP code and enable 2FA for the user.
        
        Args:
            user_id: User's ID
            code: TOTP code from authenticator app
        
        Returns:
            Tuple of (success, message)
        """
        # Get pending setup
        pending = await db.two_factor_pending.find_one({"user_id": user_id})
        
        if not pending:
            return False, "No pending 2FA setup found. Please restart the setup process."
        
        # Check if expired
        if pending.get("expires_at", datetime.now(timezone.utc)) < datetime.now(timezone.utc):
            await db.two_factor_pending.delete_one({"user_id": user_id})
            return False, "Setup session expired. Please restart the setup process."
        
        # Verify the code
        if not self.verify_code(pending["secret"], code):
            return False, "Invalid verification code. Please try again."
        
        # Generate backup codes
        backup_codes = self._generate_backup_codes()
        
        # Enable 2FA for the user
        await db.users.update_one(
            {"username": user_id},
            {
                "$set": {
                    "two_factor_enabled": True,
                    "two_factor_secret": pending["secret"],
                    "two_factor_backup_codes": backup_codes,
                    "two_factor_enabled_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Clean up pending setup
        await db.two_factor_pending.delete_one({"user_id": user_id})
        
        return True, "Two-factor authentication enabled successfully!"
    
    def _generate_backup_codes(self, count: int = 10) -> list:
        """Generate backup codes for account recovery"""
        import secrets
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    async def verify_login_code(self, user_id: str, code: str) -> Tuple[bool, str]:
        """
        Verify 2FA code during login.
        
        Args:
            user_id: User's ID
            code: TOTP code or backup code
        
        Returns:
            Tuple of (success, message)
        """
        # Get user's 2FA settings
        user = await db.users.find_one({"username": user_id})
        
        if not user:
            return False, "User not found"
        
        if not user.get("two_factor_enabled"):
            return True, "2FA not enabled for this user"
        
        secret = user.get("two_factor_secret")
        backup_codes = user.get("two_factor_backup_codes", [])
        
        # First try TOTP verification
        if self.verify_code(secret, code):
            return True, "Code verified successfully"
        
        # Then try backup codes
        if code.upper() in backup_codes:
            # Remove used backup code
            backup_codes.remove(code.upper())
            await db.users.update_one(
                {"username": user_id},
                {"$set": {"two_factor_backup_codes": backup_codes}}
            )
            return True, f"Backup code accepted. {len(backup_codes)} backup codes remaining."
        
        return False, "Invalid verification code"
    
    async def disable_2fa(self, user_id: str, code: str) -> Tuple[bool, str]:
        """
        Disable 2FA for a user (requires valid code).
        
        Args:
            user_id: User's ID
            code: Current TOTP code to verify ownership
        
        Returns:
            Tuple of (success, message)
        """
        # Verify the code first
        success, msg = await self.verify_login_code(user_id, code)
        
        if not success:
            return False, "Invalid verification code. Cannot disable 2FA."
        
        # Disable 2FA
        await db.users.update_one(
            {"username": user_id},
            {
                "$set": {
                    "two_factor_enabled": False,
                    "two_factor_disabled_at": datetime.now(timezone.utc)
                },
                "$unset": {
                    "two_factor_secret": "",
                    "two_factor_backup_codes": ""
                }
            }
        )
        
        return True, "Two-factor authentication disabled successfully"
    
    async def get_2fa_status(self, user_id: str) -> Dict:
        """Get the 2FA status for a user"""
        user = await db.users.find_one(
            {"username": user_id},
            {"two_factor_enabled": 1, "two_factor_enabled_at": 1, "two_factor_backup_codes": 1}
        )
        
        if not user:
            return {"enabled": False, "error": "User not found"}
        
        backup_count = len(user.get("two_factor_backup_codes", []))
        
        return {
            "enabled": user.get("two_factor_enabled", False),
            "enabled_at": user.get("two_factor_enabled_at", None),
            "backup_codes_remaining": backup_count,
            "backup_codes_warning": backup_count < 3 if backup_count > 0 else False
        }
    
    async def regenerate_backup_codes(self, user_id: str, code: str) -> Tuple[bool, Optional[list]]:
        """
        Regenerate backup codes (requires valid TOTP code).
        
        Args:
            user_id: User's ID
            code: Current TOTP code to verify ownership
        
        Returns:
            Tuple of (success, new_backup_codes or None)
        """
        # Verify the code first
        user = await db.users.find_one({"username": user_id})
        
        if not user or not user.get("two_factor_enabled"):
            return False, None
        
        if not self.verify_code(user.get("two_factor_secret", ""), code):
            return False, None
        
        # Generate new backup codes
        new_codes = self._generate_backup_codes()
        
        await db.users.update_one(
            {"username": user_id},
            {
                "$set": {
                    "two_factor_backup_codes": new_codes,
                    "backup_codes_regenerated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return True, new_codes


# Global instance
two_factor_auth = TwoFactorAuth()
