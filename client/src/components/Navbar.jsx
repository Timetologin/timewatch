// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';

/**
 * ניווט עליון:
 * - Dashboard / Live / About / Kiosk / Users*
 * - שעון ישראל מעוצב, מתעדכן מיושר לשניות (ללא דילוגים)
 */
export default function Navbar({ rightSlot = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);

  // ⏰ שעון ישראל
  const [ilTime, setIlTime] = useState({ time: '--:--:--', date: '' });

  // מי אני + הרשאות
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (mounted) setMe(data);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  // ⏰ שעון – תזמון לשנייה הבאה (ללא קפיצות)
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const dateFmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    });

    let timer;
    const tick = () => {
      const now = new Date();
      setIlTime({ time: timeFmt.format(now), date: dateFmt.format(now) + ' • שעון ישראל' });
      const delay = 1000 - (now.getTime() % 1000) + 5; // מיושרים לשנייה הבאה
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    if (typeof onLogout === 'function') onLogout(navigate);
    else {
      try { localStorage.removeItem('token'); localStorage.removeItem('auth'); }
      finally { navigate('/login', { replace: true }); }
    }
  };

  const canManageUsers = !!me?.permissions?.usersManage;
  const canSeePresence = !!(
    me?.permissions?.attendanceReadAll ||
    me?.permissions?.usersManage ||
    me?.permissions?.reportExport ||
    me?.permissions?.admin
  );

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="navbar" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="Costoro Logo" style={{ height: 32, width: 32, borderRadius: 6 }} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      <div style={{ flex: 1 }} />

      <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link className={`link${isActive('/') ? ' active' : ''}`} to="/">Dashboard</Link>
        {canSeePresence && (
          <Link className={`link${isActive('/presence') ? ' active' : ''}`} to="/presence">Live</Link>
        )}
        <Link className={`link${isActive('/about') ? ' active' : ''}`} to="/about">About</Link>
        <Link className={`link${isActive('/kiosk') ? ' active' : ''}`} to="/kiosk">Kiosk</Link>
        {canManageUsers && (
          <Link className={`link${isActive('/admin') ? ' active' : ''}`} to="/admin/users">Users</Link>
        )}

        {/* ⏰ שעון ישראל – עיצוב נקי ודיגיטלי */}
        <span className="il-clock" title={ilTime.date} dir="ltr" aria-label="Israel time">
          <span className="flag">🇮🇱</span>
          <span className="digits">{ilTime.time}</span>
        </span>

        {me?.name && (
          <span className="badge" title={me.email || ''} style={{ marginLeft: 4 }}>
            {me.name}
          </span>
        )}

        {rightSlot}
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </nav>

      <style>{`
        .link { color:#334155; text-decoration:none; padding:6px 8px; border-radius:8px; }
        .link:hover { background:#f1f5f9; }
        .link.active { background:#e2e8f0; color:#0f172a; }
        .badge { background:#e2e8f0; color:#0f172a; padding:4px 8px; border-radius:999px; font-size:12px; }
        .btn-ghost { background:transparent; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; cursor:pointer; }
        .btn-ghost:hover { background:#f8fafc; }

        .il-clock {
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 10px; border-radius:10px;
          border:1px solid #e2e8f0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 1px 0 rgba(15,23,42,.04), inset 0 0 0 1px rgba(255,255,255,.6);
        }
        .il-clock .flag { font-size:14px; }
        .il-clock .digits {
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          letter-spacing: .5px;
          color:#0f172a;
          min-width: 88px; /* רוחב קבוע כדי לא "לרקוד" */
          text-align:center;
        }
      `}</style>
    </div>
  );
}
