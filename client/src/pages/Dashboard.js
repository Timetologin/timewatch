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
function endOfLocalDay(dateStr) {
  return new Date(`${dateStr}T23:59:59.999`);
}
function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
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
    const dur = Math.max(0, Math.floor((end - start) / 1000));
    return sum + dur;
  }, 0);
}
function secondsOfRow(r, endRef) {
  const now = endRef instanceof Date ? endRef : new Date();

  if (Array.isArray(r.sessions) && r.sessions.length) {
    return r.sessions.reduce((sum, seg) => {
      if (!seg?.start) return sum;
      const start = new Date(seg.start);
      const end = seg.end ? new Date(seg.end) : now;
      const total = Math.max(0, Math.floor((end - start) / 1000));
      const bsum = secondsOfBreaks(seg.breaks || [], now);
      return sum + Math.max(0, total - bsum);
    }, 0);
  }

  let total = 0;
  if (r.clockIn) {
    const start = new Date(r.clockIn);
    const end = r.clockOut ? new Date(r.clockOut) : now;
    total = Math.max(0, Math.floor((end - start) / 1000));
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

/* ---------- KPIs (של המשתמש הנוכחי) ---------- */
function KPIs() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [late, setLate] = useState(0);

  const [liveTick, setLiveTick] = useState(0);
  const [liveByPresence, setLiveByPresence] = useState(false);
  const [presenceDenied, setPresenceDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        setMe(data || null);
      } catch {
        toast.error('Failed to load profile');
      }
    })();
  }, []);

  const loadList = async (myId) => {
    try {
      const to = new Date();
      const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

      const { data } = await api.get('/attendance/list', {
        params: {
          from: dayISO(from),
          to: dayISO(to),
          page: 1,
          limit: 500,
          user: myId,
        },
      });

      const myRowsRaw = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
          ? data.data
          : [];

      const myRows = myRowsRaw.filter((r) => {
        const uid = (r.user && (r.user._id || r.user.id || r.user)) || r.userId;
        return String(uid) === String(myId);
      });

      const lateCount = myRows.filter((r) => {
        let firstIn = null;
        if (Array.isArray(r.sessions) && r.sessions.length) {
          const withStart = r.sessions.filter((s) => s.start);
          if (withStart.length) firstIn = new Date(withStart[0].start);
        } else if (r.clockIn) {
          firstIn = new Date(r.clockIn);
        }
        if (!firstIn) return false;
        return firstIn.getHours() > 9 || (firstIn.getHours() === 9 && firstIn.getMinutes() > 15);
      }).length;

      setRows(myRows);
      setLate(lateCount);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load KPIs');
    }
  };

  const checkPresence = async (myId) => {
    if (presenceDenied || !myId) return;
    try {
      const { data } = await api.get('/attendance/presence', { params: { activeOnly: 1 } });
      const mine = Array.isArray(data?.rows)
        ? data.rows.some((r) => String(r?.user?.id) === String(myId))
        : false;
      setLiveByPresence(Boolean(mine));
    } catch (e) {
      if (e?.response?.status === 403) setPresenceDenied(true);
    }
  };

  useEffect(() => {
    if (!me?._id && !me?.id) return;
    const myId = me._id || me.id;
    loadList(myId);
    checkPresence(myId);

    const onChanged = () => { loadList(myId); checkPresence(myId); };
    window.addEventListener('attendance-changed', onChanged);
    return () => window.removeEventListener('attendance-changed', onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?._id, me?.id]);

  const liveByTodayRow = useMemo(() => {
    const todayKey = dayISO(new Date());
    return rows.some((r) => r.date === todayKey && rowHasActiveSession(r));
  }, [rows]);

  const live = presenceDenied ? liveByTodayRow : liveByPresence;

  useEffect(() => {
    if (!live) return;
    let t;
    const schedule = () => {
      const now = Date.now();
      const delay = 1000 - (now % 1000) + 5;
      t = window.setTimeout(() => { setLiveTick((x) => x + 1); schedule(); }, delay);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [live]);

  const { todaySec, weekSec, monthSec } = useMemo(() => {
    const now = new Date();
    const todayKey = dayISO(now);
    let today = 0, week = 0;

    for (const r of rows) {
      const endForRow = (r.date === todayKey) ? now : endOfLocalDay(r.date);
      const s = secondsOfRow(r, endForRow);
      week += s;
      if (r.date === todayKey) today += s;
    }
    const month = week;
    return { todaySec: today, weekSec: week, monthSec: month };
  }, [rows, live ? liveTick : 0]);

  return (
    <div className="grid">
      <div className="span-12 card reveal" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 className="h2">Dashboard</h2>
          <div className="muted">Overview of attendance and productivity</div>
        </div>
      </div>

      <div className="span-12 card reveal" style={{ padding: 16 }}>
        <BypassBanner />
      </div>

      <div className="span-12 card reveal" style={{ padding: 16 }}>
        <QuickActions />
      </div>

      {/* KPIs + Charts */}
      <div className="span-4 card reveal" style={{ padding: 16 }}>
        <div className="kpis">
          <div className="kpi">
            <div className="label">Today {live ? '• live' : ''}</div>
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
      </div>

      <div className="span-8 card reveal" style={{ padding: 8 }}>
        <StatsCharts />
      </div>

      <div className="span-12 card reveal" style={{ padding: 8 }}>
        <AttendanceTable />
      </div>
    </div>
  );
}

/* הופעת reveal אוטומטית לאחר mount (למנוע קפיצה) */
useEffect(() => {
  const nodes = document.querySelectorAll('.reveal');
  let i = 0;
  for (const el of nodes) {
    const delay = 40 * i++;
    setTimeout(() => el.classList.add('show'), delay);
  }
}, []);
