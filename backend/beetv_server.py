from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from tmdb_service import TMDBService


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class WatchlistItem(BaseModel):
    user_id: str
    content_id: int
    content_type: str
    content_data: dict
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "BeeTV API - Ready to stream!"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Content Endpoints
@api_router.get("/content/trending")
async def get_trending(page: int = Query(1, ge=1, le=100)):
    """Get trending movies and TV shows"""
    try:
        results = TMDBService.get_trending(page)
        return {"results": results, "page": page}
    except Exception as e:
        logger.error(f"Error fetching trending: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch trending content")

@api_router.get("/content/movies")
async def get_movies(page: int = Query(1, ge=1, le=100)):
    """Get popular movies"""
    try:
        results = TMDBService.get_movies(page)
        return {"results": results, "page": page}
    except Exception as e:
        logger.error(f"Error fetching movies: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch movies")

@api_router.get("/content/tv-shows")
async def get_tv_shows(page: int = Query(1, ge=1, le=100)):
    """Get popular TV shows"""
    try:
        results = TMDBService.get_tv_shows(page)
        return {"results": results, "page": page}
    except Exception as e:
        logger.error(f"Error fetching TV shows: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch TV shows")

@api_router.get("/content/anime")
async def get_anime(page: int = Query(1, ge=1, le=100)):
    """Get anime content"""
    try:
        results = TMDBService.get_anime(page)
        return {"results": results, "page": page}
    except Exception as e:
        logger.error(f"Error fetching anime: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch anime")

@api_router.get("/content/details/{content_type}/{content_id}")
async def get_content_details(content_type: str, content_id: int):
    """Get detailed information for a movie or TV show"""
    if content_type not in ['movie', 'tv']:
        raise HTTPException(status_code=400, detail="Invalid content type. Use 'movie' or 'tv'")
    
    try:
        result = TMDBService.get_details(content_type, content_id)
        if not result:
            raise HTTPException(status_code=404, detail="Content not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching content details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content details")

@api_router.get("/content/search")
async def search_content(q: str = Query(..., min_length=1), page: int = Query(1, ge=1, le=100)):
    """Search for movies and TV shows"""
    try:
        results = TMDBService.search(q, page)
        return {"results": results, "page": page, "query": q}
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search content")

@api_router.get("/content/genre/{genre_name}")
async def get_by_genre(genre_name: str, page: int = Query(1, ge=1, le=100)):
    """Get content by genre"""
    try:
        results = TMDBService.get_by_genre(genre_name, page)
        return {"results": results, "page": page, "genre": genre_name}
    except Exception as e:
        logger.error(f"Error fetching by genre: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content by genre")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()