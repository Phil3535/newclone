import requests
import os
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# TMDB API Keys (rotating for rate limit handling)
TMDB_API_KEYS = [
    "c8dea14dc917687ac631a52620e4f7ad",
    "3cb41ecea3bf606c56552db3d17adefd"
]

current_key_index = 0

class TMDBService:
    BASE_URL = "https://api.themoviedb.org/3"
    IMAGE_BASE_URL = "https://image.tmdb.org/t/p"
    
    @staticmethod
    def get_api_key():
        """Get current API key with rotation support"""
        global current_key_index
        return TMDB_API_KEYS[current_key_index % len(TMDB_API_KEYS)]
    
    @staticmethod
    def rotate_key():
        """Rotate to next API key on rate limit"""
        global current_key_index
        current_key_index += 1
        logger.info(f"Rotated to TMDB API key index: {current_key_index % len(TMDB_API_KEYS)}")
    
    @staticmethod
    def make_request(endpoint: str, params: Dict = None) -> Optional[Dict]:
        """Make request to TMDB API with retry logic"""
        if params is None:
            params = {}
        
        params['api_key'] = TMDBService.get_api_key()
        
        try:
            url = f"{TMDBService.BASE_URL}{endpoint}"
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 429:  # Rate limit
                logger.warning("TMDB rate limit hit, rotating key")
                TMDBService.rotate_key()
                params['api_key'] = TMDBService.get_api_key()
                response = requests.get(url, params=params, timeout=10)
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"TMDB API error: {str(e)}")
            return None
    
    @staticmethod
    def format_movie(movie: Dict) -> Dict:
        """Format TMDB movie data to app format"""
        try:
            year = movie.get('release_date', '')[:4] if movie.get('release_date') else 'N/A'
            
            return {
                'id': movie.get('id'),
                'title': movie.get('title', 'Unknown'),
                'type': 'movie',
                'poster': f"{TMDBService.IMAGE_BASE_URL}/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
                'backdrop': f"{TMDBService.IMAGE_BASE_URL}/original{movie.get('backdrop_path')}" if movie.get('backdrop_path') else None,
                'rating': round(movie.get('vote_average', 0), 1),
                'year': year,
                'genre': ', '.join([g['name'] for g in movie.get('genres', [])])[:50] if 'genres' in movie else '',
                'synopsis': movie.get('overview', 'No description available.'),
                'duration': f"{movie.get('runtime', 0)} min" if movie.get('runtime') else 'N/A',
                'popularity': movie.get('popularity', 0)
            }
        except Exception as e:
            logger.error(f"Error formatting movie: {str(e)}")
            return None
    
    @staticmethod
    def format_tv(show: Dict) -> Dict:
        """Format TMDB TV show data to app format"""
        try:
            year = show.get('first_air_date', '')[:4] if show.get('first_air_date') else 'N/A'
            
            return {
                'id': show.get('id'),
                'title': show.get('name', 'Unknown'),
                'type': 'tv',
                'poster': f"{TMDBService.IMAGE_BASE_URL}/w500{show.get('poster_path')}" if show.get('poster_path') else None,
                'backdrop': f"{TMDBService.IMAGE_BASE_URL}/original{show.get('backdrop_path')}" if show.get('backdrop_path') else None,
                'rating': round(show.get('vote_average', 0), 1),
                'year': year,
                'genre': ', '.join([g['name'] for g in show.get('genres', [])])[:50] if 'genres' in show else '',
                'synopsis': show.get('overview', 'No description available.'),
                'seasons': show.get('number_of_seasons', 1),
                'popularity': show.get('popularity', 0)
            }
        except Exception as e:
            logger.error(f"Error formatting TV show: {str(e)}")
            return None
    
    @staticmethod
    def get_trending(page: int = 1) -> List[Dict]:
        """Get trending movies and TV shows"""
        data = TMDBService.make_request('/trending/all/week', {'page': page})
        if not data or 'results' not in data:
            return []
        
        results = []
        for item in data['results'][:20]:  # Limit to 20 items
            if item.get('media_type') == 'movie':
                formatted = TMDBService.format_movie(item)
            elif item.get('media_type') == 'tv':
                formatted = TMDBService.format_tv(item)
            else:
                continue
            
            if formatted:
                results.append(formatted)
        
        return results
    
    @staticmethod
    def get_movies(page: int = 1) -> List[Dict]:
        """Get popular movies"""
        data = TMDBService.make_request('/movie/popular', {'page': page})
        if not data or 'results' not in data:
            return []
        
        results = []
        for movie in data['results']:
            formatted = TMDBService.format_movie(movie)
            if formatted:
                results.append(formatted)
        
        return results
    
    @staticmethod
    def get_tv_shows(page: int = 1) -> List[Dict]:
        """Get popular TV shows"""
        data = TMDBService.make_request('/tv/popular', {'page': page})
        if not data or 'results' not in data:
            return []
        
        results = []
        for show in data['results']:
            formatted = TMDBService.format_tv(show)
            if formatted:
                results.append(formatted)
        
        return results
    
    @staticmethod
    def get_anime(page: int = 1) -> List[Dict]:
        """Get anime content (Animation genre from Japan)"""
        data = TMDBService.make_request('/discover/tv', {
            'page': page,
            'with_genres': 16,  # Animation genre
            'with_origin_country': 'JP',  # Japan
            'sort_by': 'popularity.desc'
        })
        if not data or 'results' not in data:
            return []
        
        results = []
        for show in data['results']:
            formatted = TMDBService.format_tv(show)
            if formatted:
                formatted['type'] = 'anime'
                results.append(formatted)
        
        return results
    
    @staticmethod
    def get_details(content_type: str, content_id: int) -> Optional[Dict]:
        """Get detailed information for movie or TV show"""
        endpoint = f"/{content_type}/{content_id}"
        data = TMDBService.make_request(endpoint, {'append_to_response': 'credits,videos'})
        
        if not data:
            return None
        
        # Format based on type
        if content_type == 'movie':
            formatted = TMDBService.format_movie(data)
        else:
            formatted = TMDBService.format_tv(data)
        
        if not formatted:
            return None
        
        # Add cast information
        if 'credits' in data and 'cast' in data['credits']:
            cast_list = [actor['name'] for actor in data['credits']['cast'][:5]]
            formatted['cast'] = ', '.join(cast_list)
        else:
            formatted['cast'] = 'N/A'
        
        # Add videos
        videos = []
        if 'videos' in data and 'results' in data['videos']:
            for video in data['videos']['results']:
                if video.get('site') == 'YouTube' and video.get('type') in ['Trailer', 'Teaser']:
                    videos.append({
                        'key': video['key'],
                        'name': video['name'],
                        'type': video['type']
                    })
        formatted['videos'] = videos
        
        return formatted
    
    @staticmethod
    def search(query: str, page: int = 1) -> List[Dict]:
        """Search for movies and TV shows"""
        data = TMDBService.make_request('/search/multi', {
            'query': query,
            'page': page
        })
        
        if not data or 'results' not in data:
            return []
        
        results = []
        for item in data['results']:
            if item.get('media_type') == 'movie':
                formatted = TMDBService.format_movie(item)
            elif item.get('media_type') == 'tv':
                formatted = TMDBService.format_tv(item)
            else:
                continue
            
            if formatted:
                results.append(formatted)
        
        return results
    
    @staticmethod
    def get_by_genre(genre_name: str, page: int = 1) -> List[Dict]:
        """Get content by genre name"""
        # Get genre list first
        movie_genres = TMDBService.make_request('/genre/movie/list')
        tv_genres = TMDBService.make_request('/genre/tv/list')
        
        genre_id = None
        if movie_genres and 'genres' in movie_genres:
            for genre in movie_genres['genres']:
                if genre['name'].lower() == genre_name.lower():
                    genre_id = genre['id']
                    break
        
        if not genre_id:
            return []
        
        # Get movies with this genre
        data = TMDBService.make_request('/discover/movie', {
            'with_genres': genre_id,
            'page': page,
            'sort_by': 'popularity.desc'
        })
        
        if not data or 'results' not in data:
            return []
        
        results = []
        for movie in data['results']:
            formatted = TMDBService.format_movie(movie)
            if formatted:
                results.append(formatted)
        
        return results
