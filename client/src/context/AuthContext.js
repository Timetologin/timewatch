// client/src/context/AuthContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const a = localStorage.getItem('auth');
      if (a) return JSON.parse(a);
    } catch {}
    return null;
  });

  const user = auth?.user || null;
  const token = auth?.token || null;

  // רענון פרטי המשתמש מהשרת (אם יש טוקן)
  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const next = { token: token || auth?.token || null, user: data };
      setAuth(next);
      try {
        localStorage.setItem('auth', JSON.stringify(next));
        if (next.token) {
          localStorage.setItem('token', next.token);
          localStorage.setItem('authToken', next.token);
        }
        localStorage.setItem('user', JSON.stringify(next.user));
      } catch {}
      return data;
    } catch {
      return null;
    }
  }, [token, auth]);

  // אתחול: אם יש טוקן ואין user בזיכרון—נמשוך /me
  useEffect(() => {
    const hasToken =
      token ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken');
    if (hasToken && !user) {
      refreshMe();
    }
  }, [token, user, refreshMe]);

  // לוגין—שומר הכל בצורה אחידה
  const login = useCallback((payload) => {
    const next = { token: payload.token, user: payload.user };
    setAuth(next);
    try {
      localStorage.setItem('auth', JSON.stringify(next));
      localStorage.setItem('token', payload.token);
      localStorage.setItem('authToken', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
    } catch {}
  }, []);

  // לוגאאוט—מנקה אחיד
  const logout = useCallback(() => {
    setAuth(null);
    try {
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      auth,
      user,
      token,
      isAuthed: !!token,
      permissions: user?.permissions || {},
      login,
      logout,
      refreshMe,
      setAuth,
    }),
    [auth, user, token, login, logout, refreshMe]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
