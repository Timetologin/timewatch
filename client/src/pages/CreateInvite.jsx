// client/src/pages/CreateInvite.jsx
import React, { useState } from 'react';

export default function CreateInvite() {
  const [role, setRole] = useState('employee');
  const [days, setDays] = useState(7);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // אם יש לך טוקן ב־localStorage/ctx – הוסף Authorization כאן:
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include', // אם אתם עובדים עם cookies/session
        body: JSON.stringify({
          role,
          expiresInDays: Number(days) || 7,
          email: email || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create invite');
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Invite</h1>
      <p className="text-slate-500 mb-6">Generate a signed invite link with an expiration.</p>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm">Role</span>
            <select
              className="w-full mt-1 rounded-xl border border-slate-300 px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Expires (days)</span>
            <input
              type="number"
              min="1"
              className="w-full mt-1 rounded-xl border border-slate-300 px-3 py-2"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm">Lock to Email (optional)</span>
            <input
              type="email"
              className="w-full mt-1 rounded-xl border border-slate-300 px-3 py-2"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl px-4 py-2 bg-blue-600 text-white shadow disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate Invite'}
        </button>
      </form>

      {error && (
        <div className="mt-4 text-red-600 font-medium">
          {error}
        </div>
      )}

      {result?.inviteUrl && (
        <div className="mt-6 p-4 rounded-2xl border border-emerald-300 bg-emerald-50">
          <div className="font-semibold mb-2">Invite Link</div>
          <div className="flex flex-col gap-2">
            <code className="break-all p-2 bg-white rounded border">{result.inviteUrl}</code>
            <div className="text-sm text-slate-500">Expires at: {new Date(result.expiresAt).toLocaleString()}</div>
            <div className="flex gap-2">
              <button
                onClick={() => copy(result.inviteUrl)}
                className="rounded-xl px-3 py-2 border"
              >
                Copy Link
              </button>
              <button
                onClick={() => copy(result.token)}
                className="rounded-xl px-3 py-2 border"
                title="Copy raw token"
              >
                Copy Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
