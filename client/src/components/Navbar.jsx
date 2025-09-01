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
      } catch {}
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    try { localStorage.removeItem('auth'); } catch {}
    try { localStorage.removeItem('token'); } catch {}
    navigate('/login', { replace: true });
  };

  return (
    <div className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="Costoro Logo" style={{ height: 32, width: 32, borderRadius: 6 }} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      <div className="nav-spacer" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" className="link">Dashboard</Link>
        <Link to="/about" className="link">About</Link>
        {me?.name && <span className="badge" title={me.email || ''}>{me.name}</span>}
        {rightSlot}
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
