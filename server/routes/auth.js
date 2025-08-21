// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_INVITE = process.env.ADMIN_INVITE || '';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, inviteCode = '' } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    // האם זה המשתמש האדמין הראשון במערכת?
    const hasAdmin = await User.exists({ role: 'admin' });

    let role = 'user';
    if (!hasAdmin && ADMIN_INVITE && inviteCode === ADMIN_INVITE) {
      role = 'admin';
    }

    const user = new User({
      name,
      email,
      password,
      role,
      permissions: {} // ברירת מחדל; אדמין יקבל הרשאות לפי צורך בהמשך
    });
    await user.save();

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: {
          usersManage:       !!user.permissions?.usersManage,
          attendanceEdit:    !!user.permissions?.attendanceEdit,
          attendanceReadAll: !!user.permissions?.attendanceReadAll,
          reportExport:      !!user.permissions?.reportExport,
          kioskAccess:       !!user.permissions?.kioskAccess,
        }
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
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.active === false) {
      return res.status(403).json({ message: 'User is disabled' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: {
          usersManage:       !!user.permissions?.usersManage,
          attendanceEdit:    !!user.permissions?.attendanceEdit,
          attendanceReadAll: !!user.permissions?.attendanceReadAll,
          reportExport:      !!user.permissions?.reportExport,
          kioskAccess:       !!user.permissions?.kioskAccess,
        }
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers['authorization'];
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const u = await User.findById(payload.id).lean();
    if (!u) return res.status(401).json({ message: 'User not found' });

    const me = {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: {
        usersManage:       !!u.permissions?.usersManage,
        attendanceEdit:    !!u.permissions?.attendanceEdit,
        attendanceReadAll: !!u.permissions?.attendanceReadAll,
        reportExport:      !!u.permissions?.reportExport,
        kioskAccess:       !!u.permissions?.kioskAccess,
      },
    };

    return res.json(me);
  } catch (err) {
    console.error('ME ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
