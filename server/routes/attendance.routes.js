// server/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');
const officeGuard = require('../middleware/officeGuard');

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function dateKeyLocal(d = new Date()) {
  // YYYY-MM-DD לפי זמן מקומי
  const off = d.getTimezoneOffset();
  const z = new Date(d.getTime() - off * 60000);
  return z.toISOString().slice(0, 10);
}

// ⬅︎ עודכן: pickGeo קורא גם מ-body.coords וגם משדות עליונים
function pickGeo(body = {}) {
  const src = body && typeof body === 'object'
    ? (body.coords && typeof body.coords === 'object' ? body.coords : body)
    : {};
  const out = {};
  if (typeof src.lat === 'number') out.lat = src.lat;
  if (typeof src.lng === 'number') out.lng = src.lng;
  if (typeof src.accuracy === 'number') out.accuracy = src.accuracy;
  if (typeof src.address === 'string') out.address = src.address;
  return out;
}

function getActiveSession(doc) {
  // מחזיר את הסשן הפתוח אם קיים (מחדש/לגאסי)
  if (Array.isArray(doc?.sessions) && doc.sessions.length) {
    const last = doc.sessions[doc.sessions.length - 1];
    if (last?.start && !last?.end) return last;
  }
  if (doc?.clockIn && !doc?.clockOut) {
    // תאימות לגרסה ישנה
    return { start: doc.clockIn, breaks: doc.breaks || [] };
  }
  return null;
}

function secondsOfBreaks(breaks = [], now = new Date()) {
  return (breaks || []).reduce((sum, b) => {
    if (!b.start) return sum;
    const start = new Date(b.start);
    const end = b.end ? new Date(b.end) : now;
    const dur = Math.max(0, Math.round((end - start) / 1000));
    return sum + dur;
  }, 0);
}

function elapsedOfSegment(seg, now = new Date()) {
  if (!seg?.start) return 0;
  const start = new Date(seg.start);
  const end = seg.end ? new Date(seg.end) : now;
  const total = Math.max(0, Math.round((end - start) / 1000));
  const bsum = secondsOfBreaks(seg.breaks || [], now);
  return Math.max(0, total - bsum);
}

function requireAnyPermission(perms = []) {
  return (req, res, next) => {
    try {
      const p = (req.userDoc && req.userDoc.permissions) || {};
      const ok = perms.some((key) => Boolean(p[key]));
      if (!ok) return res.status(403).json({ message: 'Insufficient permissions' });
      next();
    } catch {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
}

// פרמטרי משרד מה־ENV
const officeOptions = {
  officeLat: Number(process.env.OFFICE_LAT),
  officeLng: Number(process.env.OFFICE_LNG),
  radiusMeters:
    Number(process.env.OFFICE_RADIUS_M) ||
    Number(process.env.OFFICE_RADIUS_METERS) ||
    200,
  requireGps: Boolean(Number(process.env.ATTENDANCE_REQUIRE_OFFICE || 0)),
};

/* -------------------------------------------------------
   Clock In / Out + Breaks (כמו שהיה, עם מטא + pickGeo חדש)
------------------------------------------------------- */

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
      doc = new Attendance({
        user: userId,
        date: today,
        sessions: [{ start: now, inMeta: meta, breaks: [] }],
        // תאימות legacy
        clockIn: now,
        clockOut: null,
        breaks: [],
        clockInMeta: meta,
      });
      await doc.save();
      return res.json({ ok: true, attendance: doc });
    }

    const active = getActiveSession(doc);
    if (active) {
      return res.status(400).json({ message: 'Already clocked in (session still open)' });
    }

    doc.sessions.push({ start: now, inMeta: meta, breaks: [] });
    // תאימות legacy
    doc.clockIn = now;
    doc.clockOut = null;
    doc.breaks = [];
    doc.clockInMeta = meta;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockin error', err);
    return res.status(500).json({ message: 'Clock in failed' });
  }
});

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
    const meta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };
    active.end = now;
    active.outMeta = meta;

    // תאימות legacy
    doc.clockOut = now;
    doc.clockOutMeta = meta;

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('clockout error', err);
    return res.status(500).json({ message: 'Clock out failed' });
  }
});

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

    const meta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };
    active.breaks.push({ start: new Date(), startMeta: meta });
    doc.breaks = active.breaks; // תאימות legacy

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break start error', err);
    return res.status(500).json({ message: 'Failed to start break' });
  }
});

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
    lastBreak.endMeta = { ip: req.ip, ua: req.headers['user-agent'], geo: pickGeo(req.body) };
    doc.breaks = active.breaks; // תאימות legacy

    await doc.save();
    return res.json({ ok: true, attendance: doc });
  } catch (err) {
    console.error('break end error', err);
    return res.status(500).json({ message: 'Failed to end break' });
  }
});

