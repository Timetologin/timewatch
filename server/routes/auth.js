// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// משתמשים ב-ENV ישירות (לא תלוי ב-export מ-authMiddleware)
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const TOKEN_TTL = '30d';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name = '', email = '', password = '' } = req.body || {};
    if (!name.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const normEmail = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normEmail }).lean();
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({
      name: String(name).trim(),
      email: normEmail,
      role: 'user',
      permissions: {}
    });

    // תמיכה בשתי גרסאות המודל: setPassword() או האש כאן
    if (typeof user.setPassword === 'function') {
      await user.setPassword(password);
    } else {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(String(password), salt);
    }

    await user.save();
    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || {},
      }
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    if (!email.trim() || !password) return res.status(400).json({ message: 'Missing credentials' });

    const normEmail = String(email).toLowerCase().trim();
    // אם במודל שלך password עם select: false – שנה ל: .select('+password')
    const user = await User.findOne({ email: normEmail });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // תמיכה בשתי גרסאות המודל: comparePassword() או bcrypt כאן
    let ok = false;
    if (typeof user.comparePassword === 'function') {
      ok = await user.comparePassword(password);
    } else {
      ok = await bcrypt.compare(String(password), String(user.password || ''));
    }
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.active === false) {
      return res.status(403).json({ message: 'User is disabled' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || {},
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
// משתמשים ב-authenticate כדי לקבל req.userDoc מלא (כולל permissions)
router.get('/me', authenticate, async (req, res) => {
  try {
    const u = req.userDoc;
    if (!u) return res.status(401).json({ message: 'User not found' });

    return res.json({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions || {},
    });
  } catch (err) {
    console.error('ME ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (_req, res) => {
  // בצד הלקוח רק מנקים טוקן; כאן מחזירים OK לסגירת לולאה
  res.json({ ok: true });
});

module.exports = router;
