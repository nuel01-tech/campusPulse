import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const cleanBaseURL = rawBaseURL.replace(/\/+$/, '');
const baseURL = cleanBaseURL.endsWith('/api') ? cleanBaseURL : `${cleanBaseURL}/api`;

const api = axios.create({
  baseURL,
  timeout: 15000,
});

// List of public endpoints that should NEVER send an Authorization header
const PUBLIC_ENDPOINTS = [
  '/accounts/departments/',
  '/accounts/signup/',
  '/accounts/forgot-password/',
  '/accounts/reset-password/',
  '/token/',
  '/token/refresh/',
];

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));

  if (!isPublic) {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If a request failed with 401 Unauthorized because of a stale/corrupted token
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      const detail = error.response.data?.detail || '';
      if (code === 'token_not_valid' || detail.toLowerCase().includes('token')) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
      }
    }
    return Promise.reject(error);
  }
);

export default api;