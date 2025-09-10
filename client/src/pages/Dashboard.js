// client/src/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import QuickActions from '../components/QuickActions';
import StatsCharts from '../components/StatsCharts';
import AttendanceTable from '../components/AttendanceTable';
import { api } from '../api';
import toast from 'react-hot-toast';
import BypassBanner from '../components/BypassBanner';

/* ---------- Helpers ---------- */
function dayISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}
function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}
function secondsOfBreaks(breaks = [], now = new Date()) {
  return (breaks || []).reduce((sum, b) => {
    if (!b.start) return sum;
    const start = new Date(b.start);
    const end = b.end ? new Date(b.end) : now;
    const dur = Math.max(0, Math.round((end - start) / 1000));
    return sum + dur;
  }, 0);
}
function secondsOfRow(r, now = new Date()) {
  // סכימת זמן עבודה נטו בשורה (תומך sessions ולגאסי)
  if (Array.isArray(r.sessions) && r.sessions.length) {
    return r.sessions.reduce((sum, seg) => {
      if (!seg?.start) return sum;
      const start = new Date(seg.start);
      const end = seg.end ? new Date(seg.end) : now;
      const total = Math.max(0, Math.round((end - start) / 1000));
      const bsum = secondsOfBreaks(seg.breaks || [], now);
      return sum + Math.max(0, total - bsum);
    }, 0);
  }
  let total = 0;
  if (r.clockIn) {
    const start = new Date(r.clockIn);
    const end = r.clockOut ? new Date(r.clockOut) : now;
    total = Math.max(0, Math.round((end - start) / 1000));
  }
  const bsum = secondsOfBreaks(r.breaks || [], now);
  return Math.max(0, total - bsum);
}
function rowHasActiveSession(r) {
  if (Array.isArray(r.sessions) && r.sessions.length) {
    const last = r.sessions[r.sessions.length - 1];
    return !!(last?.start && !last?.end);
  }
  return !!(r.clockIn && !r.clockOut);
}

/* ---------- KPIs (עם "לייב" רק כשהיום פעיל) ---------- */
function KPIs() {
  const [rows, setRows] = useState([]);
  const [late, setLate] = useState(0);
  const [liveTick, setLiveTick] = useState(0); // יתקתק רק כשהיום פעיל

  const load = async () => {
    try {
      const to = new Date();
      const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const { data } = await api.get('/attendance/list', {
        params: { from: dayISO(from), to: dayISO(to), page: 1, limit: 500 },
      });

      const arr = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // איחורים: כניסה ראשונה אחרי 09:15
      const lateCount = arr.filter((r) => {
        let firstIn = null;
        if (Array.isArray(r.sessions) && r.sessions.length) {
          const withStart = r.sessions.filter(s => s.start);
          if (withStart.length) firstIn = new Date(withStart[0].start);
        } else if (r.clockIn) {
          firstIn = new Date(r.clockIn);
        }
        if (!firstIn) return false;
        return firstIn.getHours() > 9 || (firstIn.getHours() === 9 && firstIn.getMinutes() > 15);
      }).length;

      setRows(arr);
      setLate(lateCount);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load KPIs');
    }
  };

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener('attendance-changed', onChanged);
    return () => window.removeEventListener('attendance-changed', onChanged);
  }, []);

  // מותר "לייב" רק אם יש סשן פעיל של היום
  const liveToday = useMemo(() => {
    const todayKey = dayISO(new Date());
    return rows.some((r) => r.date === todayKey && rowHasActiveSession(r));
  }, [rows]);

  // מפעיל טיימר רק כאשר liveToday = true
  useEffect(() => {
    if (!liveToday) return;
    const t = setInterval(() => setLiveTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [liveToday]);

  // חישוב הערכים; רנדר כל שנייה רק כאשר liveToday
  const { todaySec, weekSec, monthSec } = useMemo(() => {
    const now = new Date();
    const todayKey = dayISO(now);
    let today = 0, week = 0;

    for (const r of rows) {
      const s = secondsOfRow(r, now);
      week += s;
      if (r.date === todayKey) today += s;
    }
    const month = week; // "sample" (כמו שהיה)
    return { todaySec: today, weekSec: week, monthSec: month };
    // תלוי ב-liveTick רק כשיש היום פעיל
  }, [rows, liveToday ? liveTick : 0]);

  return (
    <div className="kpis" style={{ marginTop: 16 }}>
      <div className="kpi">
        <div className="label">Today {liveToday ? '• live' : ''}</div>
        <div className="value">{fmtHMS(todaySec)}</div>
      </div>
      <div className="kpi">
        <div className="label">Last 7 days</div>
        <div className="value">{fmtHMS(weekSec)}</div>
      </div>
      <div className="kpi">
        <div className="label">Month (sample)</div>
        <div className="value">{fmtHMS(monthSec)}</div>
      </div>
      <div className="kpi">
        <div className="label">Late entries</div>
        <div className="value">{late}</div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Dashboard() {
  return (
    <div className="container">
      <h2 className="h2">Dashboard</h2>
      <div className="muted">Overview of attendance and productivity</div>

      <BypassBanner />
      <QuickActions />
      <KPIs />
      <StatsCharts />
      <AttendanceTable />
    </div>
  );
}
