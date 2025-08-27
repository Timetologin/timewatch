// client/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Navbar({ rightSlot = null, onLogout }) {
  const navigate = useNavigate();
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
  }, []);

  const logout = () => {
    if (onLogout) return onLogout(navigate);
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
        {me?.name && <span className="badge" title={me.email || ''}>{me.name}</span>}
        {rightSlot}
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
