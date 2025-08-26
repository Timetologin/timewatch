// client/src/api.js
import axios from 'axios';

const explicit = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
let BASE = explicit;
if (!BASE) {
  const { protocol, hostname, port } = window.location;
  if (port === '3000') {
    BASE = `${protocol}//${hostname}:4000`;
  } else {
    BASE = ''; // same-origin (reverse proxy / prod)
  }
}

export const API_BASE = BASE || 'http://localhost:4000';

// axios instance
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// מוסיף אוטומטית Authorization header
api.interceptors.request.use((config) => {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const token = auth?.token || localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// מטפל בשגיאות
export function handleApiError(e) {
  if (e.response?.data?.message) return e.response.data.message;
  if (e.message) return e.message;
  return 'Request failed';
}
