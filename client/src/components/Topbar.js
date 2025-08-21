// client/src/components/Topbar.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function getUser() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return auth?.user || null;
  } catch { return null; }
}

export default function Topbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = getUser();

  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const body = document.body;
    if (dark) {
      body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  function logout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('auth');
    } finally {
      // יציאה קשיחה – שלא ישארו קומפוננטים שיורים בלי טוקן
      window.location.replace('/login');
    }
  }

  const isActive = (path) => loc.pathname === path;

  return (
    <div className="container-page">
      <div className="topbar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className={`btn btn-ghost ${isActive('/') ? 'ring-2 ring-[var(--primary)]' : ''}`}>Dashboard</Link>
          {/* 🔧 כאן התיקון: QR Kiosk מצביע ל-/kiosk (עמדת QR), לא ל-/qr (דף סריקה) */}
          <Link to="/kiosk" className={`btn btn-ghost ${isActive('/kiosk') ? 'ring-2 ring-[var(--primary)]' : ''}`}>QR Kiosk</Link>
          <Link to="/admin/users" className={`btn btn-ghost ${isActive('/admin/users') ? 'ring-2 ring-[var(--primary)]' : ''}`}>User Management</Link>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setDark(v => !v)}>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="btn btn-danger" onClick={logout}>Logout</button>

          <div className="ml-3 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border" title={user?.email || ''}>
            <img src="/logo.png" alt="logo" className="w-5 h-5 rounded-full"/>
            <div className="text-sm">
              <div className="font-semibold">{user?.name || 'User'}</div>
              <div className="text-xs opacity-70">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
