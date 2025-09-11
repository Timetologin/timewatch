// client/src/components/GlobalClock.jsx
import React, { useEffect, useState } from 'react';

function formatNow() {
  const now = new Date();
  const time = now.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const date = now.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return { time, date };
}

export default function GlobalClock() {
  const [{ time, date }, setNow] = useState(formatNow());

  useEffect(() => {
    const tick = () => setNow(formatNow());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="global-clock" role="status" aria-live="polite">
      <div className="dot" />
      <div>
        <div className="time neon">
          {time.split('').map((char, i) => (
            <span key={i} className="digit">{char}</span>
          ))}
        </div>
        <div className="date">{date}</div>
      </div>
    </div>
  );
}
