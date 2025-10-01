// client/src/components/AttendanceTable.jsx
import React, { useEffect, useState } from 'react';
import { api, handleApiError } from '../api';
import Spinner from './Spinner';
import toast from 'react-hot-toast';

const isoDate = (d) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);

export default function AttendanceTable() {
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 6*24*60*60*1000)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await api.get('/attendance/list', { params: { from, to, page, limit } });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, [page, limit]); // שינוי עמוד/גודל
  // כשיוחלפו תאריכים - נחזיר לעמוד 1 ונביא
  useEffect(() => { setPage(1); fetchList(); }, [from, to]);

  const pages = Math.max(1, Math.ceil(total/limit));

  return (
    <div className="card" style={{ marginTop:16 }}>
      <div style={{ display:'flex', gap:12, alignItems:'end', flexWrap:'wrap', marginBottom: 12 }}>
        <div>
          <div className="muted" style={{ fontSize:12 }}>From</div>
          <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <div className="muted" style={{ fontSize:12 }}>To</div>
          <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={()=>{ setPage(1); fetchList(); }}>Refresh</button>
        <span className="badge">Total: {total}</span>
      </div>

      {loading ? <Spinner label="Loading attendance..." /> : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Breaks</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '-'}</td>
                  <td>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '-'}</td>
                  <td>
                    {Array.isArray(r.breaks) && r.breaks.length
                      ? r.breaks.map((b,idx)=>(
                        <div key={idx}>
                          {new Date(b.start).toLocaleTimeString()} – {b.end ? new Date(b.end).toLocaleTimeString() : '...'}
                        </div>
                      ))
                      : <span className="muted">No breaks</span>}
                  </td>
                  <td>{r.notes || ''}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={5} className="muted">No results in this range</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:12, flexWrap:'wrap' }}>
            <button className="btn-ghost" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <span>Page {page} of {pages}</span>
            <button className="btn-ghost" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>

            <label style={{ display:'flex', alignItems:'center', gap:6 }}>
              Per page:
              <select className="input" style={{ width: 90 }}
                value={limit}
                onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value,10)); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
