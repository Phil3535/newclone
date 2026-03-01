"""
Push Notifications API - Instant alerts for captured leads
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'solar_empire')]

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class DeviceRegistration(BaseModel):
    push_token: str
    user_id: Optional[str] = None
    device_type: str = "unknown"  # ios, android, web

class NotificationPayload(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None

# Expo Push Notification URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_expo_push(tokens: List[str], title: str, body: str, data: dict = None):
    """Send push notification via Expo's push service"""
    messages = []
    for token in tokens:
        if not token.startswith('ExponentPushToken'):
            continue
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "priority": "high",
        }
        if data:
            message["data"] = data
        messages.append(message)
    
    if not messages:
        logger.info("No valid Expo push tokens to send to")
        return {"success": False, "reason": "no_valid_tokens"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
            )
            result = response.json()
            logger.info(f"Push notification sent: {result}")
            return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/register")
async def register_device(registration: DeviceRegistration):
    """Register a device for push notifications"""
    doc = {
        "push_token": registration.push_token,
        "user_id": registration.user_id,
        "device_type": registration.device_type,
        "registered_at": datetime.utcnow(),
        "active": True
    }
    
    # Upsert by push_token
    await db.push_tokens.update_one(
        {"push_token": registration.push_token},
        {"$set": doc},
        upsert=True
    )
    
    logger.info(f"Device registered for push: {registration.push_token[:20]}...")
    return {"success": True, "message": "Device registered for notifications"}


@router.delete("/unregister/{push_token}")
async def unregister_device(push_token: str):
    """Unregister a device from push notifications"""
    result = await db.push_tokens.update_one(
        {"push_token": push_token},
        {"$set": {"active": False}}
    )
    return {"success": True, "modified": result.modified_count}


@router.post("/send-test")
async def send_test_notification(user_id: Optional[str] = None):
    """Send a test notification to registered devices"""
    query = {"active": True}
    if user_id:
        query["user_id"] = user_id
    
    devices = await db.push_tokens.find(query).to_list(100)
    tokens = [d["push_token"] for d in devices]
    
    if not tokens:
        raise HTTPException(status_code=404, detail="No registered devices found")
    
    result = await send_expo_push(
        tokens=tokens,
        title="🔔 Test Notification",
        body="Push notifications are working! You'll get alerts when leads come in.",
        data={"type": "test"}
    )
    
    return {"success": True, "devices_notified": len(tokens), "result": result}


async def notify_new_lead(lead_name: str, lead_phone: str, scan_id: str, savings: int):
    """Send push notification when a new lead is captured"""
    # Get all active push tokens
    devices = await db.push_tokens.find({"active": True}).to_list(100)
    tokens = [d["push_token"] for d in devices]
    
    if not tokens:
        logger.info("No devices registered for push notifications")
        return
    
    name_display = lead_name if lead_name else "A homeowner"
    
    result = await send_expo_push(
        tokens=tokens,
        title="🔥 New Lead Captured!",
        body=f"{name_display} wants solar info! Potential savings: ${savings:,}/year",
        data={
            "type": "new_lead",
            "scan_id": scan_id,
            "phone": lead_phone,
            "route": "/qr-leads"
        }
    )
    
    # Log notification
    await db.notification_logs.insert_one({
        "type": "new_lead",
        "scan_id": scan_id,
        "lead_phone": lead_phone,
        "tokens_sent": len(tokens),
        "result": result,
        "sent_at": datetime.utcnow()
    })
    
    return result


@router.get("/stats")
async def get_notification_stats():
    """Get push notification statistics"""
    total_devices = await db.push_tokens.count_documents({"active": True})
    total_sent = await db.notification_logs.count_documents({})
    
    # Get last 5 notifications
    recent = await db.notification_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(5).to_list(5)
    
    for n in recent:
        if isinstance(n.get('sent_at'), datetime):
            n['sent_at'] = n['sent_at'].isoformat()
    
    return {
        "active_devices": total_devices,
        "notifications_sent": total_sent,
        "recent_notifications": recent
    }
