// server/server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ── Security & Utils
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance.routes'); // נשאר כמו אצלך
const qrRoutes = require('./routes/qr');
const locationsRoutes = require('./routes/locations');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/timewatch';
const PORT = Number(process.env.PORT || 4000);

const app = express();

// אם רץ מאחורי פרוקסי (Render/Nginx/Cloudflare) – שנקבל IP אמיתי
app.set('trust proxy', 1);

// ── CORS: אם לא הוגדר CLIENT_ORIGIN → נאשר הכל
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman/SSR
    if (
      ALLOWED_ORIGINS.length === 0 ||
      ALLOWED_ORIGINS.includes('*') ||
      ALLOWED_ORIGINS.includes(origin)
    ) {
      return cb(null, true);
    }
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true
}));

// ── אבטחה
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// ── לוגים
app.use(morgan('combined'));

// ── Body
app.use(express.json({ limit: '1mb' }));

// ── בריאות
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/locations', locationsRoutes);

// ── הגשת build של לקוח אם קיים
(function maybeServeClient() {
  const clientBuild = path.join(__dirname, '..', 'client', 'build');
  const indexHtml = path.join(clientBuild, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientBuild));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
    console.log('Serving client build from', clientBuild);
  } else {
    console.log('Client build not found, skipping static serving.');
  }
})();

// ── Mongo + Server start
mongoose
  .connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined })
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Mongo connect error:', err);
    process.exit(1);
  });
