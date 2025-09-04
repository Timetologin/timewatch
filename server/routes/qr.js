// server/routes/qr.js
const express = require('express');
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// ---- Helpers ----
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function readRadius() {
  const m = Number(process.env.OFFICE_RADIUS_M);
  if (Number.isFinite(m)) return m;
  const mm = Number(process.env.OFFICE_RADIUS_METERS);
  if (Number.isFinite(mm)) return mm;
  return 150;
}
const OFFICE = {
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || 0),
  radius: readRadius(),
};
const mustEnforce = () => String(process.env.ATTENDANCE_REQUIRE_OFFICE || '0') === '1';
const todayStr = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function pickGeo(body = {}) {
  const { lat, lng, accuracy, address } = body || {};
  const out = {};
  if (typeof lat === 'number') out.lat = lat;
  if (typeof lng === 'number') out.lng = lng;
  if (typeof accuracy === 'number') out.accuracy = accuracy;
  if (typeof address === 'string') out.address = address;
  return out;
}
function getActiveSession(doc) {
  if (!doc?.sessions?.length) return null;
  const last = doc.sessions[doc.sessions.length - 1];
  return (last && last.start && !last.end) ? last : null;
}

// ---- QR endpoints require auth ----
router.use(authenticate);

/**
 * POST /api/qr/clock
 * body: { mode: 'in'|'out'|'break-start'|'break-end', lat, lng, coords? }
 * תומך בריבוי משמרות ביום (sessions).
 */
router.post('/clock', async (req, res) => {
  try {
    const userId = req.user.id;
    const canBypass = !!req?.userDoc?.permissions?.attendanceBypassLocation;

    const { mode, lat, lng, coords } = req.body || {};
    const plat = Number(lat ?? coords?.lat);
    const plng = Number(lng ?? coords?.lng);

    if (!canBypass && mustEnforce()) {
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) {
        return res.status(400).json({ message: 'Location required' });
      }
      const dist = haversineMeters(plat, plng, OFFICE.lat, OFFICE.lng);
      if (dist > OFFICE.radius) {
        return res.status(403).json({ message: 'You are not at the office location' });
      }
    }

    const date = todayStr();
    let doc = await Attendance.findOne({ user: userId, date });
    if (!doc) {
      doc = new Attendance({ user: userId, date, sessions: [] });
    }

    const now = new Date();
    const meta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };
    const active = getActiveSession(doc);

    if (mode === 'in') {
      if (active) return res.status(400).json({ message: 'Already clocked in (session still open)' });
      // פותחים סשן חדש
      doc.sessions.push({ start: now, inMeta: meta, breaks: [] });
      // תאימות: משקף את הסשן הפעיל גם בשדות העליונים
      doc.clockIn = now;
      doc.clockOut = null;
      doc.breaks = [];
      doc.clockInMeta = meta;

      await doc.save();
      return res.json({ message: 'Clocked in', attendance: doc });
    }

    if (mode === 'out') {
      if (!active) return res.status(400).json({ message: 'No open session to clock out' });
      active.end = now;
      active.outMeta = meta;
      // תאימות
      doc.clockOut = now;
      doc.clockOutMeta = meta;

      await doc.save();
      return res.json({ message: 'Clocked out', attendance: doc });
    }

    if (mode === 'break-start') {
      if (!active) return res.status(400).json({ message: 'Must clock in before starting a break' });
      const lastBreak = active.breaks[active.breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        return res.status(400).json({ message: 'A break is already in progress' });
      }
      active.breaks.push({ start: now });
      // תאימות
      doc.breaks = active.breaks;

      await doc.save();
      return res.json({ message: 'Break started', attendance: doc });
    }

    if (mode === 'break-end') {
      if (!active) return res.status(400).json({ message: 'Must clock in before ending a break' });
      const lastBreak = active.breaks[active.breaks.length - 1];
      if (!lastBreak || lastBreak.end) {
        return res.status(400).json({ message: 'No break in progress' });
      }
      lastBreak.end = now;
      // תאימות
      doc.breaks = active.breaks;

      await doc.save();
      return res.json({ message: 'Break ended', attendance: doc });
    }

    return res.status(400).json({ message: 'Unknown mode' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'QR clock failed' });
  }
});

module.exports = router;
