// server/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware');
const officeGuard = require('../middleware/officeGuard');

// קונפיג משרד מתוך ENV
const officeOptions = {
  officeLat: Number(process.env.OFFICE_LAT),
  officeLng: Number(process.env.OFFICE_LNG),
  radiusMeters: Number(process.env.OFFICE_RADIUS_M) || 200,
  requireGps: Boolean(Number(process.env.ATTENDANCE_REQUIRE_OFFICE || 0)),
};

// ------- Helpers -------
function dateKeyLocal(d = new Date()) {
  const off = d.getTimezoneOffset();
  const z = new Date(d.getTime() - off * 60000);
  return z.toISOString().slice(0, 10);
}
function pickGeo(body = {}) {
  const { lat, lng, accuracy, address } = body || {};
  const out = {};
  if (typeof lat === 'number') out.lat = lat;
  if (typeof lng === 'number') out.lng = lng;
  if (typeof accuracy === 'number') out.accuracy = accuracy;
  if (typeof address === 'string') out.address = address;
  return out;
}
function requireAnyPermission(perms = []) {
  return (req, res, next) => {
    try {
      const p = (req.user && req.user.permissions) || {};
      const ok = perms.some(key => Boolean(p[key]));
      if (!ok) return res.status(403).json({ message: 'Insufficient permissions' });
      next();
    } catch {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
}
function getActiveSession(doc) {
  if (!doc?.sessions?.length) return null;
  const last = doc.sessions[doc.sessions.length - 1];
  return (last && last.start && !last.end) ? last : null;
}

// ------- Clock In (פותח סשן חדש אם אין סשן פתוח) -------
router.post('/clockin', authenticate, officeGuard(officeOptions), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const today = dateKeyLocal();
    let doc = await Attendance.findOne({ user: userId, date: today });

    const now = new Date();
    const meta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };

    if (!doc) {
      // מסמך יומי ראשון
      doc = new Attendance({
        user: userId,
        date: today,
        sessions: [{ start: now, inMeta: meta, breaks: [] }],
        clockIn: now,
        clockOut: null,
        breaks: [],
        clockInMeta: meta
      });
      await doc.save();
      return res.json({ ok: true, attendance: doc });
    }

    // אם כבר יש סשן פתוח – לא מאפשרים Clock In נוסף (צריך קודם Clock Out)
    const active = getActiveSession(doc);
    if (active) {
      return res.status(400).json({ message: 'Already clocked in (session still open)' });
    }

    // פותחים סשן חדש באותו יום
    doc.sessions.push({ start: now, inMeta: meta, breaks: [] });
    doc.clockIn = now;        // תאימות לאחור – מייצג את הסשן הפעיל
    doc.clockOut = null;
    doc.breaks = [];          // תאימות – מציג את ההפסקות של הסשן הפעיל
    doc.clockInMeta = meta;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockin error', err);
    return res.status(500).json({ message: 'Clock in failed' });
  }
});

// ------- Clock Out (סוגר את הסשן הפתוח בלבד) -------
router.post('/clockout', authenticate, officeGuard(officeOptions), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const today = dateKeyLocal();
    const doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc) return res.status(400).json({ message: 'Must clock in before clocking out' });

    const active = getActiveSession(doc);
    if (!active) return res.status(400).json({ message: 'No open session to clock out' });

    const now = new Date();
    active.end = now;
    active.outMeta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };

    // תאימות – משקף את מצב הסשן האחרון
    doc.clockOut = now;
    doc.clockOutMeta = active.outMeta;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockout error', err);
    return res.status(500).json({ message: 'Clock out failed' });
  }
});

// ------- Break Start (רק אם יש סשן פתוח) -------
router.post('/break/start', authenticate, officeGuard(officeOptions), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const today = dateKeyLocal();
    const doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc) return res.status(400).json({ message: 'Must clock in before starting a break' });

    const active = getActiveSession(doc);
    if (!active) return res.status(400).json({ message: 'Must clock in before starting a break' });

    const lastBreak = active.breaks[active.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({ message: 'A break is already in progress' });
    }

    active.breaks.push({ start: new Date() });
    // תאימות: מעדכן גם breaks העליון כדי שהקליינט הישן יציג נכון
    doc.breaks = active.breaks;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break start error', err);
    return res.status(500).json({ message: 'Failed to start break' });
  }
});

// ------- Break End (סוגר הפסקה פתוחה בסשן הפתוח) -------
router.post('/break/end', authenticate, officeGuard(officeOptions), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const today = dateKeyLocal();
    const doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc) return res.status(400).json({ message: 'Must clock in before ending a break' });

    const active = getActiveSession(doc);
    if (!active) return res.status(400).json({ message: 'Must clock in before ending a break' });

    const lastBreak = active.breaks[active.breaks.length - 1];
    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({ message: 'No break in progress' });
    }

    lastBreak.end = new Date();
    doc.breaks = active.breaks;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break end error', err);
    return res.status(500).json({ message: 'Failed to end break' });
  }
});

// ------- Notes (ללא שינוי מהותי) -------
router.patch('/:id/notes', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Bad attendance id' });
    }
    const doc = await Attendance.findByIdAndUpdate(
      id,
      { $set: { notes: typeof notes === 'string' ? notes : '' } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Attendance not found' });
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('patch notes error', err);
    return res.status(500).json({ message: 'Failed to update notes' });
  }
});

// ------- Report (כמו שהיה) -------
router.get('/report', authenticate, requireAnyPermission(['attendanceReadAll', 'reportExport']), async (req, res) => {
  try {
    const { from, to, userId } = req.query || {};
    const q = {};
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to;
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) q.user = userId;

    const data = await Attendance.find(q)
      .populate('user', 'name email department')
      .sort({ date: -1, 'user.name': 1 });

    return res.json({ ok: true, data });
  } catch (err) {
    console.error('report error', err);
    return res.status(500).json({ message: 'Failed to load report' });
  }
});

module.exports = router;
