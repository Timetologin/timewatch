// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Invite = require('../models/Invite');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';
const JWT_EXPIRES = '30d';

function signToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
function sanitizeUser(u) {
  const user = u.toObject ? u.toObject() : u;
  delete user.password;
  return user;
}
function userDefaultPermissions() {
  return {
    usersManage: false,
    attendanceReadAll: false,
    attendanceEdit: false,
    reportExport: false,
    kioskAccess: false,
    bypassLocation: false, // ← תוקן! זה השם הנכון שה־UI בודק
    admin: false
  };
}
function isBcryptHash(str) {
  return typeof str === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
}
function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/auth/register
 * Invite-only registration
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, inviteToken } = req.body || {};
    if (!inviteToken) return res.status(400).json({ ok: false, error: 'Invite token is required' });
    if (!name || !email || !password) return res.status(400).json({ ok: false, error: 'Missing required fields' });

    const inv = await Invite.findOne({ token: inviteToken });
    if (!inv || !inv.isUsable()) return res.status(400).json({ ok: false, error: 'Invalid or expired invite' });

    const emailNorm = String(email).toLowerCase().trim();
    if (inv.emailLock && inv.emailLock !== emailNorm) {
      return res.status(400).json({ ok: false, error: 'Invite is locked to a different email' });
    }

    const existing = await User.findOne({ email: new RegExp(`^${escapeRegex(emailNorm)}$`, 'i') });
    if (existing) return res.status(409).json({ ok: false, error: 'Email already registered' });

    // Hash כאן בסדר; במודל יש הגנה בפני double-hash
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password: hash,
      role: inv.role || 'user',
      permissions: { ...userDefaultPermissions(), ...(inv.permissions || {}) },
    });

    inv.usedCount += 1;
    if (inv.usedCount >= inv.maxUses) inv.active = false;
    await inv.save();

    const token = signToken(user);
    res.status(201).json({ ok: true, token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ ok: false, error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing credentials' });

  const emailNorm = String(email).trim();
  let query = User.findOne({ email: new RegExp(`^${escapeRegex(emailNorm)}$`, 'i') });
  query = query.select('+password'); 
  const user = await query;
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid email or password' });

  const normalized = String(email).toLowerCase().trim();
  if (user.email !== normalized) {
    try { user.email = normalized; await user.save(); } catch {}
  }

  const stored = user.password || '';
  let ok = false;

  if (isBcryptHash(stored)) {
    try { ok = await bcrypt.compare(password, stored); } catch { ok = false; }
  }

  if (!ok && stored && !isBcryptHash(stored)) {
    if (stored === password) {
      try {
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        await user.save();
        ok = true;
        console.log(`[auth] migrated plain password -> bcrypt for ${user.email}`);
      } catch (e) {
        console.error('Password migrate error:', e);
        ok = false;
      }
    }
  }

  if (!ok) return res.status(401).json({ ok: false, error: 'Invalid email or password' });

  const token = signToken(user);
  res.json({ ok: true, token, user: sanitizeUser(user) });
});

/** GET /api/auth/me */
router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  res.json(sanitizeUser(user));
});

/** POST /api/auth/logout */
router.post('/logout', (_req, res) => res.json({ ok: true }));

/** GET /api/auth/invite/:token */
router.get('/invite/:token', async (req, res) => {
  const inv = await Invite.findOne({ token: req.params.token }).lean();
  if (!inv || !new Invite(inv).isUsable()) {
    return res.status(404).json({ ok: false, error: 'Invite not found or expired' });
  }
  res.json({
    ok: true,
    invite: {
      token: inv.token,
      emailLock: inv.emailLock,
      role: inv.role,
      permissions: inv.permissions,
      expiresAt: inv.expiresAt,
      remaining: Math.max(0, inv.maxUses - inv.usedCount),
    }
  });
});

module.exports = router;
