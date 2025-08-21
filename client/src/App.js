// client/src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import Kiosk from './pages/Kiosk';
import QRScan from './pages/QRScan';
import Topbar from './components/Topbar';

function getAuth() {
  const token = localStorage.getItem('token');
  if (token) return { token };
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (auth?.token) return auth;
  } catch {}
  return { token: null };
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('auth') || '{}')?.user || null; } catch { return null; }
}
function isAuthed() {
  const { token } = getAuth();
  return !!token;
}
function isAdmin() {
  const u = getUser();
  return u?.role === 'admin' || !!u?.permissions?.usersManage;
}
function canKiosk() {
  const u = getUser();
  return u?.role === 'admin' || !!u?.permissions?.kioskAccess;
}

export default function App() {
  const authed = isAuthed();

  return (
    <>
      {authed && <Topbar />}

      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={authed ? <Navigate to="/" replace /> : <Register />} />

        <Route path="/" element={authed ? <Dashboard /> : <Navigate to="/login" replace />} />

        <Route
          path="/admin/users"
          element={
            authed
              ? (isAdmin() ? <AdminUsers /> : <div className="container-page"><div className="card p-4">No permission to access this page</div></div>)
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/kiosk"
          element={
            authed
              ? (canKiosk() ? <Kiosk /> : <div className="container-page"><div className="card p-4">No permission to access this page</div></div>)
              : <Navigate to="/login" replace />
          }
        />

        <Route path="/qr" element={authed ? <QRScan /> : <Navigate to="/login" replace />} />

        <Route path="*" element={<Navigate to={authed ? '/' : '/login'} replace />} />
      </Routes>
    </>
  );
}
