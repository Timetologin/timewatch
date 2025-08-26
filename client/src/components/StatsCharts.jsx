// client/src/components/StatsCharts.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { api } from '../api';
import Spinner from './Spinner';
import toast from 'react-hot-toast';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function monthISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
  return x.slice(0,7); // YYYY-MM
}

export default function StatsCharts() {
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(monthISO());
  const [data, setData] = useState(null);

  async function fetchStats(m) {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/stats?month=${m}`);
      setData(res.data);
    } catch (e) {
      toast.error('Failed to load stats');
      console.error(e);
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
        <input type="month" className="input" style={{ width:180 }}
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
      </div>

      {loading && <Spinner label="Loading charts..." />}
      {!loading && data && (
        <div className="grid-2">
          <div className="card">
            <h4 style={{ marginTop:0 }}>Minutes per day</h4>
            {dayBar ? <Bar data={dayBar} /> : <div className="muted">No data</div>}
          </div>
          <div className="card">
            <h4 style={{ marginTop:0 }}>Minutes by user</h4>
            {userPie ? <Doughnut data={userPie} /> : <div className="muted">No data</div>}
          </div>
        </div>
      )}
    </div>
  );
}
