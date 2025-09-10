// client/src/pages/Presence.js
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

// פורמט 00:00:00
function fmtHMS(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function Presence() {
  const [rows, setRows] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [tick, setTick] = useState(0);            // טיימר ללייב (כל שנייה)
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/attendance/presence', {
        params: { activeOnly: activeOnly ? 1 : 0 },
      });
      setRows(data?.rows || []);
      setFetchedAt(Date.now());
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load presence');
    } finally {
      setLoading(false);
    }
  };

  // פולינג מהשרת כל 10 שניות
  useEffect(() => {
    load();
    const poll = setInterval(load, 10000);
    return () => clearInterval(poll);
  }, [activeOnly]);

  // טיימר מקומי – מתקתק כל שנייה לצורך ההצגה החיה
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // מחשב זמן "חי": הערך מהשרת + כמה שניות עברו מאז הטעינה האחרונה
  const visible = useMemo(() => {
    const deltaSec = Math.floor((Date.now() - fetchedAt) / 1000);
    return rows.map((r) => ({
      ...r,
      liveElapsed: r.active ? (r.elapsedSeconds || 0) + Math.max(0, deltaSec) : (r.elapsedSeconds || 0),
    }));
    // תלוי ב-tick כדי לרנדר כל שנייה (גם אם rows לא השתנו)
  }, [rows, fetchedAt, tick]);

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 className="h2" style={{ marginRight: 'auto' }}>Live presence</h2>
        <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>
      <div className="muted">Who is currently clocked in, with live timers.</div>

      {loading && <div className="muted" style={{ marginTop: 8 }}>Loading…</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 12,
        }}
      >
        {visible.map((r) => {
          const sinceStr = r.since ? new Date(r.since).toLocaleTimeString() : '—';
          return (
            <div
              key={r.user.id}
              className="card"
              style={{
                padding: 14,
                borderLeft: `4px solid ${r.active ? '#16a34a' : '#ef4444'}`,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {r.user.name || r.user.email || `User ${r.user.id.slice(-4)}`}
              </div>
              {r.user.email && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.user.email}
                </div>
              )}

              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="badge"
                  style={{
                    background: r.active ? '#dcfce7' : '#fee2e2',
                    color: r.active ? '#14532d' : '#7f1d1d',
                  }}
                >
                  {r.active ? 'IN' : 'OUT'}
                </span>
                {r.onBreak && (
                  <span
                    className="badge"
                    style={{ background: '#fef9c3', color: '#713f12' }}
                  >
                    On break
                  </span>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 13 }}>
                <div>Since: {r.active ? sinceStr : '—'}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  Elapsed: {fmtHMS(r.liveElapsed)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && !loading && (
        <div className="muted" style={{ marginTop: 12 }}>No data to show.</div>
      )}
    </div>
  );
}
