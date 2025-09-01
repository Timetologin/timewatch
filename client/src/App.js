// client/src/App.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import UIProvider from './components/UIProvider';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import { api, handleApiError } from './api';
import toast from 'react-hot-toast';
import About from './pages/About';
import AdminUsers from './pages/AdminUsers'; // ← NEW

function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data?.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img src="/logo.png" alt="Costoro Logo" style={{ height: 80 }} />
      </div>

      <h2 className="h2">Login</h2>
      <p className="muted">Please log in to continue.</p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <input
          type="email"
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <span className="muted">New here? </span>
        <Link to="/register">Create an account</Link>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('token'); } catch { return null; }
  });

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'token') setToken(e.newValue); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const authed = useMemo(() => !!token, [token]);

  const doLogout = useCallback((navigate) => {
    try { localStorage.removeItem('token'); } catch {}
    setToken(null);
    navigate('/login', { replace: true });
  }, []);

  return (
    <UIProvider>
      <BrowserRouter>
        {authed && <Navbar onLogout={doLogout} />}

        <Routes>
          <Route path="/" element={authed ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/about" element={authed ? <About /> : <Navigate to="/login" replace />} />
          <Route path="/admin/users" element={authed ? <AdminUsers /> : <Navigate to="/login" replace />} /> {/* NEW */}
          <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login setToken={setToken} />} />
          <Route path="/register" element={authed ? <Navigate to="/" replace /> : <Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}
