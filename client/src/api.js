// client/src/api.js
import axios from 'axios';

/**
 * מזהה Base URL בצורה בטוחה:
 * - אם הוגדר REACT_APP_API_BASE → נשתמש בו.
 * - לוקאל: http://localhost:4000/api
 * - פרודקשן (ברירת מחדל): same-origin '/api' (אין CORS, אין תלות ב-subdomain)
 * - אופציונלי: אם REACT_APP_USE_API_SUBDOMAIN=1 → נשתמש ב-https://api.ravanahelmet.fun/api
 */
function detectBaseURL() {
  try {
    // 1) ENV override
    const envBase = (process.env.REACT_APP_API_BASE || '').trim();
    if (envBase) return envBase.replace(/\/$/, '');

    const host = window.location.hostname || '';
    const isLocal =
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local');

    // 2) Local dev
    if (isLocal) return 'http://localhost:4000/api';

    // 3) Production – prefer same-origin to avoid CORS/DNS mismatches
    const sameOrigin = `${window.location.origin.replace(/\/$/, '')}/api`;

    // 4) Optional subdomain (only if you explicitly want it)
    const useSub = String(process.env.REACT_APP_USE_API_SUBDOMAIN || '').trim() === '1';
    if (useSub) {
      const apex = 'ravanahelmet.fun';
      return `https://api.${apex}/api`;
    }

    return sameOrigin;
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

/** מוסיף Authorization רק כשיש טוקן */
api.interceptors.request.use((config) => {
  try {
    const t = localStorage.getItem('token');
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
  } catch {}
  return config;
});

/** השהייה קטנה */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Prewarm + retry עדין כשאין תגובה (שרת קר/רשת), לא כשיש סטטוס שגיאה */
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

    // נסיון חימום וברטראי עד פעמיים כשאין בכלל תגובה (רשת/שרת קר)
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

/** Ping קטן */
export function ping() {
  return api.get('/health', { timeout: 8000 });
}

/** הודעת שגיאה ידידותית */
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
