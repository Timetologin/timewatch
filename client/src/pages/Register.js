// client/src/pages/Register.js
import React, { useState } from 'react';
import { api } from '../api';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    inviteCode: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      };
      if (form.inviteCode.trim()) payload.inviteCode = form.inviteCode.trim();

      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setOk('נרשמת בהצלחה! אפשר להתחבר.');
      // אופציונלי: מעבר אוטומטי ללוגין אחרי שנייה
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(err?.message || 'שגיאה בהרשמה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow px-6 py-7">
        <div className="flex items-center justify-center gap-3 mb-5">
          <img src="/logo.png" alt="Costoro" className="w-10 h-10 rounded-md" />
          <h1 className="text-xl font-bold">הרשמה</h1>
        </div>

        {error && <div className="mb-3 text-rose-600 text-sm text-right">{error}</div>}
        {ok && <div className="mb-3 text-emerald-600 text-sm text-right">{ok}</div>}

        <form onSubmit={onSubmit} className="grid gap-3 text-right">
          <div>
            <label className="block text-sm mb-1">שם מלא</label>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none"
              type="text"
              name="name"
              placeholder="ישראל ישראלי"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

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
            <input
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none"
              type="password"
              name="password"
              placeholder="••••••••"
              minLength={6}
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Invite code (אופציונלי)</label>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 focus:bg-white outline-none"
              type="text"
              name="inviteCode"
              placeholder="יש רק למי שמקבל הרשאת אדמין"
              value={form.inviteCode}
              onChange={onChange}
            />
          </div>

          <button
            className="mt-2 bg-black text-white rounded-xl py-2 hover:opacity-90 disabled:opacity-40"
            disabled={busy}
          >
            {busy ? 'נרשם…' : 'הרשמה'}
          </button>
        </form>

        <div className="mt-4 text-sm text-right">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-blue-600 underline">התחברות</Link>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 text-right">
          טיפ: כדי ליצור אדמין חדש צריך להזין Invite code שתואם ל־<code>ADMIN_INVITE</code> בשרת, ורק אם עוד אין אדמין במערכת.
        </div>
      </div>
    </div>
  );
}
