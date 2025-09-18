// client/src/components/BypassBanner.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function BypassBanner() {
  const { permissions } = useAuth();
  const enabled = !!(permissions?.bypassLocation ?? permissions?.attendanceBypassLocation);
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
        background: '#ecfdf5',
      }}
      title="This user can clock in/out even outside the office radius."
    >
      <div style={{ fontWeight: 700 }}>✅ Bypass location enabled</div>
      <div className="muted">Clock actions will work even outside the office radius.</div>
    </div>
  );
}
