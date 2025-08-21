// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
    const token = auth.slice(7);
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Invalid token' }); }

    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.active === false) return res.status(403).json({ message: 'User is disabled' });

    req.user = { id: String(user._id), role: user.role };
    req.userDoc = user;
    next();
  } catch (e) {
    res.status(500).json({ message: 'Auth error' });
  }
}

module.exports = { authenticate };
