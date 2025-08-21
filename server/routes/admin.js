// server/routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// מאפשר כניסה אם role=admin או שיש למשתמש usersManage
function adminOrUsersManage(req, res, next) {
  const u = req.user || req.userDoc;
  if (!u) return res.status(401).json({ message: 'Unauthenticated' });

  const isAdmin = u.role === 'admin';
  const can = !!(req.userDoc && req.userDoc.permissions && req.userDoc.permissions.usersManage);
  if (isAdmin || can) return next();

  return res.status(403).json({ message: 'Forbidden' });
}

router.use(auth.authenticate, adminOrUsersManage);

// GET /api/admin - רשימת משתמשים
router.get('/', async (_req, res) => {
  try {
    const users = await User.find({}, '-password -__v').lean();
    res.json(users);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin - יצירה
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'user', department = '', active = true, permissions = {} } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    const user = new User({
      name,
      email,
      password,
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
    await user.save();

    const out = user.toObject();
    delete out.password;
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

    const toSet = {};
    if (name !== undefined) toSet.name = name;
    if (role !== undefined) toSet.role = role === 'admin' ? 'admin' : 'user';
    if (department !== undefined) toSet.department = department;
    if (active !== undefined) toSet.active = !!active;
    if (permissions) {
      toSet.permissions = {
        usersManage:       !!permissions.usersManage,
        attendanceReadAll: !!permissions.attendanceReadAll,
        attendanceEdit:    !!permissions.attendanceEdit,
        reportExport:      permissions.reportExport === undefined ? true : !!permissions.reportExport,
        kioskAccess:       !!permissions.kioskAccess,
      };
    }
    if (password) toSet.password = String(password);

    const updated = await User.findByIdAndUpdate(req.params.id, toSet, { new: true, runValidators: true }).select('-password -__v');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
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
