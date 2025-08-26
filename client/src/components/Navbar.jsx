// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Navbar({ rightSlot = null }) {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (mounted) setMe(data);
      } catch {
        // אם אין טוקן/שגיאה — לא מפיל כלום, סתם לא מציג שם
      }
    })();
    return () => { mounted = false; };
  }, []);

  function logout() {
    try { localStorage.removeItem('token'); } catch {}
    navigate('/login', { replace: true });
  }

  return (
    <div className="navbar">
      {/* לוגו/כותרת */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--brand), var(--brand-600))'
        }} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      <div className="nav-spacer" />

      {/* צד ימין: שם משתמש + Logout + (אופציונלי) Dark Mode */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {me?.name && (
          <span className="badge" title={me.email || ''}>
            {me.name}
          </span>
        )}

        {/* אם יש לך קומפוננטה של Dark Mode Toggle – שים אותה כאן: */}
        {rightSlot /* לדוגמה: <DarkToggle/> */}

        <button className="btn-ghost" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
