// client/src/api.js
import axios from 'axios';

/** מפה לדומיינים ידועים -> דומיין ה-API המקביל */
function mapApiBaseFromHost(hostname) {
  const apex = 'ravanahelmet.fun';
  if (hostname === apex || hostname === `www.${apex}`) {
    return `https://api.${apex}/api`;
  }
  return null;
}

/** Detect API base URL safely for dev/prod */
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

/** קריאת טוקן מכל מקום אפשרי */
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

/** שליחת Authorization לכל בקשה */
api.interceptors.request.use((config) => {
  const t = getStoredToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export default api;
export { api };
