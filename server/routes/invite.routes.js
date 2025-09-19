// server/routes/invite.routes.js
const express = require('express');
const router = express.Router();

// אימות — תופס כל הווריאציות בלי לשבור קיים
const authMwModule = require('../middleware/authMiddleware');
const authenticate =
  (typeof authMwModule === 'function' && authMwModule) ||
  authMwModule.authenticate ||
  authMwModule.requireAuth ||
  authMwModule.auth ||
  authMwModule.default;

if (typeof authenticate !== 'function') {
  throw new Error('Auth middleware function not found (authenticate/requireAuth).');
}

const { createInviteToken } = require('../utils/invite');
const { isMailConfigured, sendInviteEmail } = require('../utils/mailer');

// הרשאה: אדמין מלא או usersManage
function requireInvitePermission(req, res, next) {
  const u = req.userDoc || {};
  const isAdmin = u.role === 'admin' || u.isAdmin === true || u.permissions?.admin;
  const canManageUsers = !!u.permissions?.usersManage;
  if (isAdmin || canManageUsers) return next();
  return res.status(403).json({ error: 'Forbidden: missing permission' });
}

// POST /api/invite/create
// body: { role?: 'employee'|'manager'|'admin', expiresInDays?: number, email?: string }
router.post('/create', authenticate, requireInvitePermission, async (req, res) => {
  try {
    const { role = 'employee', expiresInDays, email } = req.body || {};
    const { token, expAt } = createInviteToken({ role, expiresInDays, email });

    const baseUrl = process.env.CLIENT_PUBLIC_URL || 'https://ravanahelmet.fun';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`;

    let emailSent = false;
    let emailSkipped = false;
    let emailError = null;

    const mail = String(email || '').trim();
    if (mail) {
      try {
        const r = await sendInviteEmail(mail, inviteUrl, expAt);
        emailSent = !!r?.ok;
        emailSkipped = !!r?.skipped;
      } catch (e) {
        emailError = e?.message || 'send failed';
        // לא מפיל את הבקשה – רק מדווח
        console.error('invite email error:', e);
      }
    }

    return res.json({
      ok: true,
      inviteUrl,
      token,
      expiresAt: new Date(expAt).toISOString(),
      email: mail || null,
      emailSent,
      emailSkipped,
      mailConfigured: isMailConfigured(),
      emailError,
    });
  } catch (err) {
    console.error('invite create error:', err);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
});

module.exports = router;
