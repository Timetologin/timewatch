// server/routes/admin.js
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();
router.use(authenticate);

// guard: only users with usersManage permission
function ensureUsersManage(req, res, next) {
  if (req?.userDoc?.permissions?.usersManage) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

/**
 * GET /api/admin/users?q=
 * returns: [{_id, name, email, role, permissions}]
 */
router.get('/users', ensureUsersManage, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const find = {};
    if (q) {
      find.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ];
    }
    const users = await User.find(find, { name:1, email:1, role:1, permissions:1 }).sort({ createdAt: -1 });
    res.json({ users });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to load users' });
  }
});

/**
 * PATCH /api/admin/users/:id/permissions
 * body: { permissions: { usersManage?, attendanceEdit?, attendanceReadAll?, reportExport?, kioskAccess?, attendanceBypassLocation? } }
 */
router.patch('/users/:id/permissions', ensureUsersManage, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body?.permissions || {};

    const allowed = [
      'usersManage',
      'attendanceEdit',
      'attendanceReadAll',
      'reportExport',
      'kioskAccess',
      'attendanceBypassLocation', // NEW
    ];

    const $set = {};
    for (const k of allowed) {
      if (k in patch) $set[`permissions.${k}`] = !!patch[k];
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set },
      { new: true, fields: { name:1, email:1, role:1, permissions:1 } }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to update permissions' });
  }
});

module.exports = router;
