// client/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : { token: null, user: null };
  });
  const [loading, setLoading] = useState(false);

  // שמירת סטייט בלוקאל־סטורז'
  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(auth));
    if (auth?.token) {
      api.defaults.headers.common.Authorization = `Bearer ${auth.token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [auth]);

  // טעינת /me אם יש טוקן
  useEffect(() => {
    const bootstrap = async () => {
      if (!auth?.token) return;
      try {
        setLoading(true);
        const { data } = await api.get('/auth/me');
        setAuth((prev) => ({ ...prev, user: data }));
      } catch {
        setAuth({ token: null, user: null });
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth({ token: data.token, user: data.user });
    return data.user;
  };

  const logout = () => {
    setAuth({ token: null, user: null });
  };

  const value = useMemo(() => ({ auth, setAuth, login, logout, loading }), [auth, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
