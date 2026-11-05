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

// Share one refresh request when several API calls receive 401 at the same time.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isPublicRequest = PUBLIC_ENDPOINTS.some((endpoint) =>
      (originalRequest?.url || '').includes(endpoint),
    );

    if (isUnauthorized && originalRequest && !originalRequest._retry && !isPublicRequest) {
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${baseURL}/token/refresh/`, { refresh }, { timeout: api.defaults.timeout })
              .then((response) => {
                const nextAccess = response.data?.access;
                if (!nextAccess) throw new Error('Token refresh did not return an access token.');
                localStorage.setItem('access', nextAccess);
                if (response.data?.refresh) {
                  localStorage.setItem('refresh', response.data.refresh);
                }
                return nextAccess;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }

          const access = await refreshPromise;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
        }
      }
    }

    // If refresh is unavailable or rejected, clear a stale/corrupted token pair.
    if (isUnauthorized) {
      const code = error.response.data?.code;
      const detail = error.response.data?.detail || '';
      if (code === 'token_not_valid' || detail.toLowerCase().includes('token')) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
      }
    }
    return Promise.reject(error);
  },
);

export default api;