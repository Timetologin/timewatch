// client/src/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

function computeApiBase() {
  const env = (process.env.REACT_APP_API_URL || '').trim();
  if (env) {
    let base = env.replace(/\/+$/, '');
    if (!/\/api$/i.test(base)) base += '/api';
    return base;
  }
  const { protocol, host, hostname } = window.location;
  if (/^api\./i.test(hostname) || hostname === 'localhost') {
    return `${protocol}//${host}/api`;
  }
  const parts = hostname.split('.');
  let domain = parts.slice(-2).join('.');
  const second = (parts[parts.length - 2] || '').toLowerCase();
  const tld = (parts[parts.length - 1] || '').toLowerCase();
  const slds = new Set(['co', 'com', 'org', 'gov', 'net', 'ac']);
  if (parts.length >= 3 && slds.has(second) && tld.length <= 3) {
    domain = parts.slice(-3).join('.');
  }
  return `${protocol}//api.${domain}/api`;
}

const baseURL = computeApiBase();

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let redirecting = false;
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      if (!redirecting) {
        redirecting = true;
        try { localStorage.removeItem('token'); } catch {}
        if (!window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please log in.');
          setTimeout(() => { window.location.href = '/login'; }, 150);
        }
      }
    }
    return Promise.reject(err);
  }
);

export function handleApiError(err) {
  return err?.response?.data?.message || err?.message || 'Request failed';
}
