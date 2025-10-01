// client/src/components/BypassBanner.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function BypassBanner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (alive) setEnabled(!!data?.permissions?.attendanceBypassLocation);
      } catch (e) {
        // שקט - אם נפל, פשוט לא נציג את הבאנר
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
        borderColor: '#10b981',
        background: '#ecfdf5'
      }}
      title="This user can clock in/out even outside the office radius."
    >
      <div style={{ fontWeight: 700 }}>✅ Bypass location enabled</div>
      <div className="muted">Clock actions will work even outside the office radius.</div>
    </div>
  );
}
