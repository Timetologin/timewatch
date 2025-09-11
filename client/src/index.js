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

/* אתחול ערכת נושא */
(function initTheme() {
  try {
    const KEY = 'theme';
    const saved = localStorage.getItem(KEY);
    const sysPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (sysPrefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    if (!saved && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e => {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
      });
    }
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) document.documentElement.dataset.theme = e.newValue;
    });
  } catch {}
})();

/* אתחול מצב ביצועים: 'perfMode' = 'lite' כדי לכבות אפקטים כבדים */
(function initPerfMode() {
  try {
    const KEY = 'perfMode';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saved = (localStorage.getItem(KEY) || '').toLowerCase();
    const isLite = reduced || saved === 'lite';
    document.documentElement.classList.toggle('perf-lite', isLite);

    window.addEventListener('storage', (e) => {
      if (e.key === KEY) {
        const v = (e.newValue || '').toLowerCase();
        document.documentElement.classList.toggle('perf-lite', v === 'lite');
      }
    });
    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', e => {
        if (localStorage.getItem(KEY) !== 'lite') {
          document.documentElement.classList.toggle('perf-lite', e.matches);
        }
      });
    }
  } catch {}
})();

/* ערכת מנטה/תכלת – בלי שעון נוזל */
(function injectTheme() {
  const css = `
  :root{
    --bg: #eaf9ff;
    --text: #0b1324;
    --text-muted:#5b6b86;
    --border: rgba(6,26,46,.12);

    --primary-1:#06b6d4;
    --primary-2:#14b8a6;
    --primary-3:#22d3ee;
    --accent:#2dd4bf;

    --surface:#ffffff;
    --surface-2:#f0f7fb;
    --surface-glass: rgba(255,255,255,.82);
    --navbar-bg: rgba(255,255,255,.88);

    --ring: rgba(34,211,238,.45);
    --shadow: 0 10px 24px rgba(6,26,46,.08);
    --shadow-lg: 0 18px 34px rgba(6,26,46,.12);
    --radius:12px;
    --radius-lg:16px;

    --anim-speed-1: 36s;
    --anim-speed-2: 52s;
    --anim-speed-3: 75s;

    --toggle-bg: #ffffff;
    --toggle-fg: #0b1324;
  }
  :root[data-theme="dark"]{
    --bg: #0b1324;
    --text: #e6f7ff;
    --text-muted:#9bb2c9;
    --border: rgba(255,255,255,.08);

    --surface:#0f172a;
    --surface-2:#0b1224;
    --surface-glass: rgba(16,23,42,.72);
    --navbar-bg: rgba(10,16,30,.76);

    --ring: rgba(34,211,238,.35);
    --shadow: 0 10px 24px rgba(0,0,0,.35);
    --shadow-lg: 0 18px 34px rgba(0,0,0,.45);

    --toggle-bg: #111827;
    --toggle-fg: #e6f7ff;
  }

  html, body, #root { height: 100%; background: transparent !important; color: var(--text); }
  #root { isolation: isolate; position: relative; }

  /* שכבת בסיס: גרדיאנט פסטלי (תכלת/מנטה) */
  #root::before{
    content:"";
    position: fixed; inset: 0; z-index: -2; pointer-events: none;
    background: linear-gradient(180deg, #e8fbff 0%, #ecfff8 38%, var(--bg) 100%);
    box-shadow:
      inset 0 240px 280px -220px rgba(56,189,248,.25),
      inset 0 -240px 280px -220px rgba(45,212,191,.22);
    background-attachment: fixed;
  }
  :root[data-theme="dark"] #root::before{
    background:
      radial-gradient(1200px 1200px at 10% -10%, rgba(34,211,238,.15), transparent 40%),
      radial-gradient(900px 900px at 110% 110%, rgba(45,212,191,.12), transparent 45%),
      linear-gradient(180deg, #0b1324 0%, #0b1324 100%);
    box-shadow:
      inset 0 260px 320px -240px rgba(56,189,248,.12),
      inset 0 -260px 320px -240px rgba(45,212,191,.10);
  }

  /* בלובים עדינים בתנועה איטית */
  #root::after{
    content:"";
    position: fixed; inset: -10%; z-index: -1; pointer-events: none;
    background:
      radial-gradient(28% 30% at 15% 25%, rgba(56,189,248,.30), transparent 60%),
      radial-gradient(26% 28% at 82% 18%, rgba(45,212,191,.26), transparent 60%),
      radial-gradient(24% 26% at 75% 78%, rgba(125,211,252,.22), transparent 60%),
      radial-gradient(22% 24% at 24% 80%, rgba(94,234,212,.20), transparent 60%);
    filter: blur(50px) saturate(1.05);
    animation: float-a var(--anim-speed-1) ease-in-out infinite alternate;
  }

  /* beams + grain */
  body::before{
    content:""; position: fixed; inset: -20%; z-index: -2; pointer-events: none;
    background:
      conic-gradient(from 210deg at 60% 40%, rgba(34,211,238,.12), transparent 35%),
      conic-gradient(from 30deg  at 30% 70%, rgba(45,212,191,.12), transparent 40%);
    filter: blur(30px);
    animation: float-b var(--anim-speed-2) linear infinite;
  }
  body::after{
    content:""; position: fixed; inset: 0; z-index: -1; pointer-events:none;
    opacity:.06; mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>");
    background-size: 260px 260px;
    animation: grain var(--anim-speed-3) steps(10) infinite;
  }
  :root[data-theme="dark"] body::before{ filter: blur(40px) saturate(1.1) brightness(.8); }
  :root[data-theme="dark"] #root::after{ filter: blur(62px) saturate(1.1) brightness(.9); }

  /* שעון גדול צף (נשאר) */
  .global-clock {
    position: fixed; right: 18px; top: 68px; z-index: 40;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; border-radius: 999px;
    background: var(--surface-glass); border: 1px solid var(--border);
    backdrop-filter: saturate(140%) blur(8px); box-shadow: var(--shadow);
  }
  .global-clock .time { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
  .global-clock .date { font-size: 12px; color: var(--text-muted); line-height: 1.15; }
  .global-clock .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background-image: radial-gradient(circle at 30% 30%, #a7f3d0, #22d3ee);
    box-shadow: 0 0 0 2px rgba(34,211,238,.35);
  }

  /* ניאון + Flip לספרות */
  .global-clock .neon {
    color: #e0faff;
    text-shadow: 0 0 4px #22d3ee, 0 0 8px #22d3ee, 0 0 12px #06b6d4;
    font-family: 'Orbitron', ui-monospace, monospace;
  }
  .global-clock .digit { display: inline-block; min-width: 14px; animation: flip 0.6s ease forwards; }

  /* רכיבי UI בסיסיים */
  .container{ max-width:1200px; margin:0 auto; padding:24px; }
  .card{
    background: var(--surface-glass);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    backdrop-filter: saturate(140%) blur(6px);
    transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
  }
  .card:hover{ transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .h2{ margin:0; font-size:1.35rem; }
  .muted{ color: var(--text-muted); }
  .btn{
    appearance:none; border:0; cursor:pointer; user-select:none;
    border-radius: var(--radius); padding: 10px 14px; font-weight:800; letter-spacing:.2px; color:#01202b;
    background-image: linear-gradient(135deg, #a7f3d0, #67e8f9 45%, #22d3ee 85%);
    box-shadow: 0 12px 26px rgba(34,211,238,.28), inset 0 0 0 1px rgba(255,255,255,.32);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .btn:hover{
    transform: translateY(-1.5px) scale(1.01);
    filter: saturate(1.08);
    box-shadow: 0 16px 30px rgba(34,211,238,.34), inset 0 0 0 1px rgba(255,255,255,.36);
  }
  .btn:active{ transform: translateY(0) scale(.99); }
  .btn:focus-visible{ outline: none; box-shadow: 0 0 0 3px var(--ring); }

  .btn-ghost{
    background: rgba(255,255,255,.94);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 8px 12px;
    transition: background .15s ease, box-shadow .15s ease, transform .1s ease;
  }
  .btn-ghost:hover{ background: rgba(255,255,255,.98); box-shadow: 0 6px 16px rgba(6,26,46,.08); transform: translateY(-1px); }
  .btn-ghost:active{ transform: translateY(0); }
  .btn-ghost:focus-visible{ outline:none; box-shadow: 0 0 0 3px var(--ring); }

  .input, input[type="text"], input[type="email"], input[type="password"], select, textarea{
    width:100%; border-radius: var(--radius); border:1px solid var(--border);
    padding:10px 12px; background:#fff; color:var(--text);
    transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
  }
  .input:focus, input:focus, select:focus, textarea:focus{
    outline:none; border-color: transparent; box-shadow: 0 0 0 3px var(--ring);
  }

  table.table{ width:100%; border-collapse: collapse; }
  table.table th, table.table td{ padding:10px 12px; border-bottom:1px solid var(--border); }
  table.table thead th{ background: rgba(56,189,248,.10); color:#0b1324; text-align:left; }

  .navbar{
    background: var(--navbar-bg);
    backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid var(--border);
  }

  /* אנימציות כלליות */
  @keyframes float-a {
    0%   { transform: translate3d(0,0,0) rotate(0deg)   scale(1); }
    40%  { transform: translate3d(1.8%, -1.2%, 0) rotate(5deg)  scale(1.02); }
    100% { transform: translate3d(-1.8%, 1.2%, 0) rotate(-6deg) scale(1.015); }
  }
  @keyframes float-b { 0%{transform:translate3d(0,0,0) rotate(0) scale(1.05);} 100%{transform:translate3d(0,0,0) rotate(360deg) scale(1.05);} }
  @keyframes grain   { 0%{transform:translate3d(0,0,0);} 100%{transform:translate3d(-10%,10%,0);} }
  @keyframes flip    { 0%{ transform: rotateX(0deg); opacity:.6;} 50%{ transform: rotateX(90deg); opacity:0;} 100%{ transform: rotateX(0deg); opacity:1;} }

  /* רספונסיביות + חיסכון ביצועים */
  @media (prefers-reduced-motion: reduce) {
    #root::after, body::before, body::after { animation: none !important; }
    .global-clock .digit { animation: none !important; }
    .card { backdrop-filter: none !important; }
  }
  @media (max-width: 860px){
    body::before, body::after { display: none; }
    #root::after { animation: none; filter: blur(36px); }
    .global-clock { right: 10px; top: 66px; padding: 8px 10px; }
    .global-clock .time { font-size: 18px; }
  }

  .perf-lite body::before,
  .perf-lite body::after,
  .perf-lite #root::after { display: none !important; }
  .perf-lite .card { backdrop-filter: none !important; }
  .perf-lite .global-clock .digit { animation: none !important; }
  .perf-lite .global-clock .neon { text-shadow: none !important; color: var(--text) !important; }
  .perf-lite * { transition: none !important; }
  `;
  const style = document.createElement('style');
  style.id = 'sky-mint-theme';
  style.innerHTML = css;
  document.head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
