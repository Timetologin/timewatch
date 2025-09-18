// client/src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmojiPicker from './EmojiPicker';
import api from '../api';

export default function Navbar({ rightSlot = null }) {
  const { user: me, permissions, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // israel time
  const [il, setIL] = useState({ time: '--:--:--', date: '', title: '' });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  // רענון קל לאחר ניווט (אם משהו השתנה)
  useEffect(() => {
    refreshMe().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // שעון ישראל
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    const titleFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    let timer;
    const tick = () => {
      const now = new Date();
      setIL({ time: timeFmt.format(now), date: dateFmt.format(now), title: titleFmt.format(now) + ' • שעון ישראל' });
      const delay = 1000 - (now.getTime() % 1000) + 5;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e) => { if (!pickerRef.current) return; if (!pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const canManageUsers = !!permissions?.usersManage || !!permissions?.admin;
  const canSeePresence = !!(permissions?.attendanceReadAll || permissions?.usersManage || permissions?.reportExport || permissions?.admin);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const updateEmoji = async (emoji) => {
    try {
      await api.patch('/attendance/profile/emoji', { emoji });
      await refreshMe();
      setShowPicker(false);
    } catch {}
  };

  return (
    <header className="navbar" style={styles.navbar}>
      {/* Brand */}
      <div style={styles.brand}>
        <img src="/logo.png" alt="Costoro Logo" style={styles.logo} />
        <strong>Costoro • TimeWatch</strong>
      </div>

      {/* Desktop nav */}
      <nav className="nav-desktop" style={styles.desktopNav}>
        <Link className={`link${isActive('/') ? ' active' : ''}`} to="/">Dashboard</Link>
        {canSeePresence && <Link className={`link${isActive('/presence') ? ' active' : ''}`} to="/presence">Live</Link>}
        <Link className={`link${isActive('/about') ? ' active' : ''}`} to="/about">About</Link>
        <Link className={`link${isActive('/kiosk') ? ' active' : ''}`} to="/kiosk">Kiosk</Link>
        {canManageUsers && (
          <>
            <Link className={`link${isActive('/admin/users') ? ' active' : ''}`} to="/admin/users">Users</Link>
            <Link className={`link${isActive('/admin/invites') ? ' active' : ''}`} to="/admin/invites">Invites</Link>
          </>
        )}

        {/* Emoji + name */}
        <div ref={pickerRef} style={{ position: 'relative' }}>
          <button className="btn-ghost" onClick={() => setShowPicker((s) => !s)} title="Change profile emoji">
            <span style={{ fontSize: 18, marginRight: 6 }}>{me?.profileEmoji || '🙂'}</span>
            {me?.name || 'User'}
          </button>
          {showPicker && (
            <div style={styles.pickerPop}>
              <EmojiPicker value={me?.profileEmoji} onPick={updateEmoji} />
            </div>
          )}
        </div>

        {/* Israel clock */}
        <span className="il-clock" title={il.title} dir="ltr" aria-label="Israel time" style={styles.clock}>
          <span style={styles.flag}>🇮🇱</span>
          <span style={styles.digits}>{il.time}</span>
          <span style={styles.dateChip}>{il.date}</span>
        </span>

        {rightSlot}
        <button className="btn-ghost" onClick={handleLogout}>Logout</button>
      </nav>

      {/* Burger for mobile */}
      <button className="burger" aria-label="Menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((s) => !s)} style={styles.burger}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" style={{ marginRight: 8 }}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span style={styles.burgerLabel}>Menu</span>
      </button>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="nav-mobile" style={styles.mobilePanel}>
          <Link className={`m-link${isActive('/') ? ' active' : ''}`} to="/" style={styles.mLink}>Dashboard</Link>
          {canSeePresence && <Link className={`m-link${isActive('/presence') ? ' active' : ''}`} to="/presence" style={styles.mLink}>Live</Link>}
          <Link className={`m-link${isActive('/about') ? ' active' : ''}`} to="/about" style={styles.mLink}>About</Link>
          <Link className={`m-link${isActive('/kiosk') ? ' active' : ''}`} to="/kiosk" style={styles.mLink}>Kiosk</Link>
          {canManageUsers && (
            <>
              <Link className={`m-link${isActive('/admin/users') ? ' active' : ''}`} to="/admin/users" style={styles.mLink}>Users</Link>
              <Link className={`m-link${isActive('/admin/invites') ? ' active' : ''}`} to="/admin/invites" style={styles.mLink}>Invites</Link>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button className="btn-ghost" onClick={() => setShowPicker((s) => !s)}>
              <span style={{ fontSize: 18, marginRight: 6 }}>{me?.profileEmoji || '🙂'}</span>
              {me?.name || 'User'}
            </button>
          </div>

          {showPicker && (
            <div style={{ marginTop: 8 }}>
              <EmojiPicker value={me?.profileEmoji} onPick={updateEmoji} />
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <span title={il.title} dir="ltr" aria-label="Israel time" style={styles.clockMobile}>
              <span style={{ marginRight: 6 }}>🇮🇱</span>
              <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' }}>{il.time}</strong>
            </span>
          </div>

          <button className="btn" onClick={handleLogout} style={{ marginTop: 10, width: '100%' }}>Logout</button>
        </div>
      )}
    </header>
  );
}

const styles = {
  navbar: { padding: '12px 16px', position: 'sticky', top: 0, zIndex: 30, background: 'var(--navbar-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'saturate(140%) blur(8px)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { height: 32, width: 32, borderRadius: 6, objectFit: 'contain' },
  desktopNav: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 },
  burger: { marginLeft: 'auto', height: 36, padding: '0 12px', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'none' },
  burgerLabel: { fontSize: 14, fontWeight: 700, letterSpacing: 0.2 },
  mobilePanel: { position: 'fixed', top: 60, right: 12, left: 12, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', padding: 12, display: 'grid', gap: 8 },
  mLink: { textDecoration: 'none', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', background: 'var(--surface)' },
  pickerPop: { position: 'absolute', right: 0, top: 44, zIndex: 40 },
  clock: { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 12, color: '#fff', border: '1px solid rgba(255,255,255,.22)', background: 'linear-gradient(135deg, var(--primary-1) 0%, var(--primary-2) 60%, var(--primary-3) 100%)', boxShadow: '0 10px 22px rgba(99,102,241,.25), inset 0 0 0 1px rgba(255,255,255,.25)' },
  flag: { fontSize: 14, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.25))' },
  digits: { fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontWeight: 700, letterSpacing: '.6px', minWidth: 96, textAlign: 'center', textShadow: '0 1px 1px rgba(0,0,0,.25)' },
  dateChip: { fontSize: 12, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,.18)', color: 'rgba(255,255,255,.95)', whiteSpace: 'nowrap' },
  clockMobile: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: '#eef2ff', color: '#0f172a' },
};

// הצגת burger רק במובייל
const styleEl = document.createElement('style');
styleEl.innerHTML = `
  @media (max-width: 900px){ .burger { display:inline-flex !important; } .nav-desktop{ display:none !important; } }
  @media (min-width: 901px){ .burger { display:none !important; } .nav-desktop{ display:flex !important; } }
`;
document.head.appendChild(styleEl);
