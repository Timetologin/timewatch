// client/src/App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import UIProvider from './components/UIProvider';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import { api, handleApiError } from './api';
import toast from 'react-hot-toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
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

const authed = () => !!localStorage.getItem('token');

export default function App() {
  return (
    <UIProvider>
      <BrowserRouter>
        <Routes>
          {/* הרשמה */}
          <Route path="/register" element={authed() ? <Navigate to="/" replace /> : <Register />} />

          {/* התחברות */}
          <Route path="/login" element={authed() ? <Navigate to="/" replace /> : <Login />} />

          {/* דשבורד מוגן */}
          <Route
            path="/"
            element={
              authed() ? (
                <>
                  <Navbar />
                  <Dashboard />
                </>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* ברירת מחדל */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}
