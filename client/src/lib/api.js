// client/src/lib/api.js
import axios from 'axios';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${apiBase}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function handleApiError(e) {
  const msg = e?.response?.data?.message || e.message || 'Request failed';
  return msg;
}
