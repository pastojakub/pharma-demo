import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

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
    // Check if user should be redirected on 401
    if (error.response?.status === 401) {
      console.warn('Unauthorized! Logging out and redirecting...');
      Cookies.remove('auth_token', { path: '/' });
      Cookies.remove('user_role', { path: '/' });
      Cookies.remove('user_email', { path: '/' });
      Cookies.remove('user_org', { path: '/' });
      
      if (typeof window !== 'undefined') {
        window.location.href = '/?error=session_expired';
      }
    }
    
    // We reject the error so it can be caught and handled locally (e.g. via toast)
    return Promise.reject(error);
  }
);

export default api;
