// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';

/**
 * ניווט עליון ראשי:
 * - Dashboard / Live / About / Kiosk / Users*
 * - *Users מוצג רק אם למשתמש יש הרשאת usersManage
 * - מציג שם משתמש בצד ימין + Logout
 * - מדגיש לשונית פעילה
 * - ⏰ שעון ישראל חי בפינה הימנית
 */
export default function Navbar({ rightSlot = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);

  // ⏰ מצב לשעון ישראל
  const [ilTime, setIlTime] = useState('');
  const [ilTitle, setIlTitle] = useState('');

  // טוען פרטי משתמש כדי לדעת הרשאות + תווית שם/מייל
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (mounted) setMe(data);
      } catch {
        // אם לא מאומת, ה-interceptor יפנה ללוגין
      }
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  // ⏰ מעדכן את השעה בישראל כל שנייה (Asia/Jerusalem)
  useEffect(() => {
    const fmtTime = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const fmtTitle = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const tick = () => {
      const now = new Date();
      setIlTime(fmtTime.format(now));
      setIlTitle(fmtTitle.format(now) + ' • שעון ישראל');
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout(navigate);
    } else {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('auth');
      } finally {
        navigate('/login', { replace: true });
      }
    }
  };

  const canManageUsers = !!me?.permissions?.usersManage;
  // מי יכול לראות את מסך ה-Live presence
  const canSeePresence = !!(
    me?.permissions?.attendanceReadAll ||
    me?.permissions?.usersManage ||
    me?.permissions?.reportExport ||
    me?.permissions?.admin
  );

  // הדגשת לשונית פעילה
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

        {/* לשונית Live (לוח נוכחות חי) רק למורשים */}
        {canSeePresence && (
          <Link className={`link${isActive('/presence') ? ' active' : ''}`} to="/presence">Live</Link>
        )}

        <Link className={`link${isActive('/about') ? ' active' : ''}`} to="/about">About</Link>

        {/* לשונית Kiosk */}
        <Link className={`link${isActive('/kiosk') ? ' active' : ''}`} to="/kiosk">Kiosk</Link>

        {/* לשונית Users רק למורשים */}
        {canManageUsers && (
          <Link className={`link${isActive('/admin') ? ' active' : ''}`} to="/admin/users">Users</Link>
        )}

        {/* ⏰ שעון ישראל בפינה הימנית */}
        <span className="clock" title={ilTitle} dir="ltr">
          🇮🇱 {ilTime}
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

      {/* סטייל מינימלי אם אין לך CSS מוכן */}
      <style>{`
        .link { color:#334155; text-decoration:none; padding:6px 8px; border-radius:8px; }
        .link:hover { background:#f1f5f9; }
        .link.active { background:#e2e8f0; color:#0f172a; }
        .badge { background:#e2e8f0; color:#0f172a; padding:4px 8px; border-radius:999px; font-size:12px; }
        .btn-ghost { background:transparent; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; cursor:pointer; }
        .btn-ghost:hover { background:#f8fafc; }
        .clock { font-variant-numeric: tabular-nums; background:#f8fafc; border:1px solid #e2e8f0; padding:4px 10px; border-radius:8px; }
      `}</style>
    </div>
  );
}
