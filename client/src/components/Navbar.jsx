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
        // אם אין טוקן/שגיאה, ה־api interceptor כבר ינתב ללוגין
      }
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  const handleLogout = () => {
    if (typeof onLogout === 'function') onLogout(navigate);
    else {
      try { localStorage.removeItem('token'); } catch {}
      navigate('/login', { replace: true });
    }
  };

  const canManageUsers = !!me?.permissions?.usersManage;

  return (
    <div className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="Costoro Logo" style={{ height: 32, width: 32, borderRadius: 6 }} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      <div className="nav-spacer" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link className="link" to="/">Dashboard</Link>
        <Link className="link" to="/about">About</Link>
        {canManageUsers && <Link className="link" to="/admin/users">Users</Link>}
        {me?.name && <span className="badge" title={me.email || ''}>{me.name}</span>}
        {rightSlot}
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
