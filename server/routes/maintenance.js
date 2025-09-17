// server/routes/maintenance.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

/**
 * הגנה: נדרש כותרת X-Admin-Reset עם הערך שנגדיר ב-ENV בשם ADMIN_RESET_TOKEN.
 * אין צורך ב-JWT. אם אין טוקן או שהוא לא תואם — 403.
 */
function guard(req, res, next) {
  const provided = req.header('X-Admin-Reset');
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected || !provided || provided !== expected) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
}

function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/maintenance/reset-password
 * Headers: X-Admin-Reset: <ADMIN_RESET_TOKEN>
 * Body: { email, newPassword }
 * פעולה: מאתר משתמש לפי אימייל (לא רגיש לאותיות), מצפין סיסמה חדשה ושומר.
 */
router.post('/reset-password', guard, async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Missing email or newPassword' });
    }
    const user = await User.findOne({ email: new RegExp(`^${escapeRegex(String(email).trim())}$`, 'i') });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    user.email = String(user.email).toLowerCase().trim(); // נרמול קדימה
    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('maintenance/reset-password error:', err);
    res.status(500).json({ ok: false, error: 'Failed to reset password' });
  }
});

/**
 * אופציונלי: לנרמל את כל המיילים ל-lowercase (בלי לגעת בסיסמאות).
 * POST /api/maintenance/normalize-emails
 * Headers: X-Admin-Reset: <ADMIN_RESET_TOKEN>
 */
router.post('/normalize-emails', guard, async (_req, res) => {
  try {
    const users = await User.find({}, { email: 1 });
    let updated = 0;
    for (const u of users) {
      const norm = String(u.email || '').toLowerCase().trim();
      if (u.email !== norm) {
        u.email = norm;
        await u.save();
        updated++;
      }
    }
    res.json({ ok: true, updated });
  } catch (err) {
    console.error('maintenance/normalize-emails error:', err);
    res.status(500).json({ ok: false, error: 'Failed to normalize' });
  }
});

module.exports = router;
