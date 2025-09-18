// client/src/pages/Login.js
import React, { useState } from 'react';
import api from '../api'; // ← default import
import { Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (!data?.token) throw new Error('שרת לא החזיר טוקן');

      // שמירה אחידה בכל המפתחות כדי שכל השכבות יזהו
      localStorage.setItem('auth', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.replace('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'שגיאה בהתחברות');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow px-6 py-7">
        <div className="flex items-center justify-center gap-3 mb-5">
          <img src="/logo.png" alt="Costoro" className="w-10 h-10 rounded-md" />
          <h1 className="text-xl font-bold">התחברות</h1>
        </div>

        {error ? (
          <div className="mb-4 text-rose-600 text-sm text-right">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-3 text-right">
          <div>
            <label className="block text-sm mb-1">אימייל</label>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none"
              type="email"
              name="email"
              dir="ltr"
              placeholder="name@example.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">סיסמה</label>
            <div className="relative">
              <input
                className="w-full border rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none"
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
              >
                {showPass ? 'הסתר' : 'הצג'}
              </button>
            </div>
          </div>

          <button
            className="mt-2 bg-black text-white rounded-xl py-2 hover:opacity-90 disabled:opacity-40"
            disabled={busy}
          >
            {busy ? 'מתחבר…' : 'התחברות'}
          </button>
        </form>

        <div className="mt-4 text-sm text-right">
          אין לך חשבון?{' '}
          <Link to="/register" className="text-blue-600 underline">
            הרשמה
          </Link>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 text-right">
          בעיה בהתחברות? ודא שהדפדפן לא חוסם cookies / localStorage.
        </div>
      </div>
    </div>
  );
}
