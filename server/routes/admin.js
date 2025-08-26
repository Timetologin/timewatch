// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

// בדיקת הרשאות: אדמין או מי שיש לו usersManage
function adminOrUsersManage(req, res, next) {
  const u = req.userDoc;
  if (!u) return res.status(401).json({ message: 'Unauthenticated' });

  const isAdmin = u.role === 'admin';
  const can = !!u.permissions?.usersManage;
  if (isAdmin || can) return next();

  return res.status(403).json({ message: 'Forbidden' });
}

router.use(authenticate, adminOrUsersManage);

// GET /api/admin - רשימת משתמשים
router.get('/', async (_req, res) => {
  try {
    const users = await User.find({}, '-passwordHash -__v').lean();
    res.json(users);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin - יצירת משתמש
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'user', department = '', active = true, permissions = {} } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    const user = new User({
      name,
      email: String(email).toLowerCase(),
      role: role === 'admin' ? 'admin' : 'user',
      department,
      active: !!active,
      permissions: {
        usersManage:       !!permissions.usersManage,
        attendanceReadAll: !!permissions.attendanceReadAll,
        attendanceEdit:    !!permissions.attendanceEdit,
        reportExport:      permissions.reportExport === undefined ? true : !!permissions.reportExport,
        kioskAccess:       !!permissions.kioskAccess,
      }
    });
    await user.setPassword(password);
    await user.save();

    const out = user.toObject();
    delete out.passwordHash;
    delete out.__v;
    res.json(out);
  } catch (err) {
    console.error('CREATE USER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/:id - עדכון
router.put('/:id', async (req, res) => {
  try {
    const { name, password, role, department, active, permissions } = req.body || {};

    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) u.name = name;
    if (role !== undefined) u.role = role === 'admin' ? 'admin' : 'user';
    if (department !== undefined) u.department = department;
    if (active !== undefined) u.active = !!active;
    if (permissions) {
      u.permissions = {
        usersManage:       !!permissions.usersManage,
        attendanceReadAll: !!permissions.attendanceReadAll,
        attendanceEdit:    !!permissions.attendanceEdit,
        reportExport:      permissions.reportExport === undefined ? true : !!permissions.reportExport,
        kioskAccess:       !!permissions.kioskAccess,
      };
    }
    if (password) {
      await u.setPassword(password);
    }

    await u.save();
    const out = u.toObject();
    delete out.passwordHash;
    delete out.__v;
    res.json(out);
  } catch (err) {
    console.error('UPDATE USER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/:id - מחיקה
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
