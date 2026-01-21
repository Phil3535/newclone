import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

class AuthService {
  getToken() {
    return localStorage.getItem('empire_token');
  }

  setToken(token) {
    localStorage.setItem('empire_token', token);
  }

  removeToken() {
    localStorage.removeItem('empire_token');
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  async register(email, password, fullName) {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        full_name: fullName,
      });
      this.setToken(response.data.access_token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });
      this.setToken(response.data.access_token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  }

  logout() {
    this.removeToken();
  }

  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getProfile() {
    try {
      const response = await axios.get(`${API}/user/profile`, {
        headers: this.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
}

export default new AuthService();
