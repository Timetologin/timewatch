// client/src/components/QuickActions.jsx
import React, { useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

async function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported on this device'));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: Number(p.coords.latitude),
          lng: Number(p.coords.longitude),
          accuracy: p.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function QuickActions() {
  const [busy, setBusy] = useState(false);
  const [lastGps, setLastGps] = useState(null);

  const sendClock = async (mode) => {
    setBusy(true);
    try {
      const pos = await getGeo();
      setLastGps(pos);

      // payload תואם-שרת: גם lat/lng בשורש, וגם coords לשמירת תאימות
      const payload = {
        mode,                         // "in" | "out" | "break-start" | "break-end"
        lat: pos.lat,
        lng: pos.lng,
        coords: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy },
        locationId: 'main',
      };

      // נסה קודם את הראוטר של /qr/clock
      try {
        const { data } = await api.post('/qr/clock', payload);
        toast.success(data?.message || `Done: ${data?.action || mode}`);
        return;
      } catch (e) {
        // אם הראוטר לא קיים/לא נכון – ננסה מסלולי /attendance/...
        const status = e?.response?.status;
        if (status !== 404 && status !== 400) throw e;
      }

      // fallback לפי mode
      const routeMap = {
        'in': '/attendance/clockin',
        'out': '/attendance/clockout',
        'break-start': '/attendance/break/start',
        'break-end': '/attendance/break/end',
      };
      const path = routeMap[mode];
      const { data } = await api.post(path, { lat: pos.lat, lng: pos.lng });
      toast.success(data?.message || 'Done');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Action failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn"        disabled={busy} onClick={() => sendClock('in')}>Clock In</button>
        <button className="btn-ghost"  disabled={busy} onClick={() => sendClock('out')}>Clock Out</button>
        <button className="btn-ghost"  disabled={busy} onClick={() => sendClock('break-start')}>Break Start</button>
        <button className="btn-ghost"  disabled={busy} onClick={() => sendClock('break-end')}>Break End</button>

        {/* כפתור דיבוג GPS – אפשר להשאיר/להסיר */}
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={async () => {
            try {
              const pos = await getGeo();
              setLastGps(pos);
              toast.success(`GPS: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (±${Math.round(pos.accuracy)}m)`);
            } catch (e) {
              toast.error(e?.message || 'No GPS');
            }
          }}
        >
          Show GPS
        </button>
      </div>

      {lastGps && (
        <div className="muted" style={{ marginTop: 8 }}>
          GPS: <strong>{lastGps.lat.toFixed(6)}, {lastGps.lng.toFixed(6)}</strong> (±{Math.round(lastGps.accuracy)}m)
        </div>
      )}
    </div>
  );
}
