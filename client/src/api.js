// client/src/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * מנסה לנחש את דומיין ה-API כשלא הוגדר REACT_APP_API_URL:
 * - אם אנחנו כבר על api.<domain> או על localhost → משתמשים באותו הוסט עם /api
 * - אחרת בונים https://api.<domain>/api (תומך גם ב־.co.il וכד')
 */
function guessApiRoot() {
  const { protocol, host, hostname } = window.location;

  // אם כבר על api.<domain> או לוקאלית – נשארים באותו הוסט (כולל פורט)
  if (/^api\./i.test(hostname) || hostname === 'localhost') {
    return `${protocol}//${host}`;
  }

  // ניסיון לתמוך גם ב־co.il / org.il וכו'
  const parts = hostname.split('.');
  let domain = parts.slice(-2).join('.');
  const second = parts[parts.length - 2]?.toLowerCase();
  const tld = parts[parts.length - 1]?.toLowerCase();
  const sldSet = new Set(['co', 'com', 'org', 'gov', 'net', 'ac']);
  if (parts.length >= 3 && sldSet.has(second) && tld.length <= 3) {
    domain = parts.slice(-3).join('.');
  }

  return `${protocol}//api.${domain}`;
}

// אם הוגדר REACT_APP_API_URL – מכבדים אותו; אחרת ניחוש אוטומטי
const ENV_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const API_ROOT = ENV_BASE ? ENV_BASE : guessApiRoot();

export const api = axios.create({
  baseURL: `${API_ROOT}/api`,
  withCredentials: false, // שומר על ההגדרה שלך
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

// כלי עזר לשגיאות – נשאר כמו שהיה אצלך
export function handleApiError(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    'Request failed'
  );
}
