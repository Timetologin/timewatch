// client/src/pages/Kiosk.js
import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { API_BASE } from '../api';

export default function Kiosk() {
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState('in');
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/locations`);
        if (!res.ok) throw new Error('Failed to load location');
        const data = await res.json();
        setLocation(data[0]);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const url = useMemo(() => {
    const base = window.location.origin;
    const params = new URLSearchParams({ loc: location?.id || 'main', mode });
    return `${base}/qr?${params.toString()}`;
  }, [location, mode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="text-2xl font-bold">עמדת סריקה — {location?.name || 'Loading…'}</div>
          <div className="text-xl tabular-nums">{now.toLocaleTimeString()}</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="p-4 rounded-2xl border bg-slate-50">
            <QRCodeCanvas value={url} size={360} includeMargin />
          </div>

          <div className="max-w-sm">
            <div className="font-medium mb-2">הוראות לעובדים</div>
            <ol className="list-decimal pr-6 space-y-1 text-slate-700">
              <li>פתחו את המצלמה בטלפון (iPhone/Android).</li>
              <li>כוונו אל קוד ה־QR וסכימו לשיתוף מיקום.</li>
              <li>בצעו את הפעולה הנבחרת — חייבים להיות ברדיוס המשרד.</li>
            </ol>

            <div className="mt-6">
              <div className="font-medium mb-1">מצב סריקה</div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['in', 'Clock In'],
                  ['out', 'Clock Out'],
                  ['break-start', 'Start Break'],
                  ['break-end', 'End Break']
                ].map(([m, label]) => (
                  <button
                    key={m}
                    className={`px-3 py-2 rounded-xl border ${mode === m ? 'bg-black text-white' : 'bg-white'}`}
                    onClick={() => setMode(m)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              נדרש להיות בתוך {location?.radiusMeters || '-'} מ׳ מ־{location?.name || '-'} (אם מוגדר אימות מיקום).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
