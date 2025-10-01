// client/src/pages/CreateInvite.jsx
import React, { useState } from 'react';
import { api, handleApiError } from '../api';

export default function CreateInvite() {
  const [role, setRole] = useState('employee');
  const [days, setDays] = useState(7);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  async function generate(e) {
    e?.preventDefault?.();
    setBusy(true);
    setErr('');
    setRes(null);
    try {
      const { data } = await api.post('/invite/create', {
        role,
        expiresInDays: Number(days) || 7,
        email: email.trim() ? email.trim() : undefined,
      });
      setRes(data);
    } catch (e) {
      setErr(handleApiError(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
  }

  function mailtoHref() {
    const to = (res?.email || email || '').trim();
    const subject = 'Your Costoro TimeWatch invite';
    const body = `Hi,

You have been invited to join Costoro • TimeWatch.

Invite link:
${res?.inviteUrl || ''}

This link may expire on: ${res?.expiresAt ? new Date(res.expiresAt).toLocaleString() : 'N/A'}

Thanks,
Costoro`;
    const qp = new URLSearchParams({
      subject,
      body
    });
    return `mailto:${encodeURIComponent(to)}?${qp.toString()}`;
  }

  return (
    <div className="container" style={{ maxWidth: 860, marginTop: 32 }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 className="h1" style={{ marginBottom: 4 }}>Create Invite</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Generate a signed invite link with an expiration.
        </p>

        <form onSubmit={generate} className="grid" style={{ gap: 12, gridTemplateColumns: '1fr 1fr 1.5fr', alignItems: 'end' }}>
          <label className="block">
            <span className="muted">Role</span>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="block">
            <span className="muted">Expires (days)</span>
            <input
              type="number"
              min="1"
              className="input"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="muted">Lock to Email (optional)</span>
            <input
              type="email"
              className="input"
              placeholder="user@example.com (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Generating…' : 'Generate Invite'}
            </button>
          </div>
        </form>

        {err && (
          <div className="card" style={{ marginTop: 12, padding: 12, border: '1px solid #fecaca', background: '#fff1f2', color: '#991b1b' }}>
            {err}
          </div>
        )}

        {res?.inviteUrl && (
          <div className="card" style={{ marginTop: 16, padding: 16, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
            <div className="flex" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="badge" style={{ background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: 999 }}>Invite ready</div>
              <div className="muted">Expires: {res.expiresAt ? new Date(res.expiresAt).toLocaleString() : 'N/A'}</div>
            </div>

            <label className="block">
              <span className="muted">Invite Link</span>
              <input className="input" readOnly value={res.inviteUrl} />
            </label>

            <div className="flex" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" type="button" onClick={() => copy(res.inviteUrl)}>Copy Link</button>
              <a className="btn-ghost" href={res.inviteUrl} target="_blank" rel="noreferrer">Open Link</a>
              <button className="btn-ghost" type="button" onClick={() => copy(res.token)} title="Copy raw token">Copy Token</button>

              {/* שליחה דרך תוכנת המייל המקומית (mailto) — לא דורש SMTP */}
              <a
                className="btn-ghost"
                href={mailtoHref()}
                onClick={(e) => {
                  // אם אין כתובת מייל בכלל, נתריע ידידותית – אבל זה לא חובה
                  const to = (res?.email || email || '').trim();
                  if (!to) {
                    e.preventDefault();
                    alert('Tip: To send by email, fill the email field (optional) or copy the link and send manually.');
                  }
                }}
              >
                Send via Email
              </a>

              {/* אינדיקציה אם השרת ניסה לשלוח */}
              {(res?.emailSent || res?.emailSkipped) && (
                <span className="muted" style={{ marginLeft: 6 }}>
                  {res.emailSent
                    ? 'Email sent from server.'
                    : res.emailSkipped
                      ? 'Server email not configured – used local email client.'
                      : null}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
