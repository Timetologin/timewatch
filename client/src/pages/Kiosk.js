// client/src/pages/Kiosk.js
import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, api } from '../api';
import toast from 'react-hot-toast';

/**
 * Kiosk page – מרכז מסך:
 * - QR ללא eval / ספריות חיצוניות (תמונה מ-qrserver).
 * - כפתורי בדיקה שמבצעים POST ל-/api/qr/clock.
 */

const MODES = [
  { key: 'in', label: 'Clock In' },
  { key: 'out', label: 'Clock Out' },
  { key: 'break-start', label: 'Start Break' },
  { key: 'break-end', label: 'End Break' },
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
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const qrData = useMemo(() => buildQrData(mode, coords || {}), [mode, coords, refreshSeed]);
  const qrImgSrc = useMemo(() => {
    const encoded = encodeURIComponent(qrData);
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
    <div
      className="container"
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 24,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 1000,
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 24,
        }}
      >
        {/* צד שמאל – QR */}
        <div style={{ textAlign: 'center' }}>
          <img
            src={qrImgSrc}
            alt="Attendance QR"
            width={360}
            height={360}
            style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
          />
          <div className="muted" style={{ marginTop: 8 }}>
            Scan with phone → follow the link
          </div>
        </div>

        {/* צד ימין – הגדרות/פעולות */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>Kiosk</h2>
            <span className="muted" title={API_BASE}>API: {API_BASE}</span>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="muted" htmlFor="mode" style={{ minWidth: 60 }}>Mode</label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="input"
                style={{ width: 220 }}
              >
                {MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <button className="btn" onClick={() => setRefreshSeed(s => s + 1)}>Refresh QR</button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
              <div>QR link:</div>
              <div style={{ userSelect: 'text', direction: 'ltr', overflowWrap: 'anywhere' }}>
                {qrData}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 8 }}>Quick test (you must be logged in)</div>
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

          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            * אם חובת מיקום פעילה – יש להיות בטווח המשרד (אם אין BYPASS).
          </div>
        </div>
      </div>
    </div>
  );
}
