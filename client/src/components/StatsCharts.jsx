// client/src/components/StatsCharts.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

// עוזר
function dayISO(d) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}
function secondsOfBreaks(breaks = [], now = new Date()) {
  return breaks.reduce((sum, b) => {
    if (!b.start) return sum;
    const start = new Date(b.start);
    const end = b.end ? new Date(b.end) : now;
    const dur = Math.max(0, Math.round((end - start) / 1000));
    return sum + dur;
  }, 0);
}
function secondsOfRow(r, now = new Date()) {
  if (Array.isArray(r.sessions) && r.sessions.length) {
    return r.sessions.reduce((sum, seg) => {
      if (!seg.start) return sum;
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
function fmtHm(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function StatsCharts() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${y}-${m}`; // YYYY-MM
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // טען נתונים של כל החודש (מהיום הראשון עד האחרון)
  const load = async (monthStr = month) => {
    try {
      setLoading(true);
      const [y, m] = monthStr.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0); // היום האחרון של החודש

      const { data } = await api.get('/attendance/list', {
        params: {
          from: dayISO(first),
          to: dayISO(last),
          page: 1,
          limit: 1000,
        }
      });

      const arr = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setRows(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load monthly stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(month); }, [month]);

  const byDay = useMemo(() => {
    // מפה: YYYY-MM-DD -> שניות
    const map = new Map();
    const now = new Date();
    for (const r of rows) {
      const sec = secondsOfRow(r, now);
      map.set(r.date, (map.get(r.date) || 0) + sec);
    }
    // בונים וקטור לכל ימי החודש, גם אם 0
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const out = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ day: d, sec: map.get(key) || 0 });
    }
    return out;
  }, [rows, month]);

  const byUser = useMemo(() => {
    // אם יש קריאות עם משתמשים שונים (כשיש הרשאה לקרוא את כולם) – נציג התפלגות
    const map = new Map(); // userId -> {name, sec}
    const now = new Date();
    for (const r of rows) {
      const sec = secondsOfRow(r, now);
      const uid = (typeof r.user === 'object' && r.user?._id) || r.user || 'me';
      const name = (typeof r.user === 'object' && r.user?.name) || (uid === 'me' ? 'Me' : String(uid));
      const cur = map.get(uid) || { name, sec: 0 };
      cur.sec += sec;
      map.set(uid, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sec - a.sec);
  }, [rows]);

  const maxDay = Math.max(1, ...byDay.map(d => d.sec));
  const maxUser = Math.max(1, ...byUser.map(u => u.sec));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="muted">Monthly stats</div>
        <input
          type="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: 160 }}
        />
        {loading && <div className="muted">Loading…</div>}
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {/* Minutes per day */}
        <div className="card" style={{ padding: 12, minHeight: 180 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Minutes per day</div>
          {byDay.length === 0 ? (
            <div className="muted">No data</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 160 }}>
              {byDay.map((d) => (
                <div key={d.day} title={`${d.day}: ${fmtHm(d.sec)}`} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 8,
                      height: Math.round((d.sec / maxDay) * 140) + 6,
                      background: '#1e293b',
                      borderRadius: 4,
                      margin: '0 auto'
                    }}
                  />
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{d.day}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minutes by user (יופיע רק אם יש יותר ממשתמש אחד בנתונים) */}
        <div className="card" style={{ padding: 12, minHeight: 180 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Minutes by user</div>
          {byUser.length <= 1 ? (
            <div className="muted">No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {byUser.map((u) => (
                <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.name}
                  </div>
                  <div style={{ flex: 1, height: 10, background: '#e2e8f0', borderRadius: 999 }}>
                    <div
                      style={{
                        width: `${Math.max(5, Math.round((u.sec / maxUser) * 100))}%`,
                        height: '100%', borderRadius: 999, background: '#0f172a'
                      }}
                    />
                  </div>
                  <div style={{ width: 64, textAlign: 'right', fontSize: 12, color: '#334155' }}>
                    {fmtHm(u.sec)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
