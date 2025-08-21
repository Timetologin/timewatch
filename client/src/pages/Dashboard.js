// client/src/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const toLocalTime = (d) => (d ? new Date(d).toLocaleTimeString() : '-');
const toLocalDateTime = (d) => (d ? new Date(d).toLocaleString() : '');
const todayISO = () => {
  const d = new Date(); const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};
function fmtMin(n){ const h=Math.floor((n||0)/60); const m=(n||0)%60; return `${h}h ${m}m`; }

export default function Dashboard() {
  const [toast, setToast] = useState(null);
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);

  const [todayRec, setTodayRec] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type, title, message) => setToast({ show: true, type: type === 'error' ? 'error' : 'success', title, message });
  const closeToast = () => setToast(null);

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('auth') || '{}')?.user || null; } catch { return null; }
  }, []);
  const canReadAll = !!me?.permissions?.attendanceReadAll;
  const canEdit    = !!me?.permissions?.attendanceEdit;
  const canExport  = !!me?.permissions?.reportExport;

  async function safeApi(path, opts) {
    try {
      return await api(path, opts);
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('missing token') || msg.includes('401') || msg.includes('not found')) return null;
      throw e;
    }
  }

  async function loadReport() {
    const q = new URLSearchParams({ from, to });
    if (canReadAll && userId) q.set('userId', userId);
    const data = await safeApi(`/api/attendance/report?${q.toString()}`);
    if (data) setRows(Array.isArray(data) ? data : []);
  }
  async function loadUsersForFilter() {
    if (!canReadAll) return;
    const data = await safeApi('/api/admin');
    if (data) setUsers(Array.isArray(data) ? data : []);
  }
  async function loadTodayRecord() {
    const t = todayISO();
    const q = new URLSearchParams({ from: t, to: t });
    const data = await safeApi(`/api/attendance/report?${q.toString()}`);
    if (Array.isArray(data) && data.length > 0) setTodayRec(data[0]); else setTodayRec(null);
  }

  useEffect(() => { loadUsersForFilter(); }, []);
  useEffect(() => { loadReport(); }, [from, to, userId]);
  useEffect(() => { loadTodayRecord(); }, []);

  function setPreset(p) {
    const now = new Date();
    const off = now.getTimezoneOffset() * 60000;
    const iso = (d) => new Date(d.getTime() - off).toISOString().slice(0,10);
    if (p === 'today') { setFrom(iso(now)); setTo(iso(now)); }
    if (p === 'yesterday') { const y=new Date(now); y.setDate(now.getDate()-1); setFrom(iso(y)); setTo(iso(y)); }
    if (p === 'week') { const s=new Date(now); s.setDate(now.getDate() - ((now.getDay()+6)%7)); setFrom(iso(s)); setTo(iso(now)); }
    if (p === 'month') { const s=new Date(now.getFullYear(), now.getMonth(), 1); setFrom(iso(s)); setTo(iso(now)); }
  }

  async function doAction(path, body = {}) {
    setLoading(true);
    try {
      const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
      if (data) { await loadTodayRecord(); await loadReport(); }
    } catch (e) {
      showToast('error', 'Error', e?.message || 'Action failed');
    } finally { setLoading(false); }
  }

  function exportCSV() {
    if (!canExport) return;
    const header = ['Date','ClockIn','ClockOut','RegularMinutes','OvertimeMinutes','TotalMinutes','Notes'];
    const lines = rows.map(r => [
      r.date,
      r.clockIn ? new Date(r.clockIn).toISOString() : '',
      r.clockOut ? new Date(r.clockOut).toISOString() : '',
      r.regularMinutes||0, r.overtimeMinutes||0, r.totalMinutes||0,
      (r.notes||'').replace(/\n/g,' ')
    ]);
    const csv = [header, ...lines].map(a => a.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Report-${(userId||'me')}-${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  function exportExcel() {
    if (!canExport) return;
    const rows2 = rows.map(r => ({
      Date: r.date,
      ClockIn: r.clockIn ? new Date(r.clockIn).toLocaleString() : '',
      ClockOut: r.clockOut ? new Date(r.clockOut).toLocaleString() : '',
      RegularMinutes: r.regularMinutes || 0,
      OvertimeMinutes: r.overtimeMinutes || 0,
      TotalMinutes: r.totalMinutes || 0,
      Notes: r.notes || ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows2);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `Report-${(userId || 'me')}-${from}_to_${to}.xlsx`);
  }
  async function exportPDF() {
    if (!canExport) return;
    const doc = new jsPDF('p', 'pt');
    doc.setFontSize(16); doc.text('Attendance Report', 36, 30);
    doc.setFontSize(11); doc.text(`Range: ${from} → ${to}`, 36, 46);
    const body = rows.map(r => [
      r.date,
      r.clockIn ? new Date(r.clockIn).toLocaleString() : '-',
      r.clockOut ? new Date(r.clockOut).toLocaleString() : '-',
      fmtMin(r.regularMinutes || 0),
      fmtMin(r.overtimeMinutes || 0),
      fmtMin(r.totalMinutes || 0),
      r.notes || ''
    ]);
    // @ts-ignore
    doc.autoTable({
      startY: 64,
      head: [['Date','Clock In','Clock Out','Regular','Overtime','Total','Notes']],
      body, styles: { fontSize: 9 }, headStyles: { fillColor: [99,102,241] }
    });
    doc.save(`Report-${(userId||'me')}-${from}_to_${to}.pdf`);
  }

  const totals = useMemo(() => {
    let reg=0, ot=0, tot=0;
    for (const r of rows) { reg += r.regularMinutes||0; ot += r.overtimeMinutes||0; tot += r.totalMinutes||0; }
    return { reg, ot, tot };
  }, [rows]);

  const liveMin = useLiveMinutes(todayRec);

  // 🔽 לוגיקה לשבתת כפתורים לפי מצב משמרת/הפסקה
  const hasActiveShift  = !!(todayRec?.clockIn && !todayRec?.clockOut);
  const lastBreak       = (todayRec?.breaks || [])[ (todayRec?.breaks || []).length - 1 ];
  const hasActiveBreak  = !!(lastBreak?.start && !lastBreak?.end);

  return (
    <div className="container-page">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left – Today */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today</h2>
            <div className="text-sm opacity-70">{todayISO()}</div>
          </div>

          {todayRec?.clockIn ? (
            <div className="mt-3 space-y-2">
              <div><b>Clock In:</b> {toLocalTime(todayRec.clockIn)}</div>
              <div><b>Clock Out:</b> {toLocalTime(todayRec.clockOut)}</div>
              <div><b>Live total:</b> {fmtMin(liveMin)}</div>
              <div><b>Regular:</b> {fmtMin(todayRec.regularMinutes || 0)}</div>
              <div><b>Overtime:</b> {fmtMin(todayRec.overtimeMinutes || 0)}</div>
            </div>
          ) : (
            <div className="mt-3 text-slate-500">No active shift</div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              disabled={loading || hasActiveShift}
              onClick={()=>doAction('/api/attendance/clockin')}
            >
              Clock In
            </button>

            <button
              className="btn btn-secondary"
              disabled={loading || !hasActiveShift || hasActiveBreak}
              onClick={()=>doAction('/api/attendance/break/start')}
            >
              Start Break
            </button>

            <button
              className="btn btn-secondary"
              disabled={loading || !hasActiveShift || !hasActiveBreak}
              onClick={()=>doAction('/api/attendance/break/end')}
            >
              End Break
            </button>

            <button
              className="btn btn-secondary"
              disabled={loading || !hasActiveShift}
              onClick={()=>doAction('/api/attendance/clockout')}
            >
              Clock Out
            </button>
          </div>

          <div className="mt-4">
            <div className="font-semibold">Breaks:</div>
            <div className="text-sm">
              {(todayRec?.breaks||[]).length === 0 ? '—' : (todayRec.breaks.map((b,i)=>(
                <div key={i}>
                  {toLocalTime(b.start)} → {b.end ? toLocalTime(b.end) : '—'}
                </div>
              )))}
            </div>
          </div>

          <div className="mt-4">
            <div className="font-semibold mb-1">Notes:</div>
            <NoteEditor record={todayRec} onSaved={async()=>{ await loadTodayRecord(); await loadReport(); }} showToast={showToast} />
          </div>
        </div>

        {/* Right – Report */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Report by dates</h2>
            {canExport && (
              <div className="text-sm flex gap-3">
                <a className="underline cursor-pointer" onClick={exportCSV}>CSV</a>
                <a className="underline cursor-pointer" onClick={exportExcel}>Excel</a>
                <a className="underline cursor-pointer" onClick={exportPDF}>PDF</a>
              </div>
            )}
          </div>

          <div className="filters mt-3">
            <div className="row gap wrap">
              <label>From</label>
              <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
              <label>To</label>
              <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
              <select className="input" value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">— only me —</option>
                {canReadAll && users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
              <div className="row gap">
                <button className="chip" onClick={() => setPreset('today')}>Today</button>
                <button className="chip" onClick={() => setPreset('yesterday')}>Yesterday</button>
                <button className="chip" onClick={() => setPreset('week')}>This week</button>
                <button className="chip" onClick={() => setPreset('month')}>This month</button>
              </div>
            </div>
          </div>

          <div className="table-wrap mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Regular</th>
                  <th>Overtime</th>
                  <th>Total</th>
                  <th>Notes</th>
                  {canEdit && <th className="td-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={canEdit ? 8 : 7} className="py-4 px-3 text-slate-500">—</td></tr>
                ) : rows.map((r) => (
                  <ReportRow key={r._id} r={r} canEdit={canEdit} onSaved={loadReport} showToast={showToast} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="text-right font-semibold">Totals</td>
                  <td className="font-semibold">{fmtMin(totals.reg)}</td>
                  <td className="font-semibold">{fmtMin(totals.ot)}</td>
                  <td className="font-semibold">{fmtMin(totals.tot)}</td>
                  <td></td>
                  {canEdit && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={closeToast} />}
    </div>
  );
}

function NoteEditor({ record, onSaved, showToast }) {
  const [txt, setTxt] = useState(record?.notes || '');
  useEffect(() => { setTxt(record?.notes || ''); }, [record?._id]);
  async function save() {
    if (!record?._id) return;
    try {
      await api(`/api/attendance/${record._id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes: txt }) });
      onSaved?.(); showToast?.('success','Saved','Note saved');
    } catch (e) { showToast?.('error','Error', e?.message || 'Failed to save note'); }
  }
  return (
    <div className="space-y-2">
      <textarea className="textarea" rows={3} value={txt} onChange={e => setTxt(e.target.value)} />
      <button className="btn btn-primary" onClick={save}>Save note</button>
    </div>
  );
}

function ReportRow({ r, canEdit, onSaved, showToast }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    clockIn:  r.clockIn  ? new Date(r.clockIn).toISOString().slice(0,16)  : '',
    clockOut: r.clockOut ? new Date(r.clockOut).toISOString().slice(0,16) : '',
    notes: r.notes || ''
  });
  function onChange(e) {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  }
  async function save() {
    setBusy(true);
    try {
      const payload = {};
      if (form.clockIn  !== undefined) payload.clockIn  = form.clockIn  ? new Date(form.clockIn).toISOString()  : null;
      if (form.clockOut !== undefined) payload.clockOut = form.clockOut ? new Date(form.clockOut).toISOString() : null;
      if ('notes' in form) payload.notes = form.notes;
      await api(`/api/attendance/${r._id}`, { method:'PUT', body: JSON.stringify(payload) });
      setOpen(false); onSaved?.(); showToast?.('success','Saved','Record updated');
    } catch (e) {
      showToast?.('error','Error', e?.message || 'Failed to update');
    } finally { setBusy(false); }
  }
  return (
    <>
      <tr className="border-t">
        <td>{r.date}</td>
        <td>{r.clockIn  ? new Date(r.clockIn).toLocaleTimeString()  : '-'}</td>
        <td>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '-'}</td>
        <td>{fmtMin(r.regularMinutes || 0)}</td>
        <td>{fmtMin(r.overtimeMinutes || 0)}</td>
        <td>{fmtMin(r.totalMinutes || 0)}</td>
        <td className="whitespace-pre-line">
          {r.notes || ''}
          {r.lastEditedAt && (
            <div className="meta mt-1">
              Edited by <b>{r.lastEditedByName || 'Unknown'}</b> · {toLocalDateTime(r.lastEditedAt)}
            </div>
          )}
        </td>
        {canEdit && (
          <td className="td-right">
            <button className="btn btn-secondary" onClick={() => setOpen(true)}>Edit</button>
          </td>
        )}
      </tr>

      <Modal
        open={open}
        onClose={()=>setOpen(false)}
        title={`Edit ${r.date}`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Clock In</label>
            <input className="input" type="datetime-local" name="clockIn" value={form.clockIn} onChange={onChange}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Clock Out</label>
            <input className="input" type="datetime-local" name="clockOut" value={form.clockOut} onChange={onChange}/>
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Notes</label>
            <textarea className="textarea" rows={3} name="notes" value={form.notes} onChange={onChange}/>
          </div>
        </div>
      </Modal>
    </>
  );
}

function useLiveMinutes(rec) {
  const [min, setMin] = useState(0);
  useEffect(() => {
    if (!rec?.clockIn) { setMin(0); return; }
    function calc() {
      const now = Date.now();
      const start = new Date(rec.clockIn).getTime();
      let workingMs = now - start;
      const breaks = rec.breaks || [];
      for (const b of breaks) {
        const s = b.start ? new Date(b.start).getTime() : null;
        const e = b.end ? new Date(b.end).getTime() : null;
        if (s) workingMs -= Math.max(0, (e || now) - s);
      }
      setMin(Math.max(0, Math.floor(workingMs / 60000)));
    }
    calc(); const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [rec?.clockIn, JSON.stringify(rec?.breaks || [])]);
  return min;
}
