"""
Team Chat Routes
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from database import db
from models import ChatMessageModel
from typing import List
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatMessageModel)
async def create_message(message: ChatMessageModel):
    """Create a new chat message"""
    message_dict = message.dict()
    message_dict["timestamp"] = datetime.utcnow()
    await db.chat_messages.insert_one(message_dict)
    return message


@router.get("/messages")
async def get_messages(limit: int = 50, before: str = None):
    """Get chat messages with pagination"""
    query = {}
    if before:
        query["timestamp"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"messages": list(reversed(messages))}


@router.post("/messages/{message_id}/reaction")
async def toggle_reaction(message_id: str, user_id: str, emoji: str):
    """Toggle a reaction on a message"""
    message = await db.chat_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = message.get("reactions", {})
    
    if emoji not in reactions:
        reactions[emoji] = []
    
    if user_id in reactions[emoji]:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user_id)
    
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    return {"success": True, "reactions": reactions}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user_id: str):
    """Delete a chat message (only by sender)"""
    message = await db.chat_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.get("sender_id") != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    await db.chat_messages.delete_one({"id": message_id})
    return {"success": True}


@router.get("/team-members")
async def get_team_members():
    """Get all team members for mentions"""
    reps = await db.reps.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(100)
    
    if not reps:
        reps = [
            {"id": "301b2e32-f221-48df-a8c1-bfae3a76c4c6", "name": "Demo User", "email": "demo@solarempire.app"},
            {"id": "rep-001", "name": "Mike Johnson", "email": "mike@solarempire.app"},
            {"id": "rep-002", "name": "Sarah Williams", "email": "sarah@solarempire.app"},
            {"id": "rep-003", "name": "James Chen", "email": "james@solarempire.app"},
            {"id": "rep-004", "name": "Emily Rodriguez", "email": "emily@solarempire.app"}
        ]
    
    return {"members": reps}
