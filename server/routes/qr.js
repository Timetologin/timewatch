// server/routes/qr.js
const express = require('express');
const router = express.Router();

const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware');
const geo = require('../geo'); // משתמש בפונקציות מרוכזות: distanceMeters / withinRadiusMeters

// ---------- helpers ----------
function readRadius() {
  const m = Number(process.env.OFFICE_RADIUS_M);
  if (Number.isFinite(m)) return m;
  const mm = Number(process.env.OFFICE_RADIUS_METERS);
  if (Number.isFinite(mm)) return mm;
  return 150; // ברירת מחדל סבירה
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
  // קורא גם משדות ישירים וגם מ-body.coords
  const lat =
    typeof body.lat === 'number'
      ? body.lat
      : body.coords && typeof body.coords.lat === 'number'
      ? body.coords.lat
      : undefined;

  const lng =
    typeof body.lng === 'number'
      ? body.lng
      : body.coords && typeof body.coords.lng === 'number'
      ? body.coords.lng
      : undefined;

  const { accuracy, address } = body || {};
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
  return last && last.start && !last.end ? last : null;
}

// כל ה־QR endpoints דורשים התחברות
router.use(authenticate);

/**
 * POST /api/qr/clock
 * body: { mode: 'in'|'out'|'break-start'|'break-end', lat?, lng?, coords? }
 * תומך בריבוי משמרות (sessions) + תאימות לשדות legacy.
 */
router.post('/clock', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    // BYPASS permissions: כמה שמות אפשריים + admin
    const perms = (req.userDoc && req.userDoc.permissions) || {};
    const canBypass =
      !!(perms.attendanceBypassLocation || perms.bypassLocation || perms.locationBypass || perms.admin) ||
      !!req?.userDoc?.isAdmin;

    // אם צריך לאכוף מיקום ואין BYPASS — נוודא קיום קואורדינטות ובתוך הרדיוס
    if (mustEnforce() && !canBypass) {
      if (!Number.isFinite(OFFICE.lat) || !Number.isFinite(OFFICE.lng)) {
        return res.status(500).json({ message: 'Office location is not configured' });
      }

      const g = pickGeo(req.body);
      if (typeof g.lat !== 'number' || typeof g.lng !== 'number') {
        return res.status(400).json({ message: 'Location required' });
      }

      const inside = typeof geo.withinRadiusMeters === 'function'
        ? geo.withinRadiusMeters({ lat: g.lat, lng: g.lng }, { lat: OFFICE.lat, lng: OFFICE.lng }, OFFICE.radius)
        : (typeof geo.distanceMeters === 'function'
            ? geo.distanceMeters({ lat: g.lat, lng: g.lng }, { lat: OFFICE.lat, lng: OFFICE.lng }) <= OFFICE.radius
            : true);

      if (!inside) {
        const distance = typeof geo.distanceMeters === 'function'
          ? Math.round(geo.distanceMeters({ lat: g.lat, lng: g.lng }, { lat: OFFICE.lat, lng: OFFICE.lng }))
          : undefined;

        return res.status(403).json({
          message: 'You are not at the office location',
          details: {
            distanceMeters: distance,
            radiusMeters: OFFICE.radius,
            office: { lat: OFFICE.lat, lng: OFFICE.lng },
            you: { lat: g.lat, lng: g.lng },
          },
        });
      }
    }

    const { mode } = req.body || {};
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

      doc.sessions.push({ start: now, inMeta: meta, breaks: [] });

      // תאימות (legacy)
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
    return res.status(500).json({ message: e.message || 'QR clock failed' });
  }
});

module.exports = router;
