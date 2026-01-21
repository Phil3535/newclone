import axios from 'axios';
import authService from './authService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

class IPTVService {
  async connectIPTV(serverUrl, port, username, password, profileName = 'Default') {
    try {
      const response = await axios.post(
        `${API}/iptv/connect`,
        {
          server_url: serverUrl,
          port: parseInt(port),
          username,
          password,
          profile_name: profileName,
        },
        { headers: authService.getAuthHeader() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Connection failed',
      };
    }
  }

  async getProfiles() {
    try {
      const response = await axios.get(`${API}/iptv/profiles`, {
        headers: authService.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
  }

  async getChannels(profileId, categoryId = null) {
    try {
      console.log('IPTV Service: Fetching channels for profile', profileId);
      const params = { profile_id: profileId };
      if (categoryId) params.category_id = categoryId;

      const response = await axios.get(`${API}/content/channels`, {
        params,
        headers: authService.getAuthHeader(),
      });
      
      console.log('IPTV Service: Channels response', response.data);
      return response.data.channels || [];
    } catch (error) {
      console.error('IPTV Service: Error fetching channels', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        console.error('IPTV Service: Unauthorized - token may have expired');
      }
      return [];
    }
  }

  async getCategories(profileId) {
    try {
      console.log('IPTV Service: Fetching categories for profile', profileId);
      const response = await axios.get(`${API}/content/categories`, {
        params: { profile_id: profileId },
        headers: authService.getAuthHeader(),
      });
      
      console.log('IPTV Service: Categories response', response.data);
      return response.data.categories || [];
    } catch (error) {
      console.error('IPTV Service: Error fetching categories', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        console.error('IPTV Service: Unauthorized - token may have expired');
      }
      return [];
    }
  }

  async getStreamUrl(profileId, streamId) {
    try {
      console.log('IPTV Service: Getting stream URL for stream', streamId);
      const response = await axios.get(`${API}/content/stream/${streamId}`, {
        params: { profile_id: profileId },
        headers: authService.getAuthHeader(),
      });
      
      console.log('IPTV Service: Stream response:', response.data);
      const streamUrl = response.data.stream_url;
      console.log('IPTV Service: Extracted stream URL:', streamUrl);
      
      if (!streamUrl) {
        console.error('IPTV Service: stream_url is null or undefined!');
        alert(`DEBUG: Response data: ${JSON.stringify(response.data)}`);
      }
      
      return streamUrl;
    } catch (error) {
      console.error('IPTV Service: Error fetching stream URL', error.response?.status, error.response?.data);
      alert(`ERROR getting stream: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
      if (error.response?.status === 401) {
        console.error('IPTV Service: Unauthorized - token may have expired');
        alert('Your session expired. Please login again.');
      }
      return null;
    }
  }

  async getEPG(profileId, streamId = null) {
    try {
      const params = { profile_id: profileId };
      if (streamId) params.stream_id = streamId;

      const response = await axios.get(`${API}/content/epg`, {
        params,
        headers: authService.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching EPG:', error);
      return {};
    }
  }
}

export default new IPTVService();
