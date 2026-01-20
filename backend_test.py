#!/usr/bin/env python3
"""
BeeTV Backend API Test Suite
Tests all content endpoints for proper functionality and TMDB integration
"""

import requests
import json
import sys
import os
from typing import Dict, List, Any

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("❌ Could not find REACT_APP_BACKEND_URL in frontend/.env")
    sys.exit(1)

API_BASE = f"{BACKEND_URL}/api"

class BeetvAPITester:
    def __init__(self):
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        
        if success:
            self.passed_tests += 1
        else:
            self.failed_tests += 1
            
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {}
        })
        
        if not success and details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    def test_health_check(self):
        """Test GET /api/ - Health check"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'BeeTV' in data['message']:
                    self.log_result("Health Check", True, "API is responding correctly")
                    return True
                else:
                    self.log_result("Health Check", False, "Unexpected response format", 
                                  {'response': data})
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", 
                              {'response': response.text})
        except Exception as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
        return False
    
    def test_trending_content(self):
        """Test GET /api/content/trending"""
        try:
            response = requests.get(f"{API_BASE}/content/trending", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if 'results' not in data or 'page' not in data:
                    self.log_result("Trending Content", False, "Missing required fields", 
                                  {'response_keys': list(data.keys())})
                    return False
                
                results = data['results']
                if not isinstance(results, list):
                    self.log_result("Trending Content", False, "Results is not a list")
                    return False
                
                if len(results) == 0:
                    self.log_result("Trending Content", False, "No trending content returned")
                    return False
                
                # Validate first item structure
                first_item = results[0]
                required_fields = ['id', 'title', 'type', 'rating', 'year']
                missing_fields = [field for field in required_fields if field not in first_item]
                
                if missing_fields:
                    self.log_result("Trending Content", False, f"Missing fields in content: {missing_fields}",
                                  {'first_item': first_item})
                    return False
                
                self.log_result("Trending Content", True, 
                              f"Retrieved {len(results)} trending items, page {data['page']}")
                return True
            else:
                self.log_result("Trending Content", False, f"HTTP {response.status_code}",
                              {'response': response.text})
        except Exception as e:
            self.log_result("Trending Content", False, f"Request failed: {str(e)}")
        return False
    
    def test_movies(self):
        """Test GET /api/content/movies"""
        try:
            response = requests.get(f"{API_BASE}/content/movies", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'results' not in data or 'page' not in data:
                    self.log_result("Movies", False, "Missing required fields")
                    return False
                
                results = data['results']
                if not results:
                    self.log_result("Movies", False, "No movies returned")
                    return False
                
                # Check if all items are movies
                movie_items = [item for item in results if item.get('type') == 'movie']
                if len(movie_items) != len(results):
                    self.log_result("Movies", False, "Non-movie items in movies endpoint")
                    return False
                
                self.log_result("Movies", True, f"Retrieved {len(results)} movies")
                return True
            else:
                self.log_result("Movies", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Movies", False, f"Request failed: {str(e)}")
        return False
    
    def test_tv_shows(self):
        """Test GET /api/content/tv-shows"""
        try:
            response = requests.get(f"{API_BASE}/content/tv-shows", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'results' not in data:
                    self.log_result("TV Shows", False, "Missing results field")
                    return False
                
                results = data['results']
                if not results:
                    self.log_result("TV Shows", False, "No TV shows returned")
                    return False
                
                # Check if all items are TV shows
                tv_items = [item for item in results if item.get('type') == 'tv']
                if len(tv_items) != len(results):
                    self.log_result("TV Shows", False, "Non-TV items in TV shows endpoint")
                    return False
                
                self.log_result("TV Shows", True, f"Retrieved {len(results)} TV shows")
                return True
            else:
                self.log_result("TV Shows", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("TV Shows", False, f"Request failed: {str(e)}")
        return False
    
    def test_anime(self):
        """Test GET /api/content/anime"""
        try:
            response = requests.get(f"{API_BASE}/content/anime", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'results' not in data:
                    self.log_result("Anime", False, "Missing results field")
                    return False
                
                results = data['results']
                if not results:
                    self.log_result("Anime", False, "No anime content returned")
                    return False
                
                # Check if items are marked as anime
                anime_items = [item for item in results if item.get('type') == 'anime']
                if len(anime_items) != len(results):
                    self.log_result("Anime", False, "Non-anime items in anime endpoint")
                    return False
                
                self.log_result("Anime", True, f"Retrieved {len(results)} anime items")
                return True
            else:
                self.log_result("Anime", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Anime", False, f"Request failed: {str(e)}")
        return False
    
    def test_movie_details(self):
        """Test GET /api/content/details/movie/550 (Fight Club)"""
        try:
            response = requests.get(f"{API_BASE}/content/details/movie/550", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields for detailed view
                required_fields = ['id', 'title', 'type', 'synopsis', 'cast', 'videos']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Movie Details", False, f"Missing fields: {missing_fields}",
                                  {'response_keys': list(data.keys())})
                    return False
                
                # Verify it's Fight Club
                if data.get('id') != 550:
                    self.log_result("Movie Details", False, "Wrong movie ID returned")
                    return False
                
                # Check videos array exists (for trailers)
                if not isinstance(data.get('videos'), list):
                    self.log_result("Movie Details", False, "Videos field is not a list")
                    return False
                
                self.log_result("Movie Details", True, 
                              f"Retrieved details for '{data.get('title')}' with {len(data.get('videos', []))} videos")
                return True
            elif response.status_code == 404:
                self.log_result("Movie Details", False, "Movie not found (404)")
            else:
                self.log_result("Movie Details", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Movie Details", False, f"Request failed: {str(e)}")
        return False
    
    def test_tv_details(self):
        """Test GET /api/content/details/tv/1399 (Game of Thrones)"""
        try:
            response = requests.get(f"{API_BASE}/content/details/tv/1399", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['id', 'title', 'type', 'synopsis', 'cast', 'videos']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("TV Details", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify it's Game of Thrones
                if data.get('id') != 1399:
                    self.log_result("TV Details", False, "Wrong TV show ID returned")
                    return False
                
                # Check for seasons info (TV-specific)
                if 'seasons' not in data:
                    self.log_result("TV Details", False, "Missing seasons information")
                    return False
                
                self.log_result("TV Details", True, 
                              f"Retrieved details for '{data.get('title')}' with {data.get('seasons')} seasons")
                return True
            elif response.status_code == 404:
                self.log_result("TV Details", False, "TV show not found (404)")
            else:
                self.log_result("TV Details", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("TV Details", False, f"Request failed: {str(e)}")
        return False
    
    def test_search(self):
        """Test GET /api/content/search?q=spider"""
        try:
            response = requests.get(f"{API_BASE}/content/search?q=spider", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                required_fields = ['results', 'page', 'query']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Search", False, f"Missing fields: {missing_fields}")
                    return False
                
                if data.get('query') != 'spider':
                    self.log_result("Search", False, "Query parameter not returned correctly")
                    return False
                
                results = data['results']
                if not results:
                    self.log_result("Search", False, "No search results returned for 'spider'")
                    return False
                
                # Check if results are relevant (should contain spider-related content)
                spider_related = [item for item in results 
                                if 'spider' in item.get('title', '').lower()]
                
                if not spider_related:
                    self.log_result("Search", False, "No spider-related results found")
                    return False
                
                self.log_result("Search", True, 
                              f"Found {len(results)} results for 'spider', {len(spider_related)} relevant")
                return True
            else:
                self.log_result("Search", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Search", False, f"Request failed: {str(e)}")
        return False
    
    def test_genre(self):
        """Test GET /api/content/genre/Action"""
        try:
            response = requests.get(f"{API_BASE}/content/genre/Action", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                required_fields = ['results', 'page', 'genre']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Genre Filter", False, f"Missing fields: {missing_fields}")
                    return False
                
                if data.get('genre') != 'Action':
                    self.log_result("Genre Filter", False, "Genre parameter not returned correctly")
                    return False
                
                results = data['results']
                if not results:
                    self.log_result("Genre Filter", False, "No action movies returned")
                    return False
                
                self.log_result("Genre Filter", True, f"Retrieved {len(results)} Action movies")
                return True
            else:
                self.log_result("Genre Filter", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Genre Filter", False, f"Request failed: {str(e)}")
        return False
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        try:
            # Test invalid content type in details endpoint
            response = requests.get(f"{API_BASE}/content/details/invalid/123", timeout=10)
            if response.status_code != 400:
                self.log_result("Error Handling", False, 
                              f"Expected 400 for invalid content type, got {response.status_code}")
                return False
            
            # Test missing search query
            response = requests.get(f"{API_BASE}/content/search", timeout=10)
            if response.status_code not in [400, 422]:  # FastAPI returns 422 for validation errors
                self.log_result("Error Handling", False, 
                              f"Expected 400/422 for missing query, got {response.status_code}")
                return False
            
            self.log_result("Error Handling", True, "Error responses are handled correctly")
            return True
        except Exception as e:
            self.log_result("Error Handling", False, f"Request failed: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting BeeTV Backend API Tests")
        print(f"📡 Testing API at: {API_BASE}")
        print("=" * 60)
        
        # Run all tests
        tests = [
            self.test_health_check,
            self.test_trending_content,
            self.test_movies,
            self.test_tv_shows,
            self.test_anime,
            self.test_movie_details,
            self.test_tv_details,
            self.test_search,
            self.test_genre,
            self.test_error_handling
        ]
        
        for test in tests:
            test()
            print()  # Add spacing between tests
        
        # Summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"📈 Success Rate: {(self.passed_tests / (self.passed_tests + self.failed_tests) * 100):.1f}%")
        
        if self.failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['message']}")
        
        return self.failed_tests == 0

if __name__ == "__main__":
    tester = BeetvAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)