// server/routes/admin.js
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

/* ---------- Guard: כל הראוטים כאן דורשים התחברות ---------- */
router.use(authenticate);

// רק למשתמשים עם הרשאת usersManage
function ensureUsersManage(req, res, next) {
  if (req?.userDoc?.permissions?.usersManage) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

/* ---------- Helpers ---------- */
const PERM_KEYS = [
  'usersManage',
  'attendanceEdit',
  'attendanceReadAll',
  'reportExport',
  'kioskAccess',
  'attendanceBypassLocation', // עקיפת מיקום
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

/* =========================================================================
   GET /api/admin/users?q=&page=&limit=
   מחזיר רשימת משתמשים. תאימות: מחזיר גם users וגם items + total.
========================================================================= */
router.get('/users', ensureUsersManage, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '200', 10)));

    const find = {};
    if (q) find.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

    const [rows, total] = await Promise.all([
      User.find(find)
        .select('name email role department active permissions createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(find),
    ]);

    const items = rows.map(sanitize);
    res.json({ users: items, items, total, page, limit });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to load users' });
  }
});

/* =========================================================================
   POST /api/admin/users
   יצירת משתמש חדש (המודל מבצע hash לסיסמה ב-pre('save'))
========================================================================= */
router.post('/users', ensureUsersManage, async (req, res) => {
  try {
    const {
      name = '',
      email = '',
      password = '',
      role = 'user',
      department = '',
      active = true,
      permissions = {},
    } = req.body || {};

    if (!String(name).trim() || !String(email).trim() || !String(password)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const emailNorm = normEmail(email);
    const exists = await User.findOne({ email: emailNorm }).lean();
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    const perms = {};
    for (const k of PERM_KEYS) if (k in (permissions || {})) perms[k] = !!permissions[k];

    const u = new User({
      name: String(name).trim(),
      email: emailNorm,
      password: String(password), // raw; model will hash
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

/* =========================================================================
   PATCH /api/admin/users/:id
   עדכון פרטי משתמש (כולל סיסמה/הרשאות). כל השדות אופציונליים.
========================================================================= */
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
      user.password = String(password); // model will hash
    }

    if (permissions != null && typeof permissions === 'object') {
      const perms = { ...(user.permissions || {}) };
      for (const k of PERM_KEYS) if (k in permissions) perms[k] = !!permissions[k];
      user.permissions = perms;
    }

    await user.save();
    return res.json({ user: sanitize(user) });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Update user failed' });
  }
});

/* =========================================================================
   PATCH /api/admin/users/:id/permissions
   עדכון הרשאות בלבד (לשימור תאימות)
========================================================================= */
router.patch('/users/:id/permissions', ensureUsersManage, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body?.permissions || {};
    const $set = {};
    for (const k of PERM_KEYS) if (k in patch) $set[`permissions.${k}`] = !!patch[k];

    const updated = await User.findByIdAndUpdate(id, { $set }, { new: true })
      .select('name email role department active permissions createdAt')
      .lean();
    if (!updated) return res.status(404).json({ message: 'User not found' });

    const clean = sanitize(updated);
    res.json({ ok: true, user: clean });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to update permissions' });
  }
});

module.exports = router;
