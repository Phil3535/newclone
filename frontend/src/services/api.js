import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/content`;

export const contentAPI = {
  getTrending: async (page = 1) => {
    try {
      const response = await axios.get(`${API}/trending`, { params: { page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching trending:', error);
      return [];
    }
  },

  getMovies: async (page = 1) => {
    try {
      const response = await axios.get(`${API}/movies`, { params: { page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
  },

  getTVShows: async (page = 1) => {
    try {
      const response = await axios.get(`${API}/tv-shows`, { params: { page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching TV shows:', error);
      return [];
    }
  },

  getAnime: async (page = 1) => {
    try {
      const response = await axios.get(`${API}/anime`, { params: { page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching anime:', error);
      return [];
    }
  },

  getDetails: async (type, id) => {
    try {
      const response = await axios.get(`${API}/details/${type}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching details:', error);
      return null;
    }
  },

  search: async (query, page = 1) => {
    try {
      const response = await axios.get(`${API}/search`, { params: { q: query, page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  },

  getByGenre: async (genre, page = 1) => {
    try {
      const response = await axios.get(`${API}/genre/${genre}`, { params: { page } });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching by genre:', error);
      return [];
    }
  },
};