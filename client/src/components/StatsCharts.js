// client/src/components/StatsCharts.js
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function monthISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
  return x.slice(0,7); // YYYY-MM
}

export default function StatsCharts({ token, apiBase }) {
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(monthISO());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function fetchStats(m) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/attendance/stats?month=${m}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({message:'Failed'}));
        throw new Error(j.message || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setData(j);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(month); }, [month]);

  const dayBar = useMemo(() => {
    if (!data?.byDay) return null;
    const labels = Object.keys(data.byDay).sort();
    const minutes = labels.map(d => data.byDay[d]);
    return {
      labels,
      datasets: [{ label: 'Minutes worked', data: minutes }]
    };
  }, [data]);

  const userPie = useMemo(() => {
    if (!data?.byUser) return null;
    const labels = Object.values(data.byUser).map(u => u.name);
    const minutes = Object.values(data.byUser).map(u => u.minutes);
    return {
      labels,
      datasets: [{ label: 'Minutes by user', data: minutes }]
    };
  }, [data]);

  return (
    <div className="card" style={{ padding:16, marginTop:16 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <h3 style={{ margin:0 }}>Monthly stats</h3>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding:'6px 8px' }}
        />
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color:'tomato' }}>{error}</div>}
      {!loading && !error && data && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card" style={{ padding:12 }}>
            <h4 style={{ marginTop:0 }}>Minutes per day</h4>
            {dayBar ? <Bar data={dayBar} /> : <div>No data</div>}
          </div>
          <div className="card" style={{ padding:12 }}>
            <h4 style={{ marginTop:0 }}>Minutes by user</h4>
            {userPie ? <Doughnut data={userPie} /> : <div>No data</div>}
          </div>
        </div>
      )}
    </div>
  );
}
