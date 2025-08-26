// client/src/components/QuickActions.jsx
import React, { useState } from 'react';
import { api } from '../api';           // משתמש ב-client/src/api.js שלך
import toast from 'react-hot-toast';

async function getGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  });
}

export default function QuickActions() {
  const [busy, setBusy] = useState(false);

  async function send(mode) {
    setBusy(true);
    try {
      const coords = await getGeo();
      const payload = { locationId: 'main', mode, coords: coords || { lat: 0, lng: 0 } };
      const { data } = await api.post('/qr/clock', payload);
      toast.success(`Done: ${data.action}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Action failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="btn"        disabled={busy} onClick={() => send('in')}>Clock In</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('out')}>Clock Out</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('break-start')}>Break Start</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('break-end')}>Break End</button>
    </div>
  );
}
