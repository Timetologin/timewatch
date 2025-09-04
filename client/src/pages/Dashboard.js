// client/src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import QuickActions from '../components/QuickActions';
import StatsCharts from '../components/StatsCharts';
import AttendanceTable from '../components/AttendanceTable';
import { api } from '../api';
import toast from 'react-hot-toast';
import BypassBanner from '../components/BypassBanner';

function fmt(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = Math.max(0, (mins || 0) % 60);
  return `${h}h ${m}m`;
}
function dayISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return x.slice(0, 10);
}

// מחשב דקות מסמך נוכחות, עם תמיכה בסשנים מרובים + “חי” אם סשן פתוח
function minutesOfRow(r) {
  const sumBreaks = (breaks = []) =>
    breaks.reduce((s, b) => {
      if (!b.start) return s;
      const end = b.end ? new Date(b.end) : new Date();
      const start = new Date(b.start);
      return s + Math.max(0, Math.round((end - start) / 60000));
    }, 0);

  // אם קיימים סשנים – נסכם את כולם
  if (Array.isArray(r.sessions) && r.sessions.length) {
    return r.sessions.reduce((sum, seg) => {
      if (!seg.start) return sum;
      const end = seg.end ? new Date(seg.end) : new Date(); // פתוח = עד עכשיו
      const start = new Date(seg.start);
      const dur = Math.max(0, Math.round((end - start) / 60000));
      const bsum = sumBreaks(seg.breaks);
      return sum + Math.max(0, dur - bsum);
    }, 0);
  }

  // תאימות לאחור: משתמשים ב-clockIn/clockOut וב-breaks העליונים
  let m = 0;
  if (r.clockIn) {
    const end = r.clockOut ? new Date(r.clockOut) : new Date();
    const start = new Date(r.clockIn);
    m = Math.max(0, Math.round((end - start) / 60000));
  }
  const bsum = sumBreaks(r.breaks || []);
  return Math.max(0, m - bsum);
}

function KPIs() {
  const [kpi, setKpi] = useState({ today: 0, week: 0, month: 0, late: 0 });

  const load = async () => {
    try {
      const to = new Date();
      const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

      const { data } = await api.get('/attendance/list', {
        params: { from: dayISO(from), to: dayISO(to), page: 1, limit: 500 },
      });

      // תמיכה בשני פורמטים: {rows: [...]} או {data: [...]}
      const rows = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const totalWeek = rows.reduce((s, r) => s + minutesOfRow(r), 0);
      const todayTotal = rows
        .filter((r) => r.date === dayISO())
        .reduce((s, r) => s + minutesOfRow(r), 0);

      const monthTotal = totalWeek;

      const lateCount = rows.filter((r) => {
        // “מאוחר” = clockIn של הסשן הראשון היום > 09:15
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

      setKpi({ today: todayTotal, week: totalWeek, month: monthTotal, late: lateCount });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load KPIs');
    }
  };

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener('attendance-changed', onChanged);
    // ריענון “חי” כל דקה כדי להראות דקות זזות בזמן סשן פתוח
    const t = setInterval(load, 60 * 1000);
    return () => {
      window.removeEventListener('attendance-changed', onChanged);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="kpis" style={{ marginTop: 16 }}>
      <div className="kpi"><div className="label">Today</div><div className="value">{fmt(kpi.today)}</div></div>
      <div className="kpi"><div className="label">Last 7 days</div><div className="value">{fmt(kpi.week)}</div></div>
      <div className="kpi"><div className="label">Month (sample)</div><div className="value">{fmt(kpi.month)}</div></div>
      <div className="kpi"><div className="label">Late entries</div><div className="value">{kpi.late}</div></div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="container">
      <h2 className="h2">Dashboard</h2>
      <div className="muted">Overview of attendance and productivity</div>
      <BypassBanner />

      {/* פעולות מהירות */}
      <QuickActions />

      {/* KPI מעל הגרפים */}
      <KPIs />

      {/* גרפים חודשיים */}
      <StatsCharts />

      {/* טבלת נוכחות עם עימוד */}
      <AttendanceTable />
    </div>
  );
}
