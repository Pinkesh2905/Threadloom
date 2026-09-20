import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          useAuthStore.getState().setAccessToken(newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Deliberately no `window.location.href = '/'` here. A hard
          // navigation on a background 401 throws the user to the marketing
          // page and destroys whatever they were working on — an unsaved
          // design, a half-filled order. Clear the session and let the route
          // guard decide where to go, which keeps SPA state intact.
          useAuthStore.getState().logout();
          return Promise.reject(refreshErr);
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
