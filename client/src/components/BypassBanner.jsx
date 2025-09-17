// client/src/components/BypassBanner.jsx
import React, { useEffect, useState } from 'react';
import api from '../api'; // ← default import (לא { api })

export default function BypassBanner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // /auth/me מחזיר את המשתמש עצמו (sanitizeUser)
        const { data } = await api.get('/auth/me');
        const perms =
          data?.permissions ||
          data?.user?.permissions || // מקרה הגנתי אם השרת יחזיר עטיפה אחרת
          {};
        // המפתח הנכון הוא bypassLocation; נשאיר פולבק לישן ליתר ביטחון
        const ok = !!(perms.bypassLocation ?? perms.attendanceBypassLocation);
        if (alive) setEnabled(ok);
      } catch {
        // בשקט – אם אין הרשאה/401, פשוט לא מציגים את הבאנר
      }
    })();
    return () => {
      alive = false;
    };
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
        background: '#ecfdf5',
      }}
      title="This user can clock in/out even outside the office radius."
    >
      <div style={{ fontWeight: 700 }}>✅ Bypass location enabled</div>
      <div className="muted">Clock actions will work even outside the office radius.</div>
    </div>
  );
}
