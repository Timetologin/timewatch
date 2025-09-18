// client/src/index.js
import './lib/fetchAuth';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './lib/fetchAuth';

/* Viewport למובייל */
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

/* מצב ביצועים ידני + שמיעה לשינויים */
(function initPerfMode() {
  try {
    const KEY = 'perfMode';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saved = (localStorage.getItem(KEY) || '').toLowerCase();
    const isLite = reduced || saved === 'lite';
    document.documentElement.classList.toggle('perf-lite', isLite);
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) {
        document.documentElement.classList.toggle('perf-lite', (e.newValue || '').toLowerCase() === 'lite');
      }
    });
  } catch {}
})();

/* Pause אנימציות כשכרטיסייה מוסתרת (חוסך CPU) */
(function initVisibilityPause() {
  const onVis = () => {
    document.documentElement.classList.toggle('paused', document.hidden);
  };
  document.addEventListener('visibilitychange', onVis);
  onVis();
})();

/* Auto-Lite: מזהה FPS נמוך ומדליק perf-lite אוטומטי עד שהמצב משתפר */
(function startAutoPerfWatch() {
  let frames = 0, start = performance.now();
  let poor = 0, good = 0;
  function loop(t) {
    if (!document.hidden) frames++;
    const dt = t - start;
    if (dt >= 2000) { // דגימה כל ~2 שניות
      const fps = Math.round(frames * 1000 / dt);
      frames = 0; start = t;
      if (fps < 45) { poor++; good = 0; }
      else if (fps > 53) { good++; poor = 0; }

      const root = document.documentElement;
      if (poor >= 2) root.classList.add('perf-lite-auto');         // שתי דגימות חלשות רצוף
      else if (good >= 3) root.classList.remove('perf-lite-auto'); // שלוש חזקות רצוף – כבה
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* CSS גלובלי (שומר מראה, מוסיף בקרות blur/מצבים) */
(function injectTheme() {
  const css = `
  :root{
    --bg:#eaf9ff; --text:#0b1324; --text-muted:#5b6b86; --border:rgba(6,26,46,.12);
    --primary-1:#06b6d4; --primary-2:#14b8a6; --primary-3:#22d3ee; --accent:#2dd4bf;
    --surface:#fff; --surface-2:#f0f7fb; --surface-glass:rgba(255,255,255,.82); --navbar-bg:rgba(255,255,255,.88);
    --ring:rgba(34,211,238,.45); --shadow:0 10px 24px rgba(6,26,46,.08); --shadow-lg:0 18px 34px rgba(6,26,46,.12);
    --radius:12px; --radius-lg:16px;
    --anim-speed-1:36s; --anim-speed-2:52s; --anim-speed-3:75s;
    --toggle-bg:#fff; --toggle-fg:#0b1324;

    /* שליטה ע"י משתנה – מאפשר הורדת blur במצבי חיסכון */
    --blur: 8px;

    /* ברירות מחדל לניאון (שחור – ניתן לשינוי ע"י מחלקת style-...) */
    --neon-text:#111111;
    --neon-glow-1:rgba(0,0,0,.50);
    --neon-glow-2:rgba(0,0,0,.35);
    --neon-glow-3:rgba(0,0,0,.20);
  }
  :root[data-theme="dark"]{
    --bg:#0b1324; --text:#e6f7ff; --text-muted:#9bb2c9; --border:rgba(255,255,255,.08);
    --surface:#0f172a; --surface-2:#0b1224; --surface-glass:rgba(16,23,42,.72); --navbar-bg:rgba(10,16,30,.76);
    --ring:rgba(34,211,238,.35); --shadow:0 10px 24px rgba(0,0,0,.35); --shadow-lg:0 18px 34px rgba(0,0,0,.45);
    --toggle-bg:#111827; --toggle-fg:#e6f7ff;
  }

  html, body, #root { height:100%; background:transparent!important; color:var(--text); }
  #root { isolation:isolate; position:relative; }

  /* רקע מנטה/תכלת + בלובים */
  #root::before{
    content:""; position:fixed; inset:0; z-index:-2; pointer-events:none;
    background:linear-gradient(180deg,#e8fbff 0%,#ecfff8 38%,var(--bg) 100%);
    box-shadow:inset 0 240px 280px -220px rgba(56,189,248,.25), inset 0 -240px 280px -220px rgba(45,212,191,.22);
    background-attachment:fixed;
  }
  :root[data-theme="dark"] #root::before{
    background:
      radial-gradient(1200px 1200px at 10% -10%, rgba(34,211,238,.15), transparent 40%),
      radial-gradient(900px 900px at 110% 110%, rgba(45,212,191,.12), transparent 45%),
      linear-gradient(180deg,#0b1324,#0b1324);
    box-shadow:inset 0 260px 320px -240px rgba(56,189,248,.12), inset 0 -260px 320px -240px rgba(45,212,191,.10);
  }
  #root::after{
    content:""; position:fixed; inset:-10%; z-index:-1; pointer-events:none;
    background:
      radial-gradient(28% 30% at 15% 25%, rgba(56,189,248,.30), transparent 60%),
      radial-gradient(26% 28% at 82% 18%, rgba(45,212,191,.26), transparent 60%),
      radial-gradient(24% 26% at 75% 78%, rgba(125,211,252,.22), transparent 60%),
      radial-gradient(22% 24% at 24% 80%, rgba(94,234,212,.20), transparent 60%);
    filter:blur(50px) saturate(1.05);
    animation:float-a var(--anim-speed-1) ease-in-out infinite alternate;
  }
  body::before{
    content:""; position:fixed; inset:-20%; z-index:-2; pointer-events:none;
    background:
      conic-gradient(from 210deg at 60% 40%, rgba(34,211,238,.12), transparent 35%),
      conic-gradient(from 30deg  at 30% 70%, rgba(45,212,191,.12), transparent 40%);
    filter:blur(30px); animation:float-b var(--anim-speed-2) linear infinite;
  }
  body::after{
    content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.06; mix-blend-mode:soft-light;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>");
    background-size:260px 260px; animation:grain var(--anim-speed-3) steps(10) infinite;
  }

  /* ======== השעון הגדול ======== */
  .global-clock{
    position:fixed; right:18px; top:68px; z-index:1000;
    display:flex; align-items:center; gap:12px;
    padding:10px 14px; border-radius:999px;
    background:var(--surface-glass); border:1px solid var(--border);
    backdrop-filter:saturate(140%) blur(var(--blur));
    box-shadow:var(--shadow);

    /* ברירת מחדל לניאון שחור (ניתן להחלפה ע"י מחלקת style-...) */
    --neon-text:#111111; --neon-glow-1:rgba(0,0,0,.50); --neon-glow-2:rgba(0,0,0,.35); --neon-glow-3:rgba(0,0,0,.20);
  }
  .global-clock .controls{ display:flex; align-items:center; gap:8px; }
  .global-clock .dot{ width:8px; height:8px; border-radius:50%; background-image:radial-gradient(circle at 30% 30%, #a7f3d0, #22d3ee); box-shadow:0 0 0 2px rgba(34,211,238,.35); }
  .global-clock .time{ font-size:22px; font-weight:800; letter-spacing:.3px; }
  .global-clock .date{ font-size:12px; color:var(--text-muted); line-height:1.15; }
  .global-clock .tz, .global-clock .mode{
    appearance:none; border:1px solid var(--border);
    background:rgba(255,255,255,.70); color:var(--text);
    border-radius:999px; padding:6px 10px; font-size:12px; font-weight:700; outline:none;
  }
  :root[data-theme="dark"] .global-clock .tz,
  :root[data-theme="dark"] .global-clock .mode{
    background:rgba(16,23,42,.70); color:var(--text);
  }

  /* ✨ ניאון – לפי משתנים */
  .global-clock .neon{
    color:var(--neon-text);
    text-shadow:
      0 0 4px var(--neon-glow-1),
      0 0 8px var(--neon-glow-2),
      0 0 12px var(--neon-glow-3);
    font-family:'Orbitron', ui-monospace, monospace;
  }
  .global-clock .digit{ display:inline-block; min-width:14px; animation:flip .6s ease forwards; }

  /* פריסטים של סגנון */
  .global-clock.style-cyan{
    --neon-text:#e0faff; --neon-glow-1:#22d3ee; --neon-glow-2:#22d3ee; --neon-glow-3:#06b6d4;
  }
  .global-clock.style-plain .neon{ text-shadow:none!important; color:var(--text)!important; }

  /* כרטיסים ורכיבים */
  .card{ background:var(--surface-glass); border:1px solid var(--border); border-radius:var(--radius-lg);
         box-shadow:var(--shadow); backdrop-filter:saturate(140%) blur(var(--blur));
         transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
  .card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-lg); }
  .container{ max-width:1200px; margin:0 auto; padding:24px; }
  .h2{ margin:0; font-size:1.35rem; } .muted{ color:var(--text-muted); }

  /* מובייל – בר רוחבי */
  @media (max-width: 720px){
    .global-clock{
      left:10px; right:10px; top:66px; width:auto;
      border-radius:14px; padding:8px 10px; gap:10px; justify-content:space-between;
    }
    .global-clock .time{ font-size:18px; }
    .global-clock .date{ font-size:11px; }
    .global-clock .tz, .global-clock .mode{ max-width:42vw; }
  }

  /* Reduced Motion + perf-lite + auto */
  @media (prefers-reduced-motion: reduce){
    #root::after, body::before, body::after{ animation:none!important; }
    .global-clock .digit{ animation:none!important; }
    :root{ --blur: 0px; }
  }
  .perf-lite, .perf-lite-auto { --blur: 0px; }
  .perf-lite body::before, .perf-lite body::after, .perf-lite #root::after,
  .perf-lite-auto body::before, .perf-lite-auto body::after, .perf-lite-auto #root::after { display:none!important; }
  .perf-lite .card, .perf-lite-auto .card { backdrop-filter:none!important; }
  .perf-lite .global-clock .digit, .perf-lite-auto .global-clock .digit { animation:none!important; }
  .perf-lite .global-clock .neon, .perf-lite-auto .global-clock .neon { text-shadow:none!important; color:var(--text)!important; }

  /* Pause כל האנימציות כשהטאב מוסתר */
  .paused * { animation-play-state: paused !important; }

  /* אנימציות */
  @keyframes float-a{ 0%{transform:translate3d(0,0,0) rotate(0) scale(1);} 40%{transform:translate3d(1.8%,-1.2%,0) rotate(5deg) scale(1.02);} 100%{transform:translate3d(-1.8%,1.2%,0) rotate(-6deg) scale(1.015);} }
  @keyframes float-b{ 0%{transform:translate3d(0,0,0) rotate(0) scale(1.05);} 100%{transform:translate3d(0,0,0) rotate(360deg) scale(1.05);} }
  @keyframes grain{ 0%{transform:translate3d(0,0,0);} 100%{transform:translate3d(-10%,10%,0);} }
  @keyframes flip{ 0%{ transform:rotateX(0); opacity:.6; } 50%{ transform:rotateX(90deg); opacity:0; } 100%{ transform:rotateX(0); opacity:1; } }
  `;
  const style = document.createElement('style');
  style.id = 'sky-mint-theme';
  style.innerHTML = css;
  document.head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
