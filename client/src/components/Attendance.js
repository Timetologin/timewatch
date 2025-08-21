// client/src/components/Attendance.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Attendance({ token }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const base = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const api = axios.create({
    baseURL: `${base}/api/attendance`,
    headers: { Authorization: `Bearer ${token}` }
  });

  async function fetchHistory() {
    try {
      // נביא 7 ימים אחורה דרך /report – השרת יחזיר "רק אני" אם אין הרשאת attendanceReadAll
      const to = new Date();
      const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
      const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);

      const res = await axios.get(`${base}/api/attendance/report?from=${iso(from)}&to=${iso(to)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.message || e.message || 'Error loading history');
    }
  }

  async function doAction(path, body = {}) {
    setLoading(true);
    setMessage('');
    try {
      await api.post(path, body);
      setMessage('Done ✔');
      await fetchHistory();
    } catch (e) {
      setMessage(e?.response?.data?.message || e.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHistory(); }, []);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-40" disabled={loading} onClick={() => doAction('/clockin')}>Clock In</button>
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-40" disabled={loading} onClick={() => doAction('/clockout')}>Clock Out</button>
        <button className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-40" disabled={loading} onClick={() => doAction('/break/start')}>Start Break</button>
        <button className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-40" disabled={loading} onClick={() => doAction('/break/end')}>End Break</button>
        {message && <span className="ml-2 text-sm">{message}</span>}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="py-2 px-3 text-left">Date</th>
              <th className="py-2 px-3 text-left">Clock In</th>
              <th className="py-2 px-3 text-left">Clock Out</th>
              <th className="py-2 px-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan="4" className="py-4 px-3 text-slate-500">No records</td></tr>
            ) : history.map(row => (
              <tr key={row._id} className="border-t">
                <td className="py-2 px-3">{row.date}</td>
                <td className="py-2 px-3">{fmt(row.clockIn)}</td>
                <td className="py-2 px-3">{fmt(row.clockOut)}</td>
                <td className="py-2 px-3">{row.notes || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
