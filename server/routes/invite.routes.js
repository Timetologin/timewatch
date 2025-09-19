// server/routes/invite.routes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware'); // אם הנתיב שונה אצלך, עדכן
const { createInviteToken } = require('../utils/invite');

// פונקציה קטנה שבודקת הרשאה. תעדכן בהתאם למבנה המשתמש שלך.
// הלוגיקה לא מחליפה כלום קיים — רק מוסיפה בדיקה לנתיב הזה.
function requireInvitePermission(req, res, next) {
  const user = req.user;
  // מספיק אחד מהבאים: אדמין מלא, או הרשאת usersManage (אם קיימת אצלך במודל ההרשאות)
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;
  const canManageUsers = !!user?.permissions?.usersManage;

  if (isAdmin || canManageUsers) return next();
  return res.status(403).json({ error: 'Forbidden: missing permission' });
}

// POST /api/invite/create
// body: { role?: 'employee'|'manager'|'admin', expiresInDays?: number, email?: string }
// החזרה: { inviteUrl, token, expiresAt }
router.post('/create', requireAuth, requireInvitePermission, async (req, res) => {
  try {
    const { role = 'employee', expiresInDays, email } = req.body || {};
    const { token, expAt } = createInviteToken({ role, expiresInDays, email });

    // הדומיין שלך לפרונט
    const baseUrl = process.env.CLIENT_PUBLIC_URL || 'https://ravanahelmet.fun';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`;

    return res.json({
      ok: true,
      inviteUrl,
      token,
      expiresAt: new Date(expAt).toISOString()
    });
  } catch (err) {
    console.error('invite create error:', err);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
});

module.exports = router;
