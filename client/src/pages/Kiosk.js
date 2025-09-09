// client/src/pages/Kiosk.js
import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, api } from '../api';
import toast from 'react-hot-toast';

/**
 * Kiosk mode:
 * - מציג QR שניתן לסרוק מהטלפון (לא משתמש בשום eval / ספריות חיצוניות).
 * - יש כפתורי בדיקה שמבצעים בקשת POST ל- /api/qr/clock (עובד רק למשתמש מחובר).
 * - ה-QR מקודד URL ידידותי:  <origin>/qr?mode=<...>&ts=<...>
 *   (אם יש לכם עמוד QRScan, הוא יוכל לקרוא את הפרמטרים ולעשות clock דרך ה-API).
 */

const MODES = [
  { key: 'in', label: 'Clock In' },
  { key: 'out', label: 'Clock Out' },
  { key: 'break-start', label: 'Break Start' },
  { key: 'break-end', label: 'Break End' },
];

function buildQrData(mode, extra = {}) {
  const url = new URL('/qr', window.location.origin);
  url.searchParams.set('mode', mode);
  url.searchParams.set('ts', String(Date.now()));
  Object.entries(extra || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

export default function Kiosk() {
  const [mode, setMode] = useState('in');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [loading, setLoading] = useState(false);

  // קואורדינטות אופציונליות (אם ברצונך לכלול מיקום ב-QR/בבקשה)
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // מחרוזת הנתונים ל-QR (URL)
  const qrData = useMemo(() => buildQrData(mode, coords || {}), [mode, coords, refreshSeed]);

  // תמונת QR (לא מצריכה חבילות/Canvas/‏eval)
  const qrImgSrc = useMemo(() => {
    const encoded = encodeURIComponent(qrData);
    // שירות יצירת QR כתמונה (PNG) ללא ספריות לקוח
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=360x360&margin=0`;
  }, [qrData]);

  const doClock = async (chosenMode) => {
    try {
      setLoading(true);
      const payload = { mode: chosenMode };
      if (coords) payload.coords = coords;
      const { data } = await api.post('/qr/clock', payload);
      if (data?.message) toast.success(data.message);
      window.dispatchEvent(new Event('attendance-changed'));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Clock action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 className="h2" style={{ marginRight: 'auto' }}>Kiosk</h2>
        <span className="muted" title={API_BASE}>API: {API_BASE}</span>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 16 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260 }}>
            <label className="muted" htmlFor="mode">Mode</label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="input"
              style={{ width: 240, marginTop: 6 }}
            >
              {MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => setRefreshSeed(s => s + 1)}>
                Refresh QR
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
              <div>QR link:</div>
              <div style={{ userSelect: 'text', direction: 'ltr', overflowWrap: 'anywhere' }}>
                {qrData}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 360, textAlign: 'center' }}>
            <img
              src={qrImgSrc}
              alt="Attendance QR"
              width={360}
              height={360}
              style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            />
            <div className="muted" style={{ marginTop: 8 }}>
              Scan with phone camera → follow the link
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 16 }}>
        <div className="muted" style={{ marginBottom: 8 }}>Quick test (requires you to be logged in)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className="btn"
              disabled={loading}
              onClick={() => doClock(m.key)}
              title={`POST /api/qr/clock { mode: "${m.key}" }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
