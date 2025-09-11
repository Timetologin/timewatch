// client/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* Viewport למובייל (אם חסר) */
(function ensureViewport() {
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta');
    m.setAttribute('name', 'viewport');
    m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    document.head.appendChild(m);
  }
})();

/* ערכת נושא + רקע יוקרתי כ"שכבה מאחור" (בלתי ניתן לדריסה) */
(function injectTheme() {
  const css = `
  :root{
    --bg: #f8fafc;
    --text: #0f172a;
    --text-muted:#64748b;
    --border: rgba(2,6,23,.12);

    --primary-1:#0ea5e9;
    --primary-2:#6366f1;
    --primary-3:#8b5cf6;
    --accent:#f59e0b;

    --surface:#ffffff;
    --surface-2:#f1f5f9;
    --surface-glass: rgba(255,255,255,.82);
    --navbar-bg: rgba(255,255,255,.88);

    --ring: rgba(99,102,241,.40);
    --shadow: 0 10px 24px rgba(2,6,23,.08);
    --shadow-lg: 0 18px 34px rgba(2,6,23,.12);
    --radius:12px;
    --radius-lg:16px;
  }

  /* מבטלים רקע קיים ומכניסים את הגרדיאנט כ־pseudo-element קבוע */
  html, body, #root { height: 100%; background: transparent !important; }
  #root { isolation: isolate; position: relative; }

  /* הרקע בפועל – מאחורי הכל, גם כשיש גלילה */
  #root::before{
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(1100px 520px at -8% -12%, rgba(99,102,241,.12), transparent 60%),
      radial-gradient(900px 520px at 106% -10%, rgba(14,165,233,.12), transparent 60%),
      radial-gradient(900px 600px at 50% 118%, rgba(245,158,11,.10), transparent 60%),
      linear-gradient(180deg, #fbfcfe 0%, var(--bg) 100%);
    background-attachment: fixed, fixed, fixed, fixed;
  }

  /* בסיס */
  .container{ max-width:1200px; margin:0 auto; padding:24px; }
  .card{
    background: var(--surface-glass);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
  }
  .h2{ margin:0; font-size:1.35rem; }
  .muted{ color: var(--text-muted); }

  /* קישורים */
  .link{
    color:#334155; text-decoration:none;
    padding:6px 10px; border-radius:10px;
    transition: background .15s ease, color .15s ease, box-shadow .15s ease;
  }
  .link:hover{ background:#eef2ff; color:#0f172a; }
  .link.active{ background:#e0e7ff; color:#0f172a; box-shadow:0 0 0 2px rgba(99,102,241,.18) inset; }

  /* כפתורים */
  .btn{
    appearance:none; border:0; cursor:pointer; user-select:none;
    border-radius: var(--radius);
    padding: 10px 14px; font-weight:600; color:#fff;
    background-image: linear-gradient(135deg, var(--primary-1), var(--primary-2) 60%, var(--primary-3));
    box-shadow: 0 8px 20px rgba(99,102,241,.25), inset 0 0 0 1px rgba(255,255,255,.25);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .btn:hover{ transform: translateY(-1px); filter: saturate(1.08);
    box-shadow: 0 12px 26px rgba(99,102,241,.28), inset 0 0 0 1px rgba(255,255,255,.3);
  }
  .btn:focus-visible{ outline: none; box-shadow: 0 0 0 3px var(--ring); }

  .btn-ghost{
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 8px 12px;
    transition: background .15s ease, box-shadow .15s ease, transform .1s ease;
  }
  .btn-ghost:hover{ background: var(--surface-2); box-shadow: 0 6px 16px rgba(2,6,23,.06); }
  .btn-ghost:focus-visible{ outline:none; box-shadow: 0 0 0 3px var(--ring); }

  /* טפסים */
  .input, input[type="text"], input[type="email"], input[type="password"], select, textarea{
    width:100%; border-radius: var(--radius); border:1px solid var(--border);
    padding:10px 12px; background:#fff; color:var(--text);
    transition: box-shadow .15s ease, border-color .15s ease;
  }
  .input:focus, input:focus, select:focus, textarea:focus{
    outline:none; border-color: transparent; box-shadow: 0 0 0 3px var(--ring);
  }

  /* טבלאות */
  table.table{ width:100%; border-collapse: collapse; }
  table.table th, table.table td{ padding:10px 12px; border-bottom:1px solid var(--border); }
  table.table thead th{ background:#eef2ff; color:#0f172a; text-align:left; }

  /* נב-בר */
  .navbar{
    background: var(--navbar-bg);
    backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid var(--border);
  }

  /* מובייל */
  @media (max-width: 480px){
    .container{ padding-left:12px; padding-right:12px; }
    .card{ padding:12px; }
    .h2{ font-size:1.22rem; }
    .btn, .btn-ghost{ padding:8px 10px; }
    img{ max-width:100%; height:auto; }
  }
  `;
  const style = document.createElement('style');
  style.id = 'luxury-theme';
  style.innerHTML = css;
  document.head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
