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
      const params = { profile_id: profileId };
      if (categoryId) params.category_id = categoryId;

      const response = await axios.get(`${API}/content/channels`, {
        params,
        headers: authService.getAuthHeader(),
      });
      return response.data.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  async getCategories(profileId) {
    try {
      const response = await axios.get(`${API}/content/categories`, {
        params: { profile_id: profileId },
        headers: authService.getAuthHeader(),
      });
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getStreamUrl(profileId, streamId) {
    try {
      const response = await axios.get(`${API}/content/stream/${streamId}`, {
        params: { profile_id: profileId },
        headers: authService.getAuthHeader(),
      });
      return response.data.stream_url;
    } catch (error) {
      console.error('Error fetching stream URL:', error);
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
