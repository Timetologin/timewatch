// client/src/api.js
import axios from 'axios';

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

    // Prod: prefer an explicit env var from the Static Site (Render)
    const envBase = process.env.REACT_APP_API_BASE;
    if (envBase) return envBase.replace(/\/$/, '');

    // Fallback: assume same-origin proxy (/api -> backend via reverse-proxy)
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  } catch {
    return '/api';
  }
}

export const API_BASE = detectBaseURL();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // 15s - כדי לא “להיתקע” לנצח
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

/** On network error: prewarm + retry (handles Render cold starts / DNS hiccups) */
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
        'Set REACT_APP_API_BASE to an HTTPS URL of your API on Render.';
      return Promise.reject(err);
    }

    // Retry only when there is NO response (true network error), up to 2 times
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
    // pure network / mixed-content
    return err.message.includes('Mixed Content')
      ? 'Network blocked (HTTPS page vs HTTP API).'
      : 'Network Error';
  }
  const d = err.response?.data;
  return (
    d?.message ||
    d?.error ||
    err?.message ||
    `HTTP ${err.response?.status || ''}`.trim()
  );
}

// Prewarm the API once on module load (helps with cold starts)
try { ping().catch(() => {}); } catch {}
