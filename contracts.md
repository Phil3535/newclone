# BeeTV Clone - Backend Integration Contracts

## Overview
Integrate TMDB API to fetch real movie/TV show data and YouTube trailers for playback.

## API Keys
- TMDB API Keys (rotating): 
  - c8dea14dc917687ac631a52620e4f7ad
  - 3cb41ecea3bf606c56552db3d17adefd

## Backend Endpoints

### 1. GET /api/content/trending
**Purpose**: Get trending movies and TV shows
**Response**: 
```json
[
  {
    "id": 123,
    "title": "Movie Name",
    "type": "movie",
    "poster": "https://image.tmdb.org/t/p/w500/...",
    "backdrop": "https://image.tmdb.org/t/p/original/...",
    "rating": 8.5,
    "year": 2024,
    "genre": "Action, Drama",
    "synopsis": "...",
    "duration": "120 min",
    "cast": "Actor 1, Actor 2"
  }
]
```

### 2. GET /api/content/movies
**Purpose**: Get popular movies
**Query Params**: page (optional)

### 3. GET /api/content/tv-shows
**Purpose**: Get popular TV shows
**Query Params**: page (optional)

### 4. GET /api/content/anime
**Purpose**: Get anime content (anime genre from TMDB)

### 5. GET /api/content/details/{type}/{id}
**Purpose**: Get detailed info for specific movie/TV show
**Path Params**: type (movie/tv), id (TMDB ID)
**Response**: Full details including cast, videos, similar content

### 6. GET /api/content/videos/{type}/{id}
**Purpose**: Get trailer/video links
**Response**:
```json
{
  "trailers": [
    {
      "key": "youtube_video_id",
      "name": "Official Trailer",
      "site": "YouTube",
      "type": "Trailer"
    }
  ]
}
```

### 7. GET /api/content/search
**Purpose**: Search movies/TV shows
**Query Params**: q (search query)

### 8. GET /api/content/genre/{genre}
**Purpose**: Get content by genre

## Frontend Integration Changes

### Files to Update:
1. **mockData.js** → Remove mock data usage
2. **HomePage.jsx** → Fetch from /api/content/trending
3. **MoviesPage.jsx** → Fetch from /api/content/movies
4. **TVShowsPage.jsx** → Fetch from /api/content/tv-shows
5. **AnimePage.jsx** → Fetch from /api/content/anime
6. **DetailsPage.jsx** → Fetch from /api/content/details and /api/content/videos
7. **SearchPage.jsx** → Fetch from /api/content/search
8. **Create VideoPlayer.jsx** → YouTube iframe player component

## Video Playback Strategy
- Fetch trailer videos from TMDB API
- Use YouTube iframe embed for playback
- Show first available trailer when "Play" is clicked
- Fallback message if no trailer available

## Data Mapping
TMDB → BeeTV Format:
- `poster_path` → `poster`
- `backdrop_path` → `backdrop`
- `vote_average` → `rating`
- `release_date` → `year`
- `runtime` → `duration`
- `overview` → `synopsis`

## Error Handling
- Handle TMDB API rate limits (rotate keys)
- Cache responses for 1 hour
- Fallback to alternative key on failure
- Show user-friendly error messages
