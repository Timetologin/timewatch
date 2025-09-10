// client/src/pages/QRScan.js
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: Number(p.coords.latitude),
          lng: Number(p.coords.longitude),
          accuracy: p.coords.accuracy,
        }),
      () => reject(new Error('Please allow location access to continue')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function QRScan() {
  const [status, setStatus] = useState('Preparing…');
  const [result, setResult] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setStatus('Getting GPS…');
        const pos = await getGeo();

        setStatus('Toggling attendance…');
        const { data } = await api.post('/attendance/toggle', {
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          coords: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy },
        });

        const msg = data?.message || (data?.toggled === 'in' ? 'Clocked in' : 'Clocked out');
        toast.success(msg);
        setResult(msg);
        setStatus('');
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Action failed';
        toast.error(msg);
        setResult(msg);
        setStatus('');
      }
    })();
  }, []);

  return (
    <div className="container" style={{ padding: 16 }}>
      <div
        className="card"
        style={{
          maxWidth: 440,
          margin: '32px auto',
          borderRadius: 16,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <img
          src="/logo.png"
          alt="Costoro"
          style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, margin: '0 auto 8px' }}
        />
        <h2 className="h2" style={{ marginBottom: 4 }}>QR</h2>

        {status && <div className="muted" style={{ marginTop: 6 }}>{status}</div>}
        {result && (
          <div style={{ marginTop: 8, color: '#047857', fontWeight: 600, fontSize: 16 }}>
            {result}
          </div>
        )}

        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          You can close this tab once done.
        </div>
      </div>
    </div>
  );
}
