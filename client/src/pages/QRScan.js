// client/src/pages/QRScan.js
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

async function getCoords() {
  if (!('geolocation' in navigator)) throw new Error('Geolocation is not supported');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Number(pos.coords.latitude),
        lng: Number(pos.coords.longitude),
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error('Please allow location access to continue')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function QRScan() {
  const [status, setStatus] = useState('Preparing…');
  const [ok, setOk] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const mode = getParam('m') || 'in';
        setStatus(`Detecting GPS for "${mode}"…`);

        const pos = await getCoords();
        setStatus('Contacting server…');

        const payload = {
          mode,
          lat: pos.lat,
          lng: pos.lng,
          coords: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy },
          locationId: 'main',
        };

        const { data } = await api.post('/qr/clock', payload);
        setOk({ action: mode, data });
        setStatus('');
        toast.success(data?.message || `Done: ${mode}`);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'Failed');
        setStatus('');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
        <img src="/logo.png" alt="logo" className="w-12 h-12 rounded-md mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">QR Scan</h1>
        {status && <div className="text-sm text-slate-600 mb-2">{status}</div>}

        {ok && (
          <div className="text-emerald-700">
            Success: <b>{ok.action}</b>
          </div>
        )}

        {error && <div className="text-rose-600">{error}</div>}

        <div className="text-xs text-slate-500 mt-4">
          If you denied location access, enable it in your browser and retry.
        </div>
      </div>
    </div>
  );
}
