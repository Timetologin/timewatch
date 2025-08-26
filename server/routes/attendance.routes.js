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

// לוג אוטומטי לפעולות נוכחות
const { auditAttendance } = require('../middleware/audit');
router.use(auditAttendance);

/* -------------------------------------------------------
   עוזרים פנימיים
------------------------------------------------------- */
const minutesBetween = (a, b) => {
  if (!a || !b) return 0;
  const A = new Date(a), B = new Date(b);
  return Math.max(0, Math.round((B - A) / 60000));
};

const isAdminOrReadAll = (userDoc) =>
  userDoc?.role === 'admin' || !!userDoc?.permissions?.attendanceReadAll;

const canEditAttendance = (doc, user, userDoc) => {
  const isOwner = String(doc.user) === String(user.id);
  const canEdit = isOwner || !!userDoc?.permissions?.attendanceEdit || userDoc?.role === 'admin';
  return canEdit;
};

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

    if (!doc || !doc.clockIn || doc.clockOut) {
      return res.status(400).json({ message: 'No active shift' });
    }

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

    const canReadAll = isAdminOrReadAll(req.userDoc);
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

/* ---------- רשימה עם עימוד ---------- */
router.get('/list', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

    const from = req.query.from ? String(req.query.from) : null;
    const to   = req.query.to   ? String(req.query.to)   : null;

    const q = {};
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to)   q.date.$lte = to;
    }

    if (req.query.userId) {
      if (!isAdminOrReadAll(req.userDoc)) return res.status(403).json({ message: 'Forbidden' });
      q.user = req.query.userId;
    } else {
      q.user = req.user.id;
    }

    const total = await Attendance.countDocuments(q);
    const rows = await Attendance.find(q)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email role')
      .lean();

    res.json({ page, limit, total, rows });
  } catch (e) {
    res.status(500).json({ message: e.message || 'List failed' });
  }
});

/* ---------- סטטיסטיקות חודש ---------- */
router.get('/stats', async (req, res) => {
  try {
    const month = (req.query.month || '').trim(); // "YYYY-MM"
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month must be YYYY-MM' });
    }
    const [y, m] = month.split('-').map(Number);

    const startStr = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;

    // סוף חודש → יום 0 של החודש הבא
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    const endStr = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const canReadAll = isAdminOrReadAll(req.userDoc);
    const userFilter = canReadAll ? {} : { user: req.user.id };

    const rows = await Attendance.find({
      ...userFilter,
      date: { $gte: startStr, $lte: endStr }
    }).populate('user', 'name email').lean();

    const byDay = {};
    const byUser = {};

    rows.forEach(r => {
      let mins = 0;
      if (r.clockIn && r.clockOut) mins += minutesBetween(r.clockIn, r.clockOut);
      if (Array.isArray(r.breaks)) {
        r.breaks.forEach(b => {
          if (b.start && b.end) mins -= minutesBetween(b.start, b.end);
        });
      }
      mins = Math.max(0, mins);

      byDay[r.date] = (byDay[r.date] || 0) + mins;

      const uid = String(r.user?._id || r.user);
      const uname = r.user?.name || 'Unknown';
      if (!byUser[uid]) byUser[uid] = { name: uname, minutes: 0 };
      byUser[uid].minutes += mins;
    });

    res.json({ month, byDay, byUser });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Stats failed' });
  }
});

/* ---------- Manual update ---------- */
router.put('/:id', async (req, res) => {
  try {
    const doc = await Attendance.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (!canEditAttendance(doc, req.user, req.userDoc)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

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

/* ---------- Notes only ---------- */
router.patch('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body || {};

    const doc = await Attendance.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (!canEditAttendance(doc, req.user, req.userDoc)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

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
