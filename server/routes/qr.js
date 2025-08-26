// server/routes/qr.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { withinRadiusMeters } = require('../utils/geo');
const Attendance = require('../models/Attendance');

// מיקום מרכזי מה-ENV (זהה ל-/locations)
const OFFICE = {
  id: 'main',
  name: process.env.OFFICE_NAME || 'Head Office',
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || process.env.OFFICE_LON || 0), // תמיכה גם ב-LON
  radiusMeters: Number(process.env.OFFICE_RADIUS_METERS || 150)
};

// כל הראוטים כאן דורשים התחברות
router.use(authenticate);

// POST /api/qr/clock
// body: { locationId:'main', mode:'in'|'out'|'break-start'|'break-end', coords:{lat,lng} }
router.post('/clock', async (req, res) => {
  try {
    const { locationId, mode, coords } = req.body || {};
    if (!locationId || !mode || !coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      return res.status(400).json({ message: 'Bad request' });
    }
    if (locationId !== OFFICE.id) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // אימות מיקום (אם ATTENDANCE_REQUIRE_OFFICE=1)
    const mustBeInside = String(process.env.ATTENDANCE_REQUIRE_OFFICE || '0') === '1';
    if (mustBeInside) {
      const inside = withinRadiusMeters(coords.lat, coords.lng, OFFICE.lat, OFFICE.lng, OFFICE.radiusMeters);
      if (!inside) return res.status(403).json({ message: 'You are not at the office location' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().slice(0,10);

    // CLOCK IN
    if (mode === 'in') {
      let doc = await Attendance.findOne({ user: userId, date: today });
      if (doc && doc.clockIn && !doc.clockOut) {
        return res.status(400).json({ message: 'Already clocked in' });
      }
      if (!doc) {
        doc = new Attendance({ user: userId, date: today });
      }
      doc.clockIn = new Date();
      doc.clockOut = undefined;
      doc.breaks = [];
      await doc.save();
      return res.json({ ok: true, action: 'clockin', attendanceId: doc._id });
    }

    // חיפוש משמרת פתוחה של היום
    const open = await Attendance.findOne({ user: userId, date: today, clockIn: { $ne: null }, clockOut: null });

    if (mode === 'out') {
      if (!open) return res.status(400).json({ message: 'No open shift' });
      const last = (open.breaks || [])[open.breaks.length - 1];
      if (last && last.start && !last.end) last.end = new Date();
      open.clockOut = new Date();
      await open.save();
      return res.json({ ok: true, action: 'clockout', attendanceId: open._id });
    }

    if (mode === 'break-start') {
      if (!open) return res.status(400).json({ message: 'No open shift' });
      const hasOpenBreak = (open.breaks || []).some(b => b.start && !b.end);
      if (hasOpenBreak) return res.status(400).json({ message: 'Break already started' });
      open.breaks = open.breaks || [];
      open.breaks.push({ start: new Date() });
      await open.save();
      return res.json({ ok: true, action: 'break-start', attendanceId: open._id });
    }

    if (mode === 'break-end') {
      if (!open) return res.status(400).json({ message: 'No open shift' });
      const last = (open.breaks || [])[open.breaks.length - 1];
      if (!last || !last.start || last.end) return res.status(400).json({ message: 'No open break' });
      last.end = new Date();
      await open.save();
      return res.json({ ok: true, action: 'break-end', attendanceId: open._id });
    }

    return res.status(400).json({ message: 'Unknown mode' });
  } catch (err) {
    console.error('QR CLOCK ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
