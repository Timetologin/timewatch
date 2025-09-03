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

// מרענן את המשתמש מ-/api/auth/me אם חסר לנו permissions עדכניים בלוקאל סטורג'
async function ensureFreshUser() {
  try {
    const raw = localStorage.getItem('user');
    const cached = raw ? JSON.parse(raw) : null;

    // אם יש כבר permissions באובייקט – נניח שזה עדכני מספיק
    if (cached && cached.permissions && typeof cached.permissions === 'object') {
      return cached;
    }

    // אחרת נרענן מ-/me
    const { data } = await api.get('/auth/me');
    const fresh = {
      id: data?.id,
      name: data?.name,
      email: data?.email,
      role: data?.role,
      permissions: data?.permissions || {},
    };
    localStorage.setItem('user', JSON.stringify(fresh));
    return fresh;
  } catch {
    // אם יש כשל/401, נחזיר מה שיש בקאש (גם אם חלקי)
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export default function QuickActions() {
  const [busy, setBusy] = useState(false);
  const [lastGps, setLastGps] = useState(null);

  const sendClock = async (mode) => {
    setBusy(true);
    try {
      // 1) ודא שיש לנו הרשאות עדכניות (מרענן localStorage.user אם צריך)
      const user = await ensureFreshUser();
      const hasBypass = user?.permissions?.attendanceBypassLocation === true;

      // 2) בונים payload. אם אין Bypass -> נשיג GPS; אם יש -> לא מבקשים GPS כלל
      let payload = { mode, locationId: 'main' };
      if (!hasBypass) {
        const pos = await getGeo(); // כאן עלול להיזרק "User denied Geolocation" אם חסום
        setLastGps(pos);
        payload = {
          ...payload,
          lat: pos.lat,
          lng: pos.lng,
          coords: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy },
        };
      }

      // 3) מנסים קודם את מסלול הקיוסק (אם קיים אצלך)
      try {
        const { data } = await api.post('/qr/clock', payload);
        toast.success(data?.message || `Done: ${data?.action || mode}`);
        return;
      } catch (e) {
        const status = e?.response?.status;
        if (status !== 404 && status !== 400) throw e;
      }

      // 4) נפילה למסלולי attendance
      const routeMap = {
        in: '/attendance/clockin',
        out: '/attendance/clockout',
        'break-start': '/attendance/break/start',
        'break-end': '/attendance/break/end',
      };
      const path = routeMap[mode];
      const { data } = await api.post(path, payload);
      toast.success(data?.message || 'Done');
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.code === 1 ? 'User denied Geolocation' : e?.message) ||
        'Action failed';
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

        {/* כפתור דיבוג GPS */}
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
