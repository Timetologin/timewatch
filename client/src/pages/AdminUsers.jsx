// client/src/pages/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PERM_KEYS = [
  ['usersManage', 'Users manage'],
  ['attendanceEdit', 'Attendance edit'],
  ['attendanceReadAll', 'Attendance read all'],
  ['reportExport', 'Report export'],
  ['kioskAccess', 'Kiosk access'],
  ['attendanceBypassLocation', 'Bypass location'], // NEW
];

export default function AdminUsers() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        setMe(data);
        if (!data?.permissions?.usersManage) {
          toast.error('Not authorized');
          navigate('/', { replace: true });
          return;
        }
        await load();
      } catch (e) {
        toast.error('Failed to load');
      }
    })();
    // eslint-disable-next-line
  }, []);

  const load = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q } });
      setRows(data?.users || []);
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="container">
      <h2 className="h2">Users</h2>
      <p className="muted">Manage roles & permissions.</p>

      <div style={{ display:'flex', gap:8, margin:'12px 0 16px' }}>
        <input
          className="input"
          placeholder="Search name or email…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') load(); }}
          style={{ maxWidth: 320 }}
        />
        <button className="btn" onClick={load} disabled={busy}>{busy ? 'Loading…' : 'Search'}</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>Name</th>
              <th style={{ minWidth: 260 }}>Email</th>
              {PERM_KEYS.map(([key,label]) => <th key={key}>{label}</th>)}
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <UserRow key={u._id || u.id} user={u} onSaved={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ user, onSaved }) {
  const [perms, setPerms] = useState(user.permissions || {});
  useEffect(()=>{ setPerms(user.permissions || {}); }, [user]);

  const save = async () => {
    try {
      await api.patch(`/admin/users/${user._id || user.id}/permissions`, { permissions: perms });
      onSaved?.();
    } catch (e) {
      // toast תוסף קיים בפרויקט; אם תרצה אפשר להוסיף כאן
      console.error(e);
    }
  };

  return (
    <tr>
      <td>{user.name || '-'}</td>
      <td>{user.email}</td>
      {PERM_KEYS.map(([key]) => (
        <td key={key}>
          <input
            type="checkbox"
            checked={!!perms?.[key]}
            onChange={(e)=>setPerms(p => ({ ...p, [key]: e.target.checked }))}
          />
        </td>
      ))}
      <td><button className="btn" onClick={save}>Save</button></td>
    </tr>
  );
}
