// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';

/**
 * ניווט עליון:
 * - קישורי Dashboard / Live / About / Kiosk / Users*
 * - שעון ישראל מעוצב עם גרדיינט + תאריך, מתעדכן בדיוק על השנייה
 */
export default function Navbar({ rightSlot = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);

  // ⏰ מצב לשעון ישראל
  const [il, setIL] = useState({ time: '--:--:--', date: '', title: '' });

  /* --------- מי אני והרשאות --------- */
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

  /* --------- שעון ישראל – מיושר לשנייה --------- */
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
    const titleFmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    let timer;
    const tick = () => {
      const now = new Date();
      setIL({
        time: timeFmt.format(now),              // 09:21:05
        date: dateFmt.format(now),              // ג׳, 10/09/2025
        title: titleFmt.format(now) + ' • שעון ישראל',
      });
      const delay = 1000 - (now.getTime() % 1000) + 5; // מיושרים לשנייה הבאה
      timer = window.setTimeout(tick, delay);
    };

    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  /* --------- הרשאות --------- */
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

  /* --------- UI --------- */
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

        {/* ⏰ שעון ישראל – גרדיינט + תאריך */}
        <span className="il-clock" title={il.title} dir="ltr" aria-label="Israel time">
          <span className="flag">🇮🇱</span>
          <span className="digits">{il.time}</span>
          <span className="date-chip">{il.date}</span>
        </span>

        {/* תווית משתמש */}
        {me?.name && (
          <span className="badge" title={me.email || ''} style={{ marginLeft: 4 }}>
            {me.name}
          </span>
        )}

        {rightSlot}
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </nav>

      {/* סגנון נקי ומודרני */}
      <style>{`
        .link { color:#334155; text-decoration:none; padding:6px 8px; border-radius:8px; }
        .link:hover { background:#f1f5f9; }
        .link.active { background:#e2e8f0; color:#0f172a; }
        .badge { background:#e2e8f0; color:#0f172a; padding:4px 8px; border-radius:999px; font-size:12px; }
        .btn-ghost { background:transparent; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; cursor:pointer; }
        .btn-ghost:hover { background:#f8fafc; }

        /* שעון ישראל מעוצב */
        .il-clock {
          display:inline-flex; align-items:center; gap:10px;
          padding:6px 12px;
          border-radius:12px;
          color:#fff;
          border:1px solid rgba(255,255,255,.22);
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #8b5cf6 100%);
          box-shadow:
            0 10px 22px rgba(99,102,241,.25),
            inset 0 0 0 1px rgba(255,255,255,.25);
        }
        .il-clock .flag { font-size:14px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.25)); }
        .il-clock .digits {
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 700;
          letter-spacing: .6px;
          min-width: 96px; /* שומר על רוחב קבוע */
          text-align: center;
          text-shadow: 0 1px 1px rgba(0,0,0,.25);
        }
        .il-clock .date-chip {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.18);
          color: rgba(255,255,255,.95);
          backdrop-filter: blur(2px);
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          /* במסכים צרים – מצמצמים טיפה כדי שלא ישבור את הניווט */
          .il-clock { gap:8px; padding:5px 10px; }
          .il-clock .digits { min-width: 84px; }
          .il-clock .date-chip { display:none; } /* מסתיר את התאריך בסופר-צר */
        }
      `}</style>
    </div>
  );
}
