// client/src/pages/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api, handleApiError } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// כוללת הרשאת עקיפת מיקום
const PERM_LIST = [
  ['usersManage', 'Users manage'],
  ['attendanceReadAll', 'Attendance read all'],
  ['attendanceEdit', 'Attendance edit'],
  ['reportExport', 'Report export'],
  ['kioskAccess', 'Kiosk access'],
  ['attendanceBypassLocation', 'Bypass location'],
  ['inviteCreate', 'Invite create'], // ✅ תוספת חדשה
];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    active: true,
    permissions: {
      usersManage: false,
      attendanceReadAll: false,
      attendanceEdit: false,
      reportExport: true,
      kioskAccess: false,
      attendanceBypassLocation: false,
      inviteCreate: false, // ✅ תוספת חדשה
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me').then(r => r.data);
        if (!me?.permissions?.usersManage) {
          toast.error('Not authorized');
          navigate('/', { replace: true });
          return;
        }
        await load();
      } catch (e) {
        toast.error(handleApiError(e));
      }
    })();
    // eslint-disable-next-line
  }, []);

  const load = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, limit: 200 } });
      const list = data?.users || data?.items || [];
      setRows(list);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => rows, [rows]);

  const togglePermInForm = (k) =>
    setForm(f => ({ ...f, permissions: { ...f.permissions, [k]: !f.permissions[k] } }));

  const createUser = async () => {
    try {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        toast.error('Name, email and password are required');
        return;
      }
      const payload = { ...form, email: form.email.trim().toLowerCase() };
      await api.post('/admin/users', payload);
      toast.success('User created');
      setShowNew(false);
      setForm(f => ({ ...f, name: '', email: '', password: '' }));
      await load();
    } catch (e) {
      toast.error(handleApiError(e));
    }
  };

  return (
    <div className="container">
      <h2 className="h2">Users</h2>

      <div style={{ display:'flex', gap:8, margin:'12px 0 16px' }}>
        <input
          className="input"
          placeholder="Search name or email…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') load(); }}
          style={{ maxWidth: 320 }}
        />
        <button className="btn" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Search'}
        </button>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Close' : 'New user'}
        </button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="grid-2">
            <div>
              <label className="muted">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="muted">Email</label>
              <input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="muted">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="muted">Role</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="muted">Department</label>
              <input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="muted">Active</label><br />
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 6 }}>Permissions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {PERM_LIST.map(([k, label]) => (
                <label key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={!!form.permissions[k]} onChange={() => togglePermInForm(k)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn" onClick={createUser}>Create</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: 180 }}>Name</th>
              <th style={{ minWidth: 220 }}>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Dept</th>
              {PERM_LIST.map(([key,label]) => <th key={key}>{label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="muted" colSpan={6 + PERM_LIST.length}>No users</td></tr>
            ) : (
              filtered.map(u => <UserRow key={u.id || u._id} user={u} onSaved={load} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ user, onSaved }) {
  const [edit, setEdit] = useState(false);

  const [draft, setDraft] = useState({
    name: user.name || '',
    email: user.email || '',
    password: '',
    role: user.role || 'user',
    department: user.department || '',
    active: !!user.active,
  });

  const [perms, setPerms] = useState(user.permissions || {});
  useEffect(() => {
    setPerms(user.permissions || {});
    setDraft({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      department: user.department || '',
      active: !!user.active,
    });
  }, [user]);

  const savePerms = async () => {
    try {
      await api.patch(`/admin/users/${user.id || user._id}/permissions`, { permissions: perms });
      toast.success('Permissions saved');
      onSaved?.();
    } catch (e) {
      toast.error(handleApiError(e));
    }
  };

  const saveProfile = async () => {
    try {
      const payload = { ...draft };
      if (!payload.password) delete payload.password; // לא משנה אם ריק
      await api.patch(`/admin/users/${user.id || user._id}`, payload);
      toast.success('User updated');
      setEdit(false);
      onSaved?.();
    } catch (e) {
      toast.error(handleApiError(e));
    }
  };

  return (
    <tr>
      <td>
        {edit ? (
          <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        ) : user.name || '-'}
      </td>
      <td>
        {edit ? (
          <input className="input" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
        ) : user.email}
      </td>
      <td>
        {edit ? (
          <select className="input" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        ) : user.role}
      </td>
      <td>
        {edit ? (
          <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />
        ) : (user.active ? 'Yes' : 'No')}
      </td>
      <td>
        {edit ? (
          <input className="input" value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })} />
        ) : (user.department || '-')}
      </td>

      {/* Permissions columns */}
      {PERM_LIST.map(([key]) => (
        <td key={key}>
          <input
            type="checkbox"
            checked={!!perms?.[key]}
            onChange={(e)=>setPerms(p => ({ ...p, [key]: e.target.checked }))}
          />
        </td>
      ))}

      <td style={{ whiteSpace: 'nowrap' }}>
        {edit ? (
          <>
            <input
              className="input"
              style={{ width: 120, marginRight: 8 }}
              type="password"
              placeholder="New password (optional)"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            />
            <button className="btn" onClick={saveProfile}>Update</button>
            <button className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(false); setDraft({ ...draft, password: '' }); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setEdit(true)}>Edit</button>
            <button className="btn" style={{ marginLeft: 8 }} onClick={savePerms}>Save perms</button>
          </>
        )}
      </td>
    </tr>
  );
}
