import requests
import logging
from typing import Optional, Dict, List
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class XtremeCodesService:
    """Service to interact with Xtreme Codes API"""
    
    @staticmethod
    def build_url(server_url: str, username: str, password: str, action: str, **params) -> str:
        """Build Xtreme Codes API URL"""
        # Ensure server_url ends with /
        if not server_url.endswith('/'):
            server_url += '/'
        
        base_url = urljoin(server_url, 'player_api.php')
        
        # Build query parameters
        query_params = {
            'username': username,
            'password': password,
            'action': action
        }
        query_params.update(params)
        
        # Build URL
        query_string = '&'.join([f"{k}={v}" for k, v in query_params.items()])
        return f"{base_url}?{query_string}"
    
    @staticmethod
    def authenticate(server_url: str, username: str, password: str) -> Optional[Dict]:
        """Authenticate user with Xtreme Codes server"""
        try:
            url = XtremeCodesService.build_url(server_url, username, password, 'player_api')
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Check if authentication is successful
            user_info = data.get('user_info', {})
            if user_info.get('auth') == 1 or user_info.get('is_trial') == '1':
                return data
            else:
                logger.warning(f"Authentication failed for user {username}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Xtreme Codes auth error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during auth: {str(e)}")
            return None
    
    @staticmethod
    def get_live_streams(server_url: str, username: str, password: str, category_id: Optional[int] = None) -> List[Dict]:
        """Get list of live TV channels"""
        try:
            params = {}
            if category_id:
                params['category_id'] = category_id
            
            url = XtremeCodesService.build_url(server_url, username, password, 'get_live_streams', **params)
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            channels = response.json()
            return channels if isinstance(channels, list) else []
            
        except Exception as e:
            logger.error(f"Error fetching live streams: {str(e)}")
            return []
    
    @staticmethod
    def get_live_categories(server_url: str, username: str, password: str) -> List[Dict]:
        """Get list of channel categories"""
        try:
            url = XtremeCodesService.build_url(server_url, username, password, 'get_live_categories')
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            categories = response.json()
            return categories if isinstance(categories, list) else []
            
        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            return []
    
    @staticmethod
    def get_epg(server_url: str, username: str, password: str, stream_id: Optional[int] = None) -> Dict:
        """Get EPG (Electronic Program Guide) data"""
        try:
            params = {}
            if stream_id:
                params['stream_id'] = stream_id
            
            url = XtremeCodesService.build_url(server_url, username, password, 'get_simple_data_table', type='epg', **params)
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            epg_data = response.json()
            return epg_data if isinstance(epg_data, dict) else {}
            
        except Exception as e:
            logger.error(f"Error fetching EPG: {str(e)}")
            return {}
    
    @staticmethod
    def get_stream_url(server_url: str, username: str, password: str, stream_id: int, extension: str = 'm3u8') -> str:
        """Build stream URL for playback"""
        # Ensure server_url ends with /
        if not server_url.endswith('/'):
            server_url += '/'
        
        # Format: {server}/live/{username}/{password}/{stream_id}.{extension}
        stream_url = f"{server_url}live/{username}/{password}/{stream_id}.{extension}"
        return stream_url
    
    @staticmethod
    def get_vod_streams(server_url: str, username: str, password: str, category_id: Optional[int] = None) -> List[Dict]:
        """Get VOD (Video on Demand) content"""
        try:
            params = {}
            if category_id:
                params['category_id'] = category_id
            
            url = XtremeCodesService.build_url(server_url, username, password, 'get_vod_streams', **params)
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            vod_list = response.json()
            return vod_list if isinstance(vod_list, list) else []
            
        except Exception as e:
            logger.error(f"Error fetching VOD: {str(e)}")
            return []
    
    @staticmethod
    def get_series(server_url: str, username: str, password: str, category_id: Optional[int] = None) -> List[Dict]:
        """Get TV series content"""
        try:
            params = {}
            if category_id:
                params['category_id'] = category_id
            
            url = XtremeCodesService.build_url(server_url, username, password, 'get_series', **params)
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            series_list = response.json()
            return series_list if isinstance(series_list, list) else []
            
        except Exception as e:
            logger.error(f"Error fetching series: {str(e)}")
            return []
