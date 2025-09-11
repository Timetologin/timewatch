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

/* ערכת נושא Sky/Mint PRO – רקע דינמי (בלובים, beams, גריין) ללא שינוי לוגיקה */
(function injectTheme() {
  const css = `
  :root{
    /* בסיס צבעוני */
    --bg: #eaf9ff;           /* תכלת פסטלי בסיסי */
    --text: #0b1324;
    --text-muted:#5b6b86;
    --border: rgba(6,26,46,.12);

    /* פלטת Sky/Mint */
    --primary-1:#06b6d4;   /* cyan */
    --primary-2:#14b8a6;   /* teal */
    --primary-3:#22d3ee;   /* sky */
    --accent:#2dd4bf;      /* mint */

    /* משטחים */
    --surface:#ffffff;
    --surface-2:#f0f7fb;
    --surface-glass: rgba(255,255,255,.82);
    --navbar-bg: rgba(255,255,255,.88);

    /* אפקטים */
    --ring: rgba(34,211,238,.45);
    --shadow: 0 10px 24px rgba(6,26,46,.08);
    --shadow-lg: 0 18px 34px rgba(6,26,46,.12);
    --radius:12px;
    --radius-lg:16px;

    /* בקרים לאנימציות (רק CSS) */
    --anim-speed-1: 36s;
    --anim-speed-2: 52s;
    --anim-speed-3: 75s;
  }

  /* לא ניתן לדרוס את הרקע: שכבות קבועות מאחור */
  html, body, #root { height: 100%; background: transparent !important; }
  #root { isolation: isolate; position: relative; }

  /* שכבת בסיס – גרדיאנט תכלת→מנטה + “דיו” בשוליים */
  #root::before{
    content:"";
    position: fixed;
    inset: 0;
    z-index: -3;
    pointer-events: none;
    background:
      linear-gradient(180deg, #e8fbff 0%, #ecfff8 38%, var(--bg) 100%);
    box-shadow:
      inset 0 260px 320px -240px rgba(56,189,248,.28),
      inset 0 -260px 320px -240px rgba(45,212,191,.24);
    background-attachment: fixed;
  }

  /* בלובים – שכבה חיה עם פרלאקס (GPU-friendly) */
  #root::after{
    content:"";
    position: fixed;
    inset: -12%;
    z-index: -2;
    pointer-events: none;
    background:
      radial-gradient(28% 30% at 15% 22%, rgba(56,189,248,.34), transparent 60%),
      radial-gradient(26% 28% at 85% 16%, rgba(45,212,191,.30), transparent 60%),
      radial-gradient(24% 26% at 74% 82%, rgba(125,211,252,.26), transparent 60%),
      radial-gradient(22% 24% at 22% 84%, rgba(94,234,212,.24), transparent 60%);
    filter: blur(52px) saturate(1.06);
    animation: float-a var(--anim-speed-1) ease-in-out infinite alternate;
    will-change: transform;
  }

  /* beams (קרני גרדיאנט) – שכבה נוספת, איטית ואלגנטית */
  body::before{
    content:"";
    position: fixed;
    inset: -20%;
    z-index: -2;
    pointer-events: none;
    background:
      conic-gradient(from 210deg at 60% 40%, rgba(34,211,238,.12), transparent 35%),
      conic-gradient(from 30deg  at 30% 70%, rgba(45,212,191,.12), transparent 40%);
    filter: blur(30px);
    animation: float-b var(--anim-speed-2) linear infinite;
    will-change: transform;
  }

  /* שכבת גריין עדינה מאוד – עומק פרימיום */
  body::after{
    content:"";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events:none;
    opacity:.06;
    mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml;utf8,\
      <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>\
        <filter id='n'>\
          <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>\
          <feColorMatrix type='saturate' values='0'/>\
        </filter>\
        <rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/>\
      </svg>");
    background-size: 260px 260px;
    animation: grain var(--anim-speed-3) steps(10) infinite;
  }

  /* אנימציות */
  @keyframes float-a {
    0%   { transform: translate3d(0,0,0)   rotate(0deg)   scale(1);    }
    40%  { transform: translate3d(1.8%, -1.2%, 0) rotate(5deg)  scale(1.02); }
    100% { transform: translate3d(-1.8%, 1.2%, 0) rotate(-6deg) scale(1.015); }
  }
  @keyframes float-b {
    0%   { transform: translate3d(0,0,0) rotate(0deg)   scale(1.05); }
    100% { transform: translate3d(0,0,0) rotate(360deg) scale(1.05); }
  }
  @keyframes grain {
    0% { transform: translate3d(0,0,0); }
    100% { transform: translate3d(-10%, 10%, 0); }
  }

  /* נגישות: להפחית תנועה למי שמעדיף */
  @media (prefers-reduced-motion: reduce){
    #root::after, body::before, body::after { animation: none !important; }
  }

  /* מבנה/כרטיסים/טפסים/כפתורים – כמו קודם, רק מלוטש יותר */
  .container{ max-width:1200px; margin:0 auto; padding:24px; }

  .card{
    background: var(--surface-glass);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    backdrop-filter: saturate(140%) blur(6px);
  }

  .h2{ margin:0; font-size:1.35rem; }
  .muted{ color: var(--text-muted); }

  .link{
    color:#2c3e57; text-decoration:none;
    padding:6px 10px; border-radius:10px;
    transition: background .15s ease, color .15s ease, box-shadow .15s ease;
  }
  .link:hover{ background: rgba(56,189,248,.12); color:#0b1324; }
  .link.active{ background: rgba(45,212,191,.18); color:#0b1324; box-shadow:0 0 0 2px rgba(34,211,238,.25) inset; }

  .btn{
    appearance:none; border:0; cursor:pointer; user-select:none;
    border-radius: var(--radius);
    padding: 10px 14px; font-weight:800; letter-spacing:.2px; color:#01202b;
    background-image: linear-gradient(135deg, #a7f3d0, #67e8f9 45%, #22d3ee 85%);
    box-shadow: 0 12px 26px rgba(34,211,238,.28), inset 0 0 0 1px rgba(255,255,255,.32);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .btn:hover{
    transform: translateY(-1.5px);
    filter: saturate(1.08);
    box-shadow: 0 16px 30px rgba(34,211,238,.34), inset 0 0 0 1px rgba(255,255,255,.36);
  }
  .btn:focus-visible{ outline: none; box-shadow: 0 0 0 3px var(--ring); }

  .btn-ghost{
    background: rgba(255,255,255,.94);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 8px 12px;
    transition: background .15s ease, box-shadow .15s ease, transform .1s ease;
  }
  .btn-ghost:hover{ background: rgba(255,255,255,.98); box-shadow: 0 6px 16px rgba(6,26,46,.08); }
  .btn-ghost:focus-visible{ outline:none; box-shadow: 0 0 0 3px var(--ring); }

  .input, input[type="text"], input[type="email"], input[type="password"], select, textarea{
    width:100%; border-radius: var(--radius); border:1px solid var(--border);
    padding:10px 12px; background:#fff; color:var(--text);
    transition: box-shadow .15s ease, border-color .15s ease;
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

  @media (max-width: 480px){
    .container{ padding-left:12px; padding-right:12px; }
    .card{ padding:12px; }
    .h2{ font-size:1.22rem; }
    .btn, .btn-ghost{ padding:8px 10px; }
    img{ max-width:100%; height:auto; }
  }
  `;
  const style = document.createElement('style');
  style.id = 'sky-mint-pro-theme';
  style.innerHTML = css;
  document.head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
