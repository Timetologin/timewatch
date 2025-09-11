// client/src/components/TimeBackground.jsx
import React from 'react';

export default function TimeBackground() {
  return (
    <div className="time-liquid" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%"  stopColor="#67e8f9"/>
            <stop offset="100%" stopColor="#34d399"/>
          </linearGradient>
        </defs>

        {/* בלוב נוזלי */}
        <path
          className="blob"
          d="M100 35c28 0 48 18 48 42s-10 27-10 38-8 21-38 21-58-16-58-46 30-55 58-55z"
          fill="url(#lg)"
          fillOpacity="0.35"
        />
        {/* מסגרת שעון */}
        <circle cx="100" cy="86" r="38" fill="none" stroke="url(#lg)" strokeWidth="3" opacity=".9"/>
        {/* מחוגים */}
        <line x1="100" y1="86" x2="100" y2="53" stroke="#06b6d4" strokeWidth="3" className="hand"/>
        <line x1="100" y1="86" x2="126" y2="86" stroke="#2dd4bf" strokeWidth="3" style={{opacity:.7}}/>
        {/* מרכז */}
        <circle cx="100" cy="86" r="3" fill="#22d3ee"/>
      </svg>
    </div>
  );
}
