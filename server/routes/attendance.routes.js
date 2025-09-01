// server/routes/attendance.routes.js
const express = require('express');
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAtOffice } = require('../middleware/officeGuard');

const router = express.Router();

// YYYY-MM-DD מקומי
const todayStr = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// כל המסלולים בקובץ מוגנים ב-JWT
router.use(authenticate);

/* ---------- GET: רשימת נוכחות לתאריכים ---------- */
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, page = 1, limit = 20 } = req.query;

    const q = { user: userId };
    if (from) q.date = { ...(q.date || {}), $gte: from };
    if (to) q.date = { ...(q.date || {}), $lte: to };

    const total = await Attendance.countDocuments(q);
    const rows = await Attendance.find(q)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ total, rows });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch attendance' });
  }
});

/* ---------- Clock In ---------- */
router.post('/clockin', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    let doc = await Attendance.findOne({ user: userId, date });

    if (doc && doc.clockIn && !doc.clockOut) {
      return res.status(400).json({ message: 'Already clocked in' });
    }

    if (!doc) doc = new Attendance({ user: userId, date });
    doc.clockIn = new Date();
    doc.clockOut = undefined;
    doc.breaks = [];
    await doc.save();

    res.json({ message: 'Clocked in', doc });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Clock in failed' });
  }
});

/* ---------- Clock Out ---------- */
router.post('/clockout', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    const doc = await Attendance.findOne({ user: userId, date });

    if (!doc || !doc.clockIn) {
      return res.status(400).json({ message: 'You need to clock in first' });
    }
    if (doc.clockOut) {
      return res.status(400).json({ message: 'Already clocked out' });
    }

    doc.clockOut = new Date();
    await doc.save();
    res.json({ message: 'Clocked out', doc });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Clock out failed' });
  }
});

/* ---------- Break Start ---------- */
router.post('/break/start', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    const doc = await Attendance.findOne({ user: userId, date });

    if (!doc || !doc.clockIn) {
      return res.status(400).json({ message: 'You need to clock in first' });
    }
    const breaks = Array.isArray(doc.breaks) ? doc.breaks : [];
    if (breaks.some(b => b.start && !b.end)) {
      return res.status(400).json({ message: 'Break already started' });
    }
    breaks.push({ start: new Date(), end: null });
    doc.breaks = breaks;
    await doc.save();

    res.json({ message: 'Break started', doc });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Break start failed' });
  }
});

/* ---------- Break End ---------- */
router.post('/break/end', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    const doc = await Attendance.findOne({ user: userId, date });

    if (!doc || !doc.clockIn) {
      return res.status(400).json({ message: 'You need to clock in first' });
    }
    const breaks = Array.isArray(doc.breaks) ? doc.breaks : [];
    const open = breaks.find(b => b.start && !b.end);
    if (!open) {
      return res.status(400).json({ message: 'No open break to end' });
    }
    open.end = new Date();
    doc.markModified('breaks');
    await doc.save();

    res.json({ message: 'Break ended', doc });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Break end failed' });
  }
});

/* ---------- עדכון הערות ---------- */
router.patch('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const doc = await Attendance.findOne({ _id: id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Attendance not found' });

    doc.notes = String(notes || '');
    doc.lastEditedAt = new Date();
    doc.lastEditedBy = req.user.id;
    doc.lastEditedByName = req.userDoc?.name || '';
    doc.lastEditedFields = Array.from(new Set([...(doc.lastEditedFields || []), 'notes']));

    await doc.save();
    res.json({ ok: true, notes: doc.notes });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Notes update failed' });
  }
});

module.exports = router;
