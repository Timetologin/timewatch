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

/* ---------- Clock In ---------- */
router.post('/clockin', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    let doc = await Attendance.findOne({ user: userId, date });
    if (!doc) doc = new Attendance({ user: userId, date });

    if (doc.clockIn && !doc.clockOut) {
      return res.status(400).json({ message: 'Already clocked in' });
    }

    doc.clockIn = new Date();
    // מתחילים משמרת חדשה: אין clockOut ואין הפסקה פתוחה
    doc.clockOut = undefined;
    doc.breaks = [];
    await doc.save();
    res.json(doc);
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
    if (!doc || !doc.clockIn) return res.status(400).json({ message: 'No active shift' });
    if (doc.clockOut) return res.status(400).json({ message: 'Already clocked out' });

    // סוגרים הפסקה פתוחה אם יש
    const last = (doc.breaks || [])[doc.breaks.length - 1];
    if (last && last.start && !last.end) last.end = new Date();

    doc.clockOut = new Date();
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Clock out failed' });
  }
});

/* ---------- Break start ---------- */
router.post('/break/start', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    const doc = await Attendance.findOne({ user: userId, date });

    // ❗ חובה: יש clockIn ואין clockOut
    if (!doc || !doc.clockIn || doc.clockOut) {
      return res.status(400).json({ message: 'No active shift' });
    }

    // אין הפסקה פתוחה
    const last = (doc.breaks || [])[doc.breaks.length - 1];
    if (last && last.start && !last.end) {
      return res.status(400).json({ message: 'Break already started' });
    }

    doc.breaks.push({ start: new Date() });
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Break start failed' });
  }
});

/* ---------- Break end ---------- */
router.post('/break/end', requireAtOffice, async (req, res) => {
  try {
    const userId = req.user.id;
    const date = todayStr();
    const doc = await Attendance.findOne({ user: userId, date });

    // ❗ גם פה בודקים שיש משמרת פעילה
    if (!doc || !doc.clockIn || doc.clockOut) {
      return res.status(400).json({ message: 'No active shift' });
    }

    const last = (doc.breaks || [])[doc.breaks.length - 1];
    if (!last || !last.start || last.end) {
      return res.status(400).json({ message: 'No active break' });
    }

    last.end = new Date();
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Break end failed' });
  }
});

/* ---------- Report by dates ---------- */
router.get('/report', async (req, res) => {
  try {
    const { from, to, userId } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'Missing from/to' });

    const canReadAll = !!req.userDoc?.permissions?.attendanceReadAll;
    const q = {
      date: { $gte: String(from), $lte: String(to) },
      user: canReadAll && userId ? userId : req.user.id,
    };
    const rows = await Attendance.find(q).sort({ date: 1 }).lean();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Report failed' });
  }
});

/* ---------- Manual update (audit) ---------- */
router.put('/:id', async (req, res) => {
  try {
    const doc = await Attendance.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const isOwner = String(doc.user) === String(req.user.id);
    const canEdit = isOwner || !!req.userDoc?.permissions?.attendanceEdit;
    if (!canEdit) return res.status(403).json({ message: 'Permission denied' });

    const { clockIn, clockOut, notes } = req.body || {};
    const edited = [];

    if (clockIn !== undefined)  { doc.clockIn  = clockIn  ? new Date(clockIn)  : undefined; edited.push('clockIn'); }
    if (clockOut !== undefined) { doc.clockOut = clockOut ? new Date(clockOut) : undefined; edited.push('clockOut'); }
    if (notes !== undefined)    { doc.notes = String(notes); edited.push('notes'); }

    if (edited.length) {
      doc.lastEditedAt = new Date();
      doc.lastEditedBy = req.user.id;
      doc.lastEditedByName = req.userDoc?.name || '';
      doc.lastEditedFields = edited;
    }

    // אם סגרו ידנית clockOut – נסגור הפסקה פתוחה
    if (doc.clockOut) {
      const last = (doc.breaks || [])[doc.breaks.length - 1];
      if (last && last.start && !last.end) last.end = new Date(doc.clockOut);
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (e) {
    res.status(500).json({ message: e.message || 'Update failed' });
  }
});

/* ---------- Notes only (audit) ---------- */
router.patch('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body || {};

    const doc = await Attendance.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const isOwner = String(doc.user) === String(req.user.id);
    const canEdit = isOwner || !!req.userDoc?.permissions?.attendanceEdit;
    if (!canEdit) return res.status(403).json({ message: 'Permission denied' });

    doc.notes = String(notes);
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