/* -------------------------------------------------------
   Notes / List / Report
------------------------------------------------------- */

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

router.get('/list', authenticate, async (req, res) => {
  try {
    const perms = (req.userDoc && req.userDoc.permissions) || {};
    const canReadAll = !!perms.attendanceReadAll;

    const { from, to, user, page = 1, limit = 50 } = req.query || {};
    const q = {};
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = String(from);
      if (to) q.date.$lte = String(to);
    }

    if (canReadAll) {
      if (user && String(user).trim()) q.user = String(user).trim();
    } else {
      q.user = req.user.id;
    }

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    const [rows, total] = await Promise.all([
      Attendance.find(q)
        .populate('user', 'name email')
        .sort({ date: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Attendance.countDocuments(q),
    ]);

    res.json({ page: pg, limit: lim, total, rows });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to load attendance list' });
  }
});

router.get(
  '/report',
  authenticate,
  requireAnyPermission(['attendanceReadAll', 'reportExport']),
  async (req, res) => {
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
  }
);

/* -------------------------------------------------------
   Live Presence (כפי שהיה אצלך)
   GET /api/attendance/presence?activeOnly=1
------------------------------------------------------- */

router.get('/presence', authenticate, async (req, res) => {
  try {
    // הרשאות צפייה לכל הארגון (כמו בניווט)
    const perms = (req.userDoc && req.userDoc.permissions) || {};
    const canReadAll = !!(
      perms.attendanceReadAll ||
      perms.usersManage ||
      perms.reportExport ||
      perms.admin
    );
    if (!canReadAll) return res.status(403).json({ message: 'Insufficient permissions' });

    const onlyActive = String((req.query || {}).activeOnly || '1') === '1';
    const today = dateKeyLocal();

    // מוצאים את כל מי שיש להם סשן פתוח היום
    const actives = await Attendance.find({
      date: today,
      $or: [
        { sessions: { $elemMatch: { start: { $exists: true }, end: { $exists: false } } } },
        { $and: [{ clockIn: { $ne: null } }, { clockOut: null }] }, // תאימות legacy
      ],
    })
      .populate('user', 'name email department')
      .lean();

    const now = new Date();

    // ממפים את התוצאות
    const rows = actives.map((doc) => {
      const seg = getActiveSession(doc);
      const onBreak = (() => {
        const lb = seg?.breaks?.[seg.breaks.length - 1];
        return !!(lb && lb.start && !lb.end);
      })();

      return {
        user: {
          id: String(doc.user?._id || doc.user),
          name: doc.user?.name || '',
          email: doc.user?.email || '',
          department: doc.user?.department || '',
        },
        active: !!seg,
        since: seg?.start || null,
        elapsedSeconds: seg ? elapsedOfSegment(seg, now) : 0,
        onBreak,
      };
    });

    // אם מבוקש – מציגים רק פעילים (ברירת המחדל)
    const filtered = onlyActive ? rows.filter((r) => r.active) : rows;

    // סדר: פעילים למעלה, אח"כ לפי זמן יורד
    filtered.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return b.elapsedSeconds - a.elapsedSeconds;
    });

    res.json({ now, rows: filtered });
  } catch (e) {
    console.error('presence error', e);
    res.status(500).json({ message: e.message || 'Failed to load presence' });
  }
});

module.exports = router;
