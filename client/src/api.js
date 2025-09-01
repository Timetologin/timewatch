// client/src/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
export const api = axios.create({
  baseURL: BASE ? `${BASE}/api` : '/api',
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let redirecting = false;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      // נקה טוקן ונתב ללוגין בלי להציף טוסטים אינסופיים
      if (!redirecting) {
        redirecting = true;
        try { localStorage.removeItem('token'); } catch {}
        if (window.location.pathname !== '/login') {
          toast.error('Session expired. Please log in.');
          setTimeout(() => { window.location.href = '/login'; }, 150);
        }
      }
    }
    return Promise.reject(err);
  }
);

// כלי עזר לשגיאות
export function handleApiError(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    'Request failed'
  );
}
