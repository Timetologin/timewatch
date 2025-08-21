// client/src/api.js
// Robust API base detection:
// - REACT_APP_API_URL (if set) wins
// - Dev: if app runs on :3000 -> talk to backend on :4000
// - Prod: same-origin (empty base)
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

export const API_BASE = BASE;

function getToken() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return auth?.token || localStorage.getItem('token') || '';
  } catch {
    return localStorage.getItem('token') || '';
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  // Try to parse JSON, but be tolerant to non-JSON error bodies
  let data = {};
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || '' }; }

  if (!res.ok) {
    const msg = data?.message || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}
