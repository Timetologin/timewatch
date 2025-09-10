// client/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// מבטיח שיש meta viewport למובייל (אם חסר בקובץ ה-HTML)
(function ensureViewport() {
  const head = document.head;
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta');
    m.setAttribute('name', 'viewport');
    m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    head.appendChild(m);
  }
  // התאמות רספונסיביות עדינות לכל האתר (מקטין ריווחים/כפתורים במובייל)
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 480px) {
      .container { padding-left: 12px; padding-right: 12px; }
      .card { padding: 12px; }
      .h2 { font-size: 1.25rem; }
      .btn, .btn-ghost { padding: 8px 10px; }
      img { max-width: 100%; height: auto; }
    }
  `;
  head.appendChild(style);
})();

const root = createRoot(document.getElementById('root'));
root.render(<App />);
