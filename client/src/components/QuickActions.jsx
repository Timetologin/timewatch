// client/src/components/QuickActions.jsx
import React, { useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

async function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: Number(p.coords.latitude),
        lng: Number(p.coords.longitude),
        accuracy: p.coords.accuracy
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function QuickActions() {
  const [busy, setBusy] = useState(false);

  const send = async (mode) => {
    setBusy(true);
    try {
      const pos = await getGeo().catch((e) => {
        toast.error(e?.message || 'Location permission denied');
        throw e;
      });

      const payload = { locationId: 'main', mode, coords: { lat: pos.lat, lng: pos.lng } };
      const { data } = await api.post('/qr/clock', payload);
      toast.success(data?.message || `Done: ${data?.action || mode}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Action failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="btn"        disabled={busy} onClick={() => send('in')}>Clock In</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('out')}>Clock Out</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('break-start')}>Break Start</button>
      <button className="btn-ghost"  disabled={busy} onClick={() => send('break-end')}>Break End</button>
    </div>
  );
}
