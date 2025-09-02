// server/routes/admin.js
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// כל הראוטים כאן דורשים התחברות
router.use(authenticate);

// רק למי שיש הרשאת usersManage
function ensureUsersManage(req, res, next) {
  if (req?.userDoc?.permissions?.usersManage) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

// מפתחות הרשאה שמותר לגעת בהם
const PERM_KEYS = [
  'usersManage',
  'attendanceEdit',
  'attendanceReadAll',
  'reportExport',
  'kioskAccess',
  'attendanceBypassLocation', // ⬅ כולל עקיפת מיקום
];

const normEmail = (e) => String(e || '').trim().toLowerCase();

const sanitize = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department || '',
  active: u.active !== false,
  permissions: u.permissions || {},
  createdAt: u.createdAt,
});

/* ===========================
   GET /api/admin/users
   רשימת משתמשים (עם חיפוש חופשי)
   =========================== */
router.get('/users', ensureUsersManage, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const find = {};
    if (q) {
      find.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    }
    const users = await User.find(find, {
      name: 1, email: 1, role: 1, department: 1, active: 1, permissions: 1, createdAt: 1,
    }).sort({ createdAt: -1 });
    res.json({ users: users.map(sanitize) });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to load users' });
  }
});

/* ===========================
   POST /api/admin/users
   יצירת משתמש חדש מהטופס "New user"
   body: { name, email, password, role, department, active, permissions }
   =========================== */
router.post('/users', ensureUsersManage, async (req, res) => {
  try {
    const {
      name = '', email = '', password = '',
      role = 'user', department = '', active = true,
      permissions = {},
    } = req.body || {};

    if (!String(name).trim() || !String(email).trim() || !String(password)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const emailNorm = normEmail(email);
    const exists = await User.findOne({ email: emailNorm }).lean();
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    // מרכיבים permission object רק מהמפתחות המותרים
    const perms = {};
    for (const k of PERM_KEYS) if (k in (permissions || {})) perms[k] = !!permissions[k];

    // שים לב: password גולמי – המודל יעשה hash ב-pre('save')
    const u = new User({
      name: String(name).trim(),
      email: emailNorm,
      password: String(password),
      role: String(role) || 'user',
      department: String(department || ''),
      active: !!active,
      permissions: perms,
    });

    await u.save();
    return res.status(201).json({ user: sanitize(u) });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Create user failed' });
  }
});

/* ===========================
   PATCH /api/admin/users/:id
   עדכון פרטי משתמש (שם/אימייל/תפקיד/מחלקה/סטטוס/סיסמה/הרשאות)
   body: כל השדות אופציונליים
   =========================== */
router.patch('/users/:id', ensureUsersManage, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, password, role, department, active, permissions,
    } = req.body || {};

    const user = await User.findById(id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name != null) user.name = String(name).trim();
    if (email != null) user.email = normEmail(email);
    if (role != null) user.role = String(role);
    if (department != null) user.department = String(department);
    if (typeof active === 'boolean') user.active = active;

    if (password != null && String(password).trim()) {
      // המודל יעשה hash אוטומטית ב-pre('save')
      user.password = String(password);
    }

    if (permissions != null && typeof permissions === 'object') {
      const perms = { ...(user.permissions || {}) };
      for (const k of PERM_KEYS) {
        if (k in permissions) perms[k] = !!permissions[k];
      }
      user.permissions = perms;
    }

    await user.save();
    return res.json({ user: sanitize(user) });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Update user failed' });
  }
});

/* ===========================
   PATCH /api/admin/users/:id/permissions
   עדכון הרשאות בלבד (תואם לקליינט הישן)
   =========================== */
router.patch('/users/:id/permissions', ensureUsersManage, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body?.permissions || {};
    const $set = {};
    for (const k of PERM_KEYS) {
      if (k in patch) $set[`permissions.${k}`] = !!patch[k];
    }
    const user = await User.findByIdAndUpdate(
      id,
      { $set },
      { new: true, fields: { name: 1, email: 1, role: 1, department: 1, active: 1, permissions: 1, createdAt: 1 } }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, user: sanitize(user) });
  } catch (e) {
    res.status(500).json({
