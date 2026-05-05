import axios from 'axios';
import Cookies from 'js-cookie';
import { authCookies } from './auth-cookies';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? (localStorage.getItem('api_base_url') || 'http://localhost:3001') : 'http://localhost:3001',
});

export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url;
  if (typeof window !== 'undefined') {
    localStorage.setItem('api_base_url', url);
  }
};

api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized! Logging out and redirecting...');
      authCookies.clear();

      if (typeof window !== 'undefined') {
        window.location.href = '/?error=session_expired';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
