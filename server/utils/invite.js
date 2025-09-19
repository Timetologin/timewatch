// server/utils/invite.js
const jwt = require('jsonwebtoken');

function createInviteToken({ email = null, role = 'employee', expiresInDays = 7, payloadExtra = {} }) {
  const secret = process.env.INVITE_SECRET || 'dev-invite-secret';
  const expSec = Math.max(1, Number(expiresInDays || process.env.INVITE_DEFAULT_TTL_DAYS || 7)) * 24 * 60 * 60;

  const payload = {
    t: 'invite',
    role,
    email,
    ...payloadExtra
  };

  const token = jwt.sign(payload, secret, { expiresIn: expSec });
  const expAt = Date.now() + expSec * 1000;
  return { token, expAt };
}

function verifyInviteToken(token) {
  const secret = process.env.INVITE_SECRET || 'dev-invite-secret';
  return jwt.verify(token, secret); // יזרוק שגיאה אם לא תקין/פג תוקף
}

module.exports = { createInviteToken, verifyInviteToken };
