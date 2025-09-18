// client/src/api.js
import axios from 'axios';

/** מפה לדומיינים ידועים -> דומיין ה-API המקביל */
function mapApiBaseFromHost(hostname) {
  // פרודקשן: האתר ב-ravanahelmet.fun, ה-API ב-api.ravanahelmet.fun
  const apex = 'ravanahelmet.fun';
  if (hostname === apex || hostname === `www.${apex}`) {
    return `https://api.${apex}/api`;
  }
  // אפשר להוסיף כאן מפות נוספות בעתיד אם צריך
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

    if (isLocal) {
      // Dev: local API
      return 'http://localhost:4000/api';
    }

    // Prod: מפה ידועה קודם
    const mapped = mapApiBaseFromHost(host);
    if (mapped) return mapped;

    // אם הוגדר במשתני סביבה של הקליינט – עדיפות לזה
    const envBase = process.env.REACT_APP_API_BASE;
    if (envBase) return envBase.replace(/\/$/, '');

    // Fallback: assume same-origin proxy (/api)
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  } catch {
    return '/api';
  }
}

export const API_BASE = detectBaseURL();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: false,
});

/** Attach Authorization token automatically */
api.interceptors.request.use((config) => {
  try {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  } catch {}
  return config;
});

/** Tiny sleep helper */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** On network error: prewarm + retry (handles cold starts) */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err?.config || {};
    const hasResponse = !!err?.response;

    // Mixed content guard: page https + api http
    const httpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const httpApi = /^http:\/\//i.test(API_BASE);
    if (!hasResponse && httpsPage && httpApi) {
      err.message =
        'Blocked by browser (Mixed Content): The page is HTTPS but API is HTTP.\n' +
        'Set REACT_APP_API_BASE to an HTTPS URL.';
      return Promise.reject(err);
    }

    // Retry only when there is NO response, up to 2 times
    if (!hasResponse && !cfg.__retried) {
      cfg.__retried = 1;
      try { await api.get('/health', { timeout: 8000 }).catch(() => {}); } catch {}
      await wait(800);
      try { return await api.request(cfg); } catch (e1) {
        cfg.__retried = 2;
        await wait(1500);
        try { return await api.request(cfg); } catch (e2) {
          return Promise.reject(e2);
        }
      }
    }
    return Promise.reject(err);
  }
);

/** Expose a small ping */
export function ping() {
  return api.get('/health', { timeout: 8000 });
}

/** Error → readable message */
export function handleApiError(err) {
  if (!err) return 'Unknown error';
  if (err?.message && !err?.response) {
    return err.message.includes('Mixed Content') ? 'Network blocked (HTTPS page vs HTTP API).' : 'Network Error';
  }
  const d = err.response?.data;
  return d?.message || d?.error || err?.message || `HTTP ${err.response?.status || ''}`.trim();
}

// Prewarm once
try { ping().catch(() => {}); } catch {}
