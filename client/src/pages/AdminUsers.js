// client/src/pages/AdminUsers.js
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const defaultPerms = {
  usersManage: false,
  attendanceReadAll: false,
  attendanceEdit: false,
  reportExport: true,
  kioskAccess: false,
};

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, title, text) => setToast({ show: true, type: type === 'error' ? 'error' : 'success', title, message: text });
  const closeToast = () => setToast(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editBusy, setEditBusy] = useState(false);

  // New user modal
  const [newOpen, setNewOpen] = useState(false);
  const [newBusy, setNewBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    active: true,
    permissions: { ...defaultPerms }
  });

  // Delete modal
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delUser, setDelUser] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api('/api/admin');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast('error', 'Error', e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEdit(u) {
    setEditUser({
      ...u,
      permissions: { ...defaultPerms, ...u.permissions }
    });
    setEditOpen(true);
  }

  function onEditChange(e) {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('perm.')) {
      const key = name.slice(5);
      setEditUser((u) => ({ ...u, permissions: { ...u.permissions, [key]: type === 'checkbox' ? checked : value } }));
    } else {
      setEditUser((u) => ({ ...u, [name]: type === 'checkbox' ? checked : value }));
    }
  }

  async function saveEdit() {
    if (!editUser?._id) return;
    setEditBusy(true);
    try {
      const payload = {
        name: editUser.name,
        role: editUser.role,
        department: editUser.department,
        active: !!editUser.active,
        permissions: editUser.permissions
      };
      const data = await api(`/api/admin/${editUser._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setEditOpen(false);
      setEditUser(null);
      showToast('success', 'Saved', 'User updated');
      setRows((rows) => rows.map(r => (r._id === data._id ? data : r)));
    } catch (e) {
      showToast('error', 'Error', e.message || 'Failed to update user');
    } finally {
      setEditBusy(false);
    }
  }

  function openNew() {
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
      department: '',
      active: true,
      permissions: { ...defaultPerms }
    });
    setNewOpen(true);
  }

  function onNewChange(e) {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('perm.')) {
      const key = name.slice(5);
      setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: type === 'checkbox' ? checked : value } }));
    } else {
      setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    }
  }

  async function saveNew() {
    setNewBusy(true);
    try {
      const payload = { ...form };
      const created = await api('/api/admin', { method: 'POST', body: JSON.stringify(payload) });
      setRows((rows) => [created, ...rows]);
      setNewOpen(false);
      showToast('success', 'Created', 'User created');
    } catch (e) {
      showToast('error', 'Error', e.message || 'Failed to create user');
    } finally {
      setNewBusy(false);
    }
  }

  function askDelete(u) {
    setDelUser(u);
    setDelOpen(true);
  }

  async function doDelete() {
    if (!delUser?._id) return;
    setDelBusy(true);
    try {
      await api(`/api/admin/${delUser._id}`, { method: 'DELETE' });
      setRows((rows) => rows.filter(r => r._id !== delUser._id));
      setDelOpen(false);
      setDelUser(null);
      showToast('success', 'Deleted', 'User deleted');
    } catch (e) {
      showToast('error', 'Error', e.message || 'Failed to delete user');
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <div className="container-page">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Users</h1>
          <button onClick={openNew} className="btn btn-primary">New user</button>
        </div>

        <div className="mt-4 overflow-auto border rounded-xl">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="py-2 px-3 text-left">Name</th>
                <th className="py-2 px-3 text-left">Email</th>
                <th className="py-2 px-3 text-left">Role</th>
                <th className="py-2 px-3 text-left">Active</th>
                <th className="py-2 px-3 text-left">Dept</th>
                <th className="py-2 px-3 text-left">Permissions</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="py-6 px-3 text-slate-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="7" className="py-6 px-3 text-slate-500">No users</td></tr>
              ) : rows.map(u => (
                <tr key={u._id} className="border-t">
                  <td className="py-2 px-3">{u.name}</td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">{u.role}</td>
                  <td className="py-2 px-3">{u.active ? 'Yes' : 'No'}</td>
                  <td className="py-2 px-3">{u.department || '-'}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {u.permissions?.usersManage && <span className="chip">usersManage</span>}
                      {u.permissions?.attendanceReadAll && <span className="chip">attendanceReadAll</span>}
                      {u.permissions?.attendanceEdit && <span className="chip">attendanceEdit</span>}
                      {u.permissions?.reportExport && <span className="chip">reportExport</span>}
                      {u.permissions?.kioskAccess && <span className="chip">kioskAccess</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button className="btn btn-secondary mr-2" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => askDelete(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={()=>setEditOpen(false)}
        title="Edit user"
        actions={
          <>
            <button className="btn btn-secondary" onClick={()=>setEditOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={editBusy} onClick={saveEdit}>
              {editBusy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input className="input" name="name" value={editUser?.name || ''} onChange={onEditChange}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Role</label>
              <select className="input" name="role" value={editUser?.role || 'user'} onChange={onEditChange}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Department</label>
              <input className="input" name="department" value={editUser?.department || ''} onChange={onEditChange}/>
            </div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" name="active" checked={!!editUser?.active} onChange={onEditChange}/>
              <span>Active</span>
            </label>
          </div>

          <div className="pt-2">
            <div className="font-medium mb-2">Permissions</div>
            {['usersManage','attendanceReadAll','attendanceEdit','reportExport','kioskAccess'].map(k => (
              <label key={k} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name={`perm.${k}`} checked={!!editUser?.permissions?.[k]} onChange={onEditChange}/>
                <span>{k}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* New user modal */}
      <Modal
        open={newOpen}
        onClose={()=>setNewOpen(false)}
        title="New user"
        actions={
          <>
            <button className="btn btn-secondary" onClick={()=>setNewOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={newBusy} onClick={saveNew}>
              {newBusy ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input className="input" name="name" value={form.name} onChange={onNewChange}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input" name="email" value={form.email} onChange={onNewChange}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input className="input" name="password" type="password" value={form.password} onChange={onNewChange}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Role</label>
              <select className="input" name="role" value={form.role} onChange={onNewChange}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Department</label>
              <input className="input" name="department" value={form.department} onChange={onNewChange}/>
            </div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" name="active" checked={!!form.active} onChange={onNewChange}/>
              <span>Active</span>
            </label>
          </div>

          <div className="pt-2">
            <div className="font-medium mb-2">Permissions</div>
            {['usersManage','attendanceReadAll','attendanceEdit','reportExport','kioskAccess'].map(k => (
              <label key={k} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name={`perm.${k}`} checked={!!form.permissions[k]} onChange={onNewChange}/>
                <span>{k}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={delOpen}
        onClose={()=>setDelOpen(false)}
        title="Delete user"
        actions={
          <>
            <button className="btn btn-secondary" onClick={()=>setDelOpen(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={delBusy} onClick={doDelete}>
              {delBusy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <div className="text-sm">
          Delete <b>{delUser?.name || delUser?.email}</b>?<br/>
          <span className="text-slate-500">This action cannot be undone.</span>
        </div>
      </Modal>

      {toast && <Toast {...toast} onClose={closeToast} />}
    </div>
  );
}
