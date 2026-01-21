from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from xtreme_codes_service import XtremeCodesService
import base64
from cryptography.fernet import Fernet

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'empire_streams')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Encryption for IPTV credentials
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# Create the main app
app = FastAPI(title="Empire Streams API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class UserRegister(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v.lower()

class UserLogin(BaseModel):
    username: str
    password: str

class IPTVConnect(BaseModel):
    server_url: str
    port: int
    username: str
    password: str
    profile_name: Optional[str] = "Default"
    
    @validator('server_url')
    def validate_server_url(cls, v):
        # Remove port if included
        v = v.split(':')[0] if ':' in v and not v.startswith('http') else v
        if not v.startswith('http'):
            v = f'http://{v}'
        return v.rstrip('/')
    
    @validator('port')
    def validate_port(cls, v):
        if v < 1 or v > 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    subscription_status: str = "trial"
    subscription_expires: Optional[datetime] = None
    created_at: datetime

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def encrypt_credentials(data: str) -> str:
    """Encrypt sensitive data"""
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_credentials(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    return cipher_suite.decrypt(encrypted_data.encode()).decode()

# Auth Endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    
    user = {
        "_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "subscription_status": "trial",
        "subscription_expires": datetime.utcnow() + timedelta(days=7),
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    return Token(access_token=access_token)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["_id"]})
    return Token(access_token=access_token)

@api_router.get("/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile"""
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name"),
        "subscription_status": current_user.get("subscription_status", "trial"),
        "subscription_expires": current_user.get("subscription_expires"),
        "created_at": current_user.get("created_at")
    }

# IPTV Endpoints
@api_router.post("/iptv/connect")
async def connect_iptv(connection: IPTVConnect, current_user: dict = Depends(get_current_user)):
    """Connect to IPTV service via Xtreme Codes"""
    # Build full server URL with port
    full_server_url = f"{connection.server_url}:{connection.port}"
    
    # Test authentication
    auth_result = XtremeCodesService.authenticate(
        full_server_url,
        connection.username,
        connection.password
    )
    
    if not auth_result:
        raise HTTPException(status_code=400, detail="Failed to authenticate with IPTV server")
    
    # Encrypt credentials
    encrypted_credentials = {
        "server_url": encrypt_credentials(full_server_url),
        "username": encrypt_credentials(connection.username),
        "password": encrypt_credentials(connection.password),
        "profile_name": connection.profile_name,
        "user_info": auth_result.get("user_info", {}),
        "created_at": datetime.utcnow()
    }
    
    # Save to database
    profile_id = str(uuid.uuid4())
    iptv_profile = {
        "_id": profile_id,
        "user_id": current_user["_id"],
        **encrypted_credentials
    }
    
    await db.iptv_profiles.insert_one(iptv_profile)
    
    return {
        "profile_id": profile_id,
        "profile_name": connection.profile_name,
        "status": "connected",
        "user_info": auth_result.get("user_info", {})
    }

@api_router.get("/iptv/profiles")
async def get_iptv_profiles(current_user: dict = Depends(get_current_user)):
    """Get user's IPTV profiles"""
    profiles = await db.iptv_profiles.find({"user_id": current_user["_id"]}).to_list(100)
    
    return [{
        "profile_id": profile["_id"],
        "profile_name": profile.get("profile_name", "Default"),
        "created_at": profile.get("created_at")
    } for profile in profiles]

@api_router.get("/content/channels")
async def get_channels(profile_id: str, category_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get live TV channels"""
    # Get IPTV profile
    profile = await db.iptv_profiles.find_one({"_id": profile_id, "user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="IPTV profile not found")
    
    # Decrypt credentials
    server_url = decrypt_credentials(profile["server_url"])
    username = decrypt_credentials(profile["username"])
    password = decrypt_credentials(profile["password"])
    
    # Fetch channels
    channels = XtremeCodesService.get_live_streams(server_url, username, password, category_id)
    
    return {"channels": channels}

@api_router.get("/content/categories")
async def get_categories(profile_id: str, current_user: dict = Depends(get_current_user)):
    """Get channel categories"""
    # Get IPTV profile
    profile = await db.iptv_profiles.find_one({"_id": profile_id, "user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="IPTV profile not found")
    
    # Decrypt credentials
    server_url = decrypt_credentials(profile["server_url"])
    username = decrypt_credentials(profile["username"])
    password = decrypt_credentials(profile["password"])
    
    # Fetch categories
    categories = XtremeCodesService.get_live_categories(server_url, username, password)
    
    return {"categories": categories}

@api_router.get("/content/stream/{stream_id}")
async def get_stream_url(stream_id: int, profile_id: str, current_user: dict = Depends(get_current_user)):
    """Get stream URL for playback"""
    # Get IPTV profile
    profile = await db.iptv_profiles.find_one({"_id": profile_id, "user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="IPTV profile not found")
    
    # Decrypt credentials
    server_url = decrypt_credentials(profile["server_url"])
    username = decrypt_credentials(profile["username"])
    password = decrypt_credentials(profile["password"])
    
    # Build stream URL
    stream_url = XtremeCodesService.get_stream_url(server_url, username, password, stream_id)
    
    return {"stream_url": stream_url}

@api_router.get("/content/epg")
async def get_epg(profile_id: str, stream_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get EPG data"""
    # Get IPTV profile
    profile = await db.iptv_profiles.find_one({"_id": profile_id, "user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="IPTV profile not found")
    
    # Decrypt credentials
    server_url = decrypt_credentials(profile["server_url"])
    username = decrypt_credentials(profile["username"])
    password = decrypt_credentials(profile["password"])
    
    # Fetch EPG
    epg_data = XtremeCodesService.get_epg(server_url, username, password, stream_id)
    
    return epg_data

@api_router.get("/")
async def root():
    return {"message": "Empire Streams API - Stay Tuned!"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
