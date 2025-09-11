// client/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* מוסיף meta viewport אם חסר (למובייל) */
(function ensureViewport() {
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta');
    m.setAttribute('name', 'viewport');
    m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    document.head.appendChild(m);
  }
})();

/* ערכת נושא Sky/Mint עם רקע “חי” ועדין (ללא שינוי לוגיקה) */
(function injectTheme() {
  const css = `
  :root{
    /* בסיס */
    --bg: #eefbff;         /* תכלת פסטלי */
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
  }

  /* מאפס רקעים ומכין שכבת “קנבס” מאחור שאי אפשר לדרוס */
  html, body, #root { height: 100%; background: transparent !important; }
  #root { isolation: isolate; position: relative; }

  /* שכבת בסיס: גרדיאנט פסטלי (תכלת/מנטה) – יציב */
  #root::before{
    content:"";
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background:
      linear-gradient(180deg, #eafaff 0%, #ecfff8 40%, var(--bg) 100%);
    /* “דיו” צבעוני מאוד עדין בשוליים */
    box-shadow:
      inset 0 240px 280px -220px rgba(56,189,248,.25),
      inset 0 -240px 280px -220px rgba(45,212,191,.22);
    background-attachment: fixed;
  }

  /* שכבה חיה: “בלובים” מטושטשים בתנועה איטית (עדין מאוד) */
  #root::after{
    content:"";
    position: fixed;
    inset: -10%;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(28% 30% at 15% 25%, rgba(56,189,248,.30), transparent 60%),
      radial-gradient(26% 28% at 82% 18%, rgba(45,212,191,.26), transparent 60%),
      radial-gradient(24% 26% at 75% 78%, rgba(125,211,252,.22), transparent 60%),
      radial-gradient(22% 24% at 24% 80%, rgba(94,234,212,.20), transparent 60%);
    filter: blur(50px) saturate(1.05);
    animation: float-bg 36s ease-in-out infinite alternate;
  }
  @keyframes float-bg {
    0%   { transform: translate3d(0,0,0) rotate(0.0deg) scale(1); }
    50%  { transform: translate3d(1.5%, -1.0%, 0) rotate(6deg) scale(1.02); }
    100% { transform: translate3d(-1.5%, 1.0%, 0) rotate(-6deg) scale(1.01); }
  }

  /* קונטיינר/כרטיסים */
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

  /* קישורים */
  .link{
    color:#2c3e57; text-decoration:none;
    padding:6px 10px; border-radius:10px;
    transition: background .15s ease, color .15s ease, box-shadow .15s ease;
  }
  .link:hover{ background: rgba(56,189,248,.10); color:#0b1324; }
  .link.active{ background: rgba(45,212,191,.16); color:#0b1324; box-shadow:0 0 0 2px rgba(34,211,238,.25) inset; }

  /* כפתורים – גרדיאנט Sky/Mint “חי” */
  .btn{
    appearance:none; border:0; cursor:pointer; user-select:none;
    border-radius: var(--radius);
    padding: 10px 14px; font-weight:700; color:#01202b;
    background-image: linear-gradient(135deg, #a7f3d0, #67e8f9 45%, #22d3ee 80%);
    box-shadow: 0 10px 24px rgba(34,211,238,.25), inset 0 0 0 1px rgba(255,255,255,.28);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .btn:hover{
    transform: translateY(-1px);
    filter: saturate(1.06);
    box-shadow: 0 14px 28px rgba(34,211,238,.30), inset 0 0 0 1px rgba(255,255,255,.32);
  }
  .btn:active{ transform: translateY(0); }
  .btn:focus-visible{ outline: none; box-shadow: 0 0 0 3px var(--ring); }

  /* Ghost */
  .btn-ghost{
    background: rgba(255,255,255,.92);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 8px 12px;
    transition: background .15s ease, box-shadow .15s ease, transform .1s ease;
  }
  .btn-ghost:hover{ background: rgba(255,255,255,.98); box-shadow: 0 6px 16px rgba(6,26,46,.07); }
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
  table.table thead th{ background: rgba(56,189,248,.10); color:#0b1324; text-align:left; }

  /* Navbar – זכוכית עדינה */
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
  style.id = 'sky-mint-theme';
  style.innerHTML = css;
  document.head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
