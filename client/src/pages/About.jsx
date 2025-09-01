// client/src/pages/About.jsx
import React from 'react';

export default function About() {
  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="hero">
        <img src="/logo.png" alt="logo" className="hero-logo" />
        <h1 className="hero-title">Our Vision</h1>
        <p className="hero-subtitle">Time tracking that’s friendly, fast, and frustration-free.</p>
      </div>

      {/* שים לב לשינוי כאן: grid-auto */}
      <div className="grid-auto">
        <div className="card">
          <h3>Why we exist</h3>
          <p>
            We believe attendance shouldn’t feel like paperwork. It should be a tiny,
            delightful moment that gets out of your way  so teams can focus on real work.
          </p>
        </div>
        <div className="card">
          <h3>What we build</h3>
          <p>
            A clean, mobile-first timewatch that works with a single tap (QR / GPS),
            handles breaks smartly, and gives managers instant clarity  without nagging employees.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Our promise to employees</h3>
        <ul className="list">
          <li>Clock in/out in seconds  no forms, no friction.</li>
          <li>Full transparency: see your hours, breaks, and notes any time.</li>
          <li>Privacy by design: we only ask for location when required, and never more than needed.</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Our promise to managers</h3>
        <ul className="list">
          <li>Accurate, location-aware attendance with fair controls.</li>
          <li>Exportable reports (CSV/XLSX/PDF) and real-time dashboards.</li>
          <li>Simple permissions and an audit trail for edits.</li>
        </ul>
      </div>

      <div className="muted" style={{ marginTop: 24, textAlign: 'center' }}>
        © {new Date().getFullYear()} Josh GGman the mega brain made with care for teams who value time.
      </div>
    </div>
  );
}
