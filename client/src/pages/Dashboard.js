// client/src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import QuickActions from '../components/QuickActions';
import StatsCharts from '../components/StatsCharts';
import AttendanceTable from '../components/AttendanceTable';
import { api } from '../api';
import toast from 'react-hot-toast';
import BypassBanner from '../components/BypassBanner';

// פורמט לדקות -> "Hh Mm"
function fmt(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = Math.max(0, (mins || 0) % 60);
  return `${h}h ${m}m`;
}

// החזרת תאריך מקומי בפורמט YYYY-MM-DD
function dayISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return x.slice(0, 10);
}

// KPI מינימלי לשבוע אחרון
function KPIs() {
  const [kpi, setKpi] = useState({ today: 0, week: 0, month: 0, late: 0 });

  useEffect(() => {
    (async () => {
      try {
        const to = new Date();
        const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

        const { data } = await api.get('/attendance/list', {
          params: {
            from: dayISO(from),
            to: dayISO(to),
            page: 1,
            limit: 500,
          },
        });

        const rows = Array.isArray(data?.rows) ? data.rows : [];

        // דקות נטו (שעות פחות הפסקות)
        const minutes = (r) => {
          let m = 0;
          if (r.clockIn && r.clockOut) {
            m = Math.max(0, Math.round((new Date(r.clockOut) - new Date(r.clockIn)) / 60000));
          }
          (r.breaks || []).forEach((b) => {
            if (b.start && b.end) {
              m -= Math.max(0, Math.round((new Date(b.end) - new Date(b.start)) / 60000));
            }
          });
          return Math.max(0, m);
        };

        const totalWeek = rows.reduce((s, r) => s + minutes(r), 0);
        const todayTotal = rows
          .filter((r) => r.date === dayISO())
          .reduce((s, r) => s + minutes(r), 0);

        // כרגע Month = דוגמה (אותו ערך של שבוע); נרחיב בהמשך אם תרצה
        const monthTotal = totalWeek;

        const lateCount = rows.filter((r) => {
          if (!r.clockIn) return false;
          const t = new Date(r.clockIn);
          return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 15);
        }).length;

        setKpi({ today: todayTotal, week: totalWeek, month: monthTotal, late: lateCount });
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || 'Failed to load KPIs');
      }
    })();
  }, []);

  return (
    <div className="kpis" style={{ marginTop: 16 }}>
      <div className="kpi">
        <div className="label">Today</div>
        <div className="value">{fmt(kpi.today)}</div>
      </div>
      <div className="kpi">
        <div className="label">Last 7 days</div>
        <div className="value">{fmt(kpi.week)}</div>
      </div>
      <div className="kpi">
        <div className="label">Month (sample)</div>
        <div className="value">{fmt(kpi.month)}</div>
      </div>
      <div className="kpi">
        <div className="label">Late entries</div>
        <div className="value">{kpi.late}</div>
      </div>
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
