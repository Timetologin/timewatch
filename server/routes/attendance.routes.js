// server/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware'); // ✅ תיקון
const officeGuard = require('../middleware/officeGuard');         // ✅ מידלוור מיקום/Bypass

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

// ------- Clock In -------
router.post('/clockin', authenticate, officeGuard(), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const today = dateKeyLocal();
    let doc = await Attendance.findOne({ user: userId, date: today });
    if (doc?.clockIn) return res.status(400).json({ message: 'Already clocked in today' });

    const now = new Date();
    const meta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };

    if (!doc) {
      doc = new Attendance({ user: userId, date: today, clockIn: now, clockInMeta: meta });
    } else {
      doc.clockIn = now;
      doc.clockInMeta = meta;
    }
    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockin error', err);
    return res.status(500).json({ message: 'Clock in failed' });
  }
});

// ------- Clock Out -------
router.post('/clockout', authenticate, officeGuard(), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const today = dateKeyLocal();
    const doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc?.clockIn) return res.status(400).json({ message: 'Must clock in before clocking out' });
    if (doc.clockOut) return res.status(400).json({ message: 'Already clocked out today' });

    const now = new Date();
    doc.clockOut = now;
    doc.clockOutMeta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };
    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockout error', err);
    return res.status(500).json({ message: 'Clock out failed' });
  }
});

// ------- Break Start -------
router.post('/break/start', authenticate, officeGuard(), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const today = dateKeyLocal();
    let doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc?.clockIn) return res.status(400).json({ message: 'Must clock in before starting a break' });

    if (!Array.isArray(doc.breaks)) doc.breaks = [];
    const last = doc.breaks[doc.breaks.length - 1];
    if (last && !last.end) return res.status(400).json({ message: 'A break is already in progress' });

    doc.breaks.push({ start: new Date() });
    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break start error', err);
    return res.status(500).json({ message: 'Failed to start break' });
  }
});

// ------- Break End -------
router.post('/break/end', authenticate, officeGuard(), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const today = dateKeyLocal();
    const doc = await Attendance.findOne({ user: userId, date: today });
    if (!doc?.clockIn) return res.status(400).json({ message: 'Must clock in before ending a break' });
    if (!Array.isArray(doc.breaks) || doc.breaks.length === 0) {
      return res.status(400).json({ message: 'No break to end' });
    }
    const last = doc.breaks[doc.breaks.length - 1];
    if (last.end) return res.status(400).json({ message: 'No break in progress' });

    last.end = new Date();
    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break end error', err);
    return res.status(500).json({ message: 'Failed to end break' });
  }
});

// ------- Patch Notes -------
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

// ------- Report -------
router.get('/report', authenticate, requireAnyPermission(['attendanceReadAll', 'reportExport']), async (req, res) => {
  try {
    const { from, to, userId, department } = req.query || {};
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
