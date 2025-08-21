// client/src/pages/QRScan.js
import React, { useEffect, useState } from 'react';
import { api } from '../api';

async function getCoords() {
  if (!('geolocation' in navigator)) throw new Error('דפדפן לא תומך ב-GPS');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error('נדרש לאשר שיתוף מיקום')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function QRScan() {
  const [status, setStatus] = useState('טוען…');
  const [ok, setOk] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const locationId = sp.get('loc') || 'main';
        const mode = sp.get('mode') || 'in';

        setStatus('בודק מיקום…');
        const coords = await getCoords();

        setStatus('מאמת מול השרת…');
        const res = await api('/api/qr/clock', {
          method: 'POST',
          body: JSON.stringify({ locationId, mode, coords })
        });

        setOk(res);
        setStatus('');
      } catch (e) {
        setError(e.message || 'שגיאה');
        setStatus('');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
        <img src="/logo.png" alt="logo" className="w-12 h-12 rounded-md mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">סריקת QR</h1>
        {status && <div className="text-sm text-slate-600 mb-2">{status}</div>}

        {ok && (
          <div className="text-emerald-700">
            בוצע בהצלחה: <b>{ok.action}</b>
          </div>
        )}

        {error && <div className="text-rose-600">{error}</div>}

        <div className="mt-4 text-sm text-slate-500">
          יש להתחבר קודם במכשיר כדי שהמערכת תזהה אותך.
        </div>
      </div>
    </div>
  );
}
