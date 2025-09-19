// server/routes/invite.routes.js
const express = require('express');
const router = express.Router();

//
// ייבוא מאובטח של ה־auth middleware כדי לכסות כל וריאציה קיימת (authenticate/requireAuth/פונקציה ישירה)
// לא משנה מה יש אצלך – נאתר את הפונקציה הנכונה בלי לשבור כלום.
//
const authMwModule = require('../middleware/authMiddleware'); // השם והתיקייה לפי מה שיש אצלך
const authenticate =
  (typeof authMwModule === 'function' && authMwModule) ||
  authMwModule.authenticate ||
  authMwModule.requireAuth;

if (typeof authenticate !== 'function') {
  // נזרוק שגיאה ברורה אם אין פונקציית אימות – כדי לא לגרום ל-undefined ב-Route.post
  throw new Error('Auth middleware function not found (authenticate/requireAuth). Check server/middleware/authMiddleware.js');
}

const { createInviteToken } = require('../utils/invite');

// הרשאה: אדמין מלא או usersManage (לא מחליף מודל הרשאות – רק משתמש בו)
function requireInvitePermission(req, res, next) {
  const u = req.userDoc || {};
  const isAdmin = u.role === 'admin' || u.isAdmin === true || u.permissions?.admin;
  const canManageUsers = !!u.permissions?.usersManage;
  if (isAdmin || canManageUsers) return next();
  return res.status(403).json({ error: 'Forbidden: missing permission' });
}

// POST /api/invite/create
// body: { role?: 'employee'|'manager'|'admin', expiresInDays?: number, email?: string }
// החזרה: { ok, inviteUrl, token, expiresAt }
router.post('/create', authenticate, requireInvitePermission, async (req, res) => {
  try {
    const { role = 'employee', expiresInDays, email } = req.body || {};
    const { token, expAt } = createInviteToken({ role, expiresInDays, email });

    const baseUrl = process.env.CLIENT_PUBLIC_URL || 'https://ravanahelmet.fun';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`;

    return res.json({
      ok: true,
      inviteUrl,
      token,
      expiresAt: new Date(expAt).toISOString(),
    });
  } catch (err) {
    console.error('invite create error:', err);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
});

module.exports = router;
