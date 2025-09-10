// client/src/pages/QRScan.js
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

function getGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: Number(p.coords.latitude),
        lng: Number(p.coords.longitude),
        accuracy: p.coords.accuracy
      }),
      (err) => reject(new Error('Please allow location access to continue')),
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
          lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy,
          coords: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
        <img src="/logo.png" alt="logo" className="w-12 h-12 rounded-md mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">QR</h1>
        {status && <div className="text-sm text-slate-600 mb-2">{status}</div>}
        {result && <div className="text-emerald-700">{result}</div>}
        <div className="text-xs text-slate-500 mt-4">
          You can close this tab once done.
        </div>
      </div>
    </div>
  );
}
