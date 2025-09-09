// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';

export default function Navbar({ rightSlot = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (mounted) setMe(data);
      } catch {
        // interceptor יכוון ללוגין אם צריך
      }
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  const handleLogout = () => {
    if (typeof onLogout === 'function') onLogout(navigate);
    else {
      try { localStorage.removeItem('token'); localStorage.removeItem('auth'); } catch {}
      navigate('/login', { replace: true });
    }
  };

  const canManageUsers = !!me?.permissions?.usersManage;
  const is = (p) => location.pathname === p || location.pathname.startsWith(p + '/');

  return (
    <div className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="Costoro Logo" style={{ height: 32, width: 32, borderRadius: 6 }} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      <div className="nav-spacer" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link className={`link${is('/') ? ' active' : ''}`} to="/">Dashboard</Link>
        <Link className={`link${is('/about') ? ' active' : ''}`} to="/about">About</Link>
        {/* 🔥 לשונית קיוסק */}
        <Link className={`link${is('/kiosk') ? ' active' : ''}`} to="/kiosk">Kiosk</Link>
        {canManageUsers && (
          <Link className={`link${is('/admin') ? ' active' : ''}`} to="/admin/users">Users</Link>
        )}
        {me?.name && <span className="badge" title={me.email || ''}>{me.name}</span>}
        {rightSlot}
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </div>

      {/* הדגשת הלשונית הפעילה אם אין לך CSS לזה */}
      <style>{`
        .link.active { background:#e2e8f0; color:#0f172a; border-radius:8px; padding:6px 8px; }
      `}</style>
    </div>
  );
}
