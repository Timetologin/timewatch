// client/src/components/GlobalClock.jsx
import React, { useEffect, useMemo, useState } from 'react';

/* רשימת אזורי זמן שימושיים */
const ZONES = [
  { id: 'Asia/Jerusalem', label: 'Israel', flag: '🇮🇱' },
  { id: 'UTC', label: 'UTC', flag: '🌐' },
  { id: 'Europe/London', label: 'London', flag: '🇬🇧' },
  { id: 'Europe/Paris', label: 'Paris', flag: '🇫🇷' },
  { id: 'Europe/Berlin', label: 'Berlin', flag: '🇩🇪' },
  { id: 'America/New_York', label: 'New York', flag: '🇺🇸' },
  { id: 'America/Los_Angeles', label: 'Los Angeles', flag: '🇺🇸' },
  { id: 'Asia/Dubai', label: 'Dubai', flag: '🇦🇪' },
  { id: 'Asia/Kolkata', label: 'Mumbai', flag: '🇮🇳' },
  { id: 'Asia/Shanghai', label: 'Shanghai', flag: '🇨🇳' },
  { id: 'Asia/Tokyo', label: 'Tokyo', flag: '🇯🇵' },
  { id: 'Australia/Sydney', label: 'Sydney', flag: '🇦🇺' },
  { id: 'America/Sao_Paulo', label: 'São Paulo', flag: '🇧🇷' },
];

function resolveInitialTz() {
  try {
    const saved = localStorage.getItem('clock.tz');
    if (saved) return saved;
    const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONES.some(z => z.id === sys) ? sys : 'Asia/Jerusalem';
  } catch {
    return 'Asia/Jerusalem';
  }
}

function formatNow(tz) {
  const now = new Date();
  const time = now.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: tz,
  });
  const date = now.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  });
  return { time, date };
}

export default function GlobalClock() {
  const [tz, setTz] = useState(resolveInitialTz);
  const [{ time, date }, setNow] = useState(() => formatNow(tz));

  useEffect(() => {
    // טיק כל שנייה
    const id = setInterval(() => setNow(formatNow(tz)), 1000);
    return () => clearInterval(id);
  }, [tz]);

  // שמירה ל-localStorage כשמשנים אזור זמן
  const onChangeTz = (e) => {
    const next = e.target.value;
    setTz(next);
    try { localStorage.setItem('clock.tz', next); } catch {}
  };

  return (
    <div className="global-clock" role="status" aria-live="polite">
      <div className="dot" />
      <select
        aria-label="בחר אזור זמן"
        className="tz"
        value={tz}
        onChange={onChangeTz}
      >
        {ZONES.map(z => (
          <option key={z.id} value={z.id}>
            {z.flag} {z.label}
          </option>
        ))}
      </select>

      <div>
        <div className="time neon">
          {time.split('').map((ch, i) => (
            <span key={i} className="digit">{ch}</span>
          ))}
        </div>
        <div className="date">{date}</div>
      </div>
    </div>
  );
}
