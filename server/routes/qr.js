// server/routes/qr.js
const express = require('express');
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

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

const OFFICE = {
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || 0),
  radius: Number(process.env.OFFICE_RADIUS_METERS || 150),
};

const mustEnforce = () => String(process.env.ATTENDANCE_REQUIRE_OFFICE || '0') === '1';

const todayStr = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// QR endpoints מוגנים ב-JWT כי העובד כבר מזוהה באפליקציה
router.use(authenticate);

/**
 * POST /api/qr/clock
 * body: { mode: 'in'|'out'|'break-start'|'break-end', lat, lng, coords?, locationId? }
 */
router.post('/clock', async (req, res) => {
  try {
    const { mode, lat, lng, coords } = req.body || {};
    const plat = Number(lat ?? coords?.lat);
    const plng = Number(lng ?? coords?.lng);

    if (mustEnforce()) {
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) {
        return res.status(400).json({ message: 'Location required' });
      }
      const dist = haversineMeters(plat, plng, OFFICE.lat, OFFICE.lng);
      if (dist > OFFICE.radius) {
        return res.status(403).json({ message: 'You are not at the office location' });
      }
    }

    const userId = req.user.id;
    const date = todayStr();
    let doc = await Attendance.findOne({ user: userId, date });

    if (!doc) doc = new Attendance({ user: userId, date });

    if (mode === 'in') {
      if (doc.clockIn && !doc.clockOut) {
        return res.status(400).json({ message: 'Already clocked in' });
      }
      doc.clockIn = new Date();
      doc.clockOut = undefined;
      doc.breaks = [];
      await doc.save();
      return res.json({ message: 'Clocked in', doc });
    }

    if (mode === 'out') {
      if (!doc.clockIn) return res.status(400).json({ message: 'You need to clock in first' });
      if (doc.clockOut) return res.status(400).json({ message: 'Already clocked out' });
      doc.clockOut = new Date();
      await doc.save();
      return res.json({ message: 'Clocked out', doc });
    }

    if (mode === 'break-start') {
      if (!doc.clockIn) return res.status(400).json({ message: 'You need to clock in first' });
      const breaks = Array.isArray(doc.breaks) ? doc.breaks : [];
      if (breaks.some(b => b.start && !b.end)) {
        return res.status(400).json({ message: 'Break already started' });
      }
      breaks.push({ start: new Date(), end: null });
      doc.breaks = breaks;
      await doc.save();
      return res.json({ message: 'Break started', doc });
    }

    if (mode === 'break-end') {
      if (!doc.clockIn) return res.status(400).json({ message: 'You need to clock in first' });
      const breaks = Array.isArray(doc.breaks) ? doc.breaks : [];
      const open = breaks.find(b => b.start && !b.end);
      if (!open) return res.status(400).json({ message: 'No open break to end' });
      open.end = new Date();
      doc.markModified('breaks');
      await doc.save();
      return res.json({ message: 'Break ended', doc });
    }

    return res.status(400).json({ message: 'Unknown mode' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'QR clock failed' });
  }
});

module.exports = router;
