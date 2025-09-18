// client/src/api.js
import axios from 'axios';

/** מיפוי דומיין -> API בפרודקשן */
function mapApiBaseFromHost(hostname) {
  const apex = 'ravanahelmet.fun';
  if (hostname === apex || hostname === `www.${apex}`) {
    return `https://api.${apex}/api`;
  }
  return null;
}

/** קובע baseURL לדב/פרוד בצורה בטוחה */
function detectBaseURL() {
  try {
    const host = window.location.hostname || '';
    const isLocal =
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local');

    if (isLocal) return 'http://localhost:4000/api';

    const mapped = mapApiBaseFromHost(host);
    if (mapped) return mapped;

    const envBase =
      import.meta.env?.VITE_API_URL ||
      process.env.REACT_APP_API_BASE ||
      process.env.VITE_API_URL;
    if (envBase) return String(envBase).replace(/\/$/, '');

    return `${window.location.origin.replace(/\/$/, '')}/api`;
  } catch {
    return '/api';
  }
}

export const API_BASE = detectBaseURL();

/** קורא טוקן מכל המקומות האפשריים כדי לשמור תאימות */
export function getStoredToken() {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      (document.cookie.match(/(?:^|;\s*)(token|jwt)=([^;]+)/i)?.[2] &&
        decodeURIComponent(document.cookie.match(/(?:^|;\s*)(token|jwt)=([^;]+)/i)[2]))
    );
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: false,
});

/** מוסיף Authorization לכל בקשה אם יש טוקן */
api.interceptors.request.use((config) => {
  const t = getStoredToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

/** עוזר לשגיאות – נשמר לתאימות עם קוד קיים שמייבא אותו */
export function handleApiError(err) {
  if (!err) return 'Unknown error';
  // שגיאת רשת (אין response)
  if (err?.message && !err?.response) {
    // Mixed Content – דף https ו־API http
    const httpsPage =
      typeof window !== 'undefined' && window.location.protocol === 'https:';
    const httpApi = /^http:\/\//i.test(API_BASE);
    if (httpsPage && httpApi) {
      return 'Network blocked (HTTPS page vs HTTP API).';
    }
    return 'Network Error';
  }
  // יש תגובה מהשרת
  const d = err.response?.data;
  return (
    d?.message ||
    d?.error ||
    err?.message ||
    `HTTP ${err.response?.status || ''}`.trim()
  );
}

/** פינג/בדיקת בריאות – לתאימות */
export function ping() {
  return api.get('/health', { timeout: 8000 });
}

export default api;      // import api from './api'
export { api };         // import { api } from './api'
