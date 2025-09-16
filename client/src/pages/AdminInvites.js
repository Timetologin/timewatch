// client/src/pages/AdminInvites.js
import React, { useEffect, useMemo, useState } from 'react';
import { api, handleApiError } from '../api';
import toast from 'react-hot-toast';

const PERM_FIELDS = [
  ['usersManage', 'Users manage'],
  ['attendanceReadAll', 'Attendance read all'],
  ['attendanceEdit', 'Attendance edit'],
  ['reportExport', 'Report export'],
  ['kioskAccess', 'Kiosk access'],
  ['attendanceBypassLocation', 'Bypass location'],
  ['admin', 'Admin (full)'],
];

function buildInviteUrl(token) {
  // יוצרת לינק שימושי לקליינט (בפרוד: דומיין האתר שלך)
  try {
    const base = window.location.origin;
    return `${base}/register?invite=${token}`;
  } catch {
    return `/register?invite=${token}`;
  }
}

export default function AdminInvites() {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    emailLock: '',
    role: 'user',
    maxUses: 1,
    daysValid: 7,
    permissions: {
      usersManage: false,
      attendanceReadAll: false,
      attendanceEdit: false,
      reportExport: false,
      kioskAccess: true,
      attendanceBypassLocation: false,
      admin: false,
    }
  });

  const remaining = (inv) => Math.max(0, (inv.maxUses || 1) - (inv.usedCount || 0));
  const sorted = useMemo(() => {
    return [...list].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [list]);

  async function fetchList() {
    try {
      const { data } = await api.get('/admin/invites');
      if (data?.ok) setList(data.invites || []);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  }

  useEffect(() => { fetchList(); }, []);

  function setPerm(key, value) {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: value } }));
  }

  async function createInvite(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        emailLock: form.emailLock?.trim() || null,
        role: form.role,
        maxUses: Number(form.maxUses) || 1,
        daysValid: Number(form.daysValid) || 7,
        permissions: form.permissions,
      };
      const { data } = await api.post('/admin/invites', payload);
      if (data?.ok) {
        toast.success('Invite created');
        // אם השרת מחזיר inviteUrl – נציג אותו מיד
        if (data.inviteUrl) {
          await navigator.clipboard?.writeText(data.inviteUrl);
          toast('Invite URL copied to clipboard');
        }
        await fetchList();
        // איפוס חלקי (לאפס רק ספירות)
        setForm(f => ({ ...f, maxUses: 1, daysValid: 7 }));
      } else {
        toast.error(data?.error || 'Create failed');
      }
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function disableInvite(token) {
    if (!window.confirm('Disable this invite?')) return;
    try {
      const { data } = await api.post(`/admin/invites/${token}/disable`);
      if (data?.ok) {
        toast.success('Invite disabled');
        await fetchList();
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  }

  async function copyInvite(token) {
    const url = buildInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast('Copied!');
    } catch {
      toast.error('Copy failed');
    }
  }

  return (
    <div className="container" style={{ marginTop: 24, display: 'grid', gap: 16 }}>
      <h2 className="h2">Admin • Invites</h2>
      <p className="muted">Create and manage invitation links. Registration is allowed <strong>only</strong> via a valid invite token.</p>

      {/* Create form */}
      <form onSubmit={createInvite} className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="muted">Invite to email (optional – lock):</label>
          <input
            type="email"
            className="input"
            placeholder="someone@example.com (optional)"
            value={form.emailLock}
            onChange={(e) => setForm(f => ({ ...f, emailLock: e.target.value }))}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label className="muted">Role:</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
          >
            <option value="user">user</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label className="muted">Permissions:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {PERM_FIELDS.map(([key, label]) => (
              <label key={key} className="chip" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                <input
                  type="checkbox"
                  checked={!!form.permissions[key]}
                  onChange={(e) => setPerm(key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          <div>
            <label className="muted">Max uses</label>
            <input
              type="number"
              className="input"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm(f => ({ ...f, maxUses: e.target.value }))}
            />
          </div>
          <div>
            <label className="muted">Days valid</label>
            <input
              type="number"
              className="input"
              min={1}
              value={form.daysValid}
              onChange={(e) => setForm(f => ({ ...f, daysValid: e.target.value }))}
            />
          </div>
        </div>

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create invite'}
        </button>
      </form>

      {/* List */}
      <div className="card" style={{ padding: 16 }}>
        <h3 className="h3" style={{ marginBottom: 10 }}>Invites</h3>

        {sorted.length === 0 && <p className="muted">No invites yet.</p>}

        <div style={{ display: 'grid', gap: 8 }}>
          {sorted.map((inv) => {
            const url = buildInviteUrl(inv.token);
            const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
            const isExpired = exp && exp.getTime() < Date.now();
            const remain = remaining(inv);
            return (
              <div key={inv.token} className="row"
                   style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: 12, border: '1px solid var(--border)', borderRadius: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {inv.emailLock ? inv.emailLock : 'Any email'}
                    {' '}• role: {inv.role || 'user'}
                  </div>
                  <div className="muted" style={{ marginTop: 4, wordBreak: 'break-all' }}>
                    <div>token: <code>{inv.token}</code></div>
                    <div>url: <code>{url}</code></div>
                    <div>uses: {inv.usedCount || 0}/{inv.maxUses || 1} • remaining: {remain}</div>
                    <div>expires: {exp ? exp.toLocaleString() : '—'}</div>
                    <div>active: {String(inv.active)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => copyInvite(inv.token)} disabled={!inv.active || isExpired || remain === 0}>
                    Copy URL
                  </button>
                  <button className="btn-ghost" onClick={() => disableInvite(inv.token)} disabled={!inv.active}>
                    Disable
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
