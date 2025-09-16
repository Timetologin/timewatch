// client/src/pages/Register.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, handleApiError } from '../api';
import toast from 'react-hot-toast';

/**
 * Invite-only registration flow:
 * - If URL has ?invite=TOKEN -> validate and show full sign-up form
 * - If no token -> show "Paste your invite URL or token" field
 */
export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlToken = params.get('invite') || '';

  // phase: "need-invite" | "validating" | "ready" | "error"
  const [phase, setPhase] = useState(urlToken ? 'validating' : 'need-invite');
  const [invite, setInvite] = useState(null);
  const [inviteField, setInviteField] = useState(urlToken);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  // Parse token from pasted input (supports full URL or just token)
  function extractToken(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    // full URL like https://site/register?invite=abc... or just ?invite=...
    const match = s.match(/[?&]invite=([a-zA-Z0-9]+)|^([a-zA-Z0-9]+)$/);
    if (!match) return '';
    return match[1] || match[2] || '';
  }

  // Validate invite token with server
  async function validateInvite(token) {
    if (!token) {
      setPhase('need-invite');
      return;
    }
    setPhase('validating');
    try {
      const { data } = await api.get(`/auth/invite/${token}`);
      if (data?.ok && data.invite) {
        setInvite(data.invite);
        // Prefill email if locked
        if (data.invite.emailLock) {
          setForm((f) => ({ ...f, email: data.invite.emailLock }));
        }
        setPhase('ready');
      } else {
        setPhase('error');
      }
    } catch {
      setPhase('error');
    }
  }

  useEffect(() => {
    if (urlToken) validateInvite(urlToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  async function handleInviteSubmit(e) {
    e.preventDefault();
    const token = extractToken(inviteField);
    if (!token) {
      toast.error('Please paste a valid invite URL or token');
      return;
    }
    await validateInvite(token);
  }

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (!invite) return;

    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        inviteToken: invite.token, // server requires inviteToken
      });
      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth', JSON.stringify(data.user));
      }
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  // === UI ===
  if (phase === 'validating') {
    return <div className="container" style={{ marginTop: 80 }}>Validating invite…</div>;
  }

  if (phase === 'error') {
    return (
      <div className="container" style={{ maxWidth: 520, marginTop: 80 }}>
        <h2 className="h2">Invite invalid or expired</h2>
        <p className="muted">Please request a new invite from your administrator.</p>
        <div style={{ marginTop: 12 }}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    );
  }

  if (phase === 'need-invite') {
    return (
      <div className="container" style={{ maxWidth: 520, marginTop: 80 }}>
        <h2 className="h2">Register (Invite required)</h2>
        <p className="muted">Paste your invite URL or token below to continue.</p>
        <form onSubmit={handleInviteSubmit} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Paste invite URL or token…"
            value={inviteField}
            onChange={(e) => setInviteField(e.target.value)}
            required
          />
          <button className="btn" type="submit">Continue</button>
        </form>
        <div style={{ marginTop: 12 }}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    );
  }

  // phase === 'ready' (show full sign-up form)
  return (
    <div className="container" style={{ maxWidth: 520, marginTop: 80 }}>
      <h2 className="h2">Complete your account</h2>
      <p className="muted">
        Invite role: <strong>{invite.role}</strong>
        {invite.emailLock ? <> • Locked to <strong>{invite.emailLock}</strong></> : null}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <input
          type="text"
          className="input"
          placeholder="Full name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          className="input"
          placeholder="Email address"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          disabled={!!invite.emailLock}
        />

        <input
          type="password"
          className="input"
          placeholder="Password (min 6)"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
        />

        <input
          type="password"
          className="input"
          placeholder="Confirm password"
          name="confirm"
          value={form.confirm}
          onChange={handleChange}
          required
          minLength={6}
        />

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}
