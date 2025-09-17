// server/routes/admin.users.mgmt.js
const express = require('express');
const bcrypt = require('bcrypt');
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// הרשאות מקומיות: admin או usersManage
function requireAnyPermission(keys) {
  return (req, res, next) => {
    const p = (req.user && req.user.permissions) || {};
    if (keys.some(k => !!p[k])) return next();
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  };
}

router.use(authenticate);
router.use(requireAnyPermission(['admin','usersManage']));

function escapeRegex(s=''){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** POST /api/admin/users-mgmt/reset-password
 * body: { email, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) return res.status(400).json({ ok: false, error: 'Missing email or newPassword' });

    const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email.trim())}$`, 'i') });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    user.email = String(user.email).toLowerCase().trim(); // לנרמל קדימה
    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ ok: false, error: 'Failed to reset password' });
  }
});

module.exports = router;
