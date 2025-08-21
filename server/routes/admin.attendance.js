// server/routes/admin.attendance.js
const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const Attendance = require('../models/Attendance'); // עדכן את הנתיב אם שונה אצלך

// ===== Helpers =====
function ensureDate(dateOrIso) {
  if (!dateOrIso) return new Date();
  const d = new Date(dateOrIso);
  if (isNaN(d)) throw new Error('Invalid date');
  return d;
}
function localDateISO(d) {
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function requireAdminLike(req, res, next) {
  const u = req.userDoc;
  const ok = u?.role === 'admin' || u?.permissions?.manageUsers || u?.permissions?.attendanceEdit;
  if (!ok) return res.status(403).json({ message: 'Forbidden' });
  next();
}

// כל הראוטים כאן דורשים התחברות והרשאת אדמין/מורשה
router.use(authenticate, requireAdminLike);

/**
 * POST /api/admin/attendance/:userId/clockin
 * body: { at?: ISO string, notes?: string }
 */
router.post('/:userId/clockin', async (req, res) => {
  try {
    const user = req.params.userId;
    const at = ensureDate(req.body?.at);
    const date = localDateISO(at);

    // אל תפתח כפולה ליום אם יש פתוחה
    const existingOpen = await Attendance.findOne({ user, date, clockIn: { $ne: null }, clockOut: null });
    if (existingOpen) return res.status(400).json({ message: 'Shift already open for this user' });

    const doc = await Attendance.create({
      user,
      date,
      clockIn: at,
      breaks: [],
      notes: req.body?.notes || '',
      meta: { source: 'admin' }
    });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

/**
 * POST /api/admin/attendance/:userId/clockout
 * body: { at?: ISO string }
 */
router.post('/:userId/clockout', async (req, res) => {
  try {
    const user = req.params.userId;
    const at = ensureDate(req.body?.at);
    const date = localDateISO(at);

    const open = await Attendance.findOne({ user, date, clockIn: { $ne: null }, clockOut: null });
    if (!open) return res.status(400).json({ message: 'No open shift found for this user' });

    open.clockOut = at;
    open.meta = Object.assign({}, open.meta, { source: 'admin' });
    await open.save();
    res.json(open);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

/**
 * POST /api/admin/attendance/:userId/break/start
 * body: { at?: ISO string }
 */
router.post('/:userId/break/start', async (req, res) => {
  try {
    const user = req.params.userId;
    const at = ensureDate(req.body?.at);
    const date = localDateISO(at);

    const open = await Attendance.findOne({ user, date, clockIn: { $ne: null }, clockOut: null });
    if (!open) return res.status(400).json({ message: 'No open shift found for this user' });

    const hasOpenBreak = (open.breaks || []).some(b => b.start && !b.end);
    if (hasOpenBreak) return res.status(400).json({ message: 'Break already open' });

    open.breaks = open.breaks || [];
    open.breaks.push({ start: at });
    open.meta = Object.assign({}, open.meta, { source: 'admin' });
    await open.save();
    res.json(open);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

/**
 * POST /api/admin/attendance/:userId/break/end
 * body: { at?: ISO string }
 */
router.post('/:userId/break/end', async (req, res) => {
  try {
    const user = req.params.userId;
    const at = ensureDate(req.body?.at);
    const date = localDateISO(at);

    const open = await Attendance.findOne({ user, date, clockIn: { $ne: null }, clockOut: null });
    if (!open) return res.status(400).json({ message: 'No open shift found for this user' });

    const last = (open.breaks || []).slice(-1)[0];
    if (!last || !last.start || last.end) return res.status(400).json({ message: 'No open break' });

    last.end = at;
    open.meta = Object.assign({}, open.meta, { source: 'admin' });
    await open.save();
    res.json(open);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

/**
 * PATCH /api/admin/attendance/record/:id
 * body: { clockIn?, clockOut?, notes?, breaks?, date? }
 * עריכה חופשית של הרשומה (תיקון טעויות).
 */
router.patch('/record/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const $set = {};
    if (req.body.clockIn !== undefined) $set.clockIn = req.body.clockIn ? new Date(req.body.clockIn) : null;
    if (req.body.clockOut !== undefined) $set.clockOut = req.body.clockOut ? new Date(req.body.clockOut) : null;
    if (req.body.notes !== undefined) $set.notes = String(req.body.notes || '');
    if (req.body.breaks !== undefined) $set.breaks = Array.isArray(req.body.breaks) ? req.body.breaks : [];
    if (req.body.date !== undefined) $set.date = String(req.body.date);

    const updated = await Attendance.findByIdAndUpdate(id, { $set, $setOnInsert: {} }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Record not found' });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

/**
 * POST /api/admin/attendance/manual
 * body: { user, date, clockIn?, clockOut?, breaks?, notes? }
 * יצירה ידנית של רשומה.
 */
router.post('/manual', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.user || !b.date) return res.status(400).json({ message: 'user and date are required' });

    const doc = await Attendance.create({
      user: b.user,
      date: b.date,
      clockIn: b.clockIn ? new Date(b.clockIn) : null,
      clockOut: b.clockOut ? new Date(b.clockOut) : null,
      breaks: Array.isArray(b.breaks) ? b.breaks : [],
      notes: b.notes || '',
      meta: { source: 'admin' }
    });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
});

module.exports = router;
