// server/server.js
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

/* ---------- Config ---------- */
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/timewatch';

// מקבלים IP אמיתי מאחורי פרוקסי (Render/CF)
app.set('trust proxy', 1);

/* ---------- CORS ---------- */
// CLIENT_ORIGIN יכול להכיל כמה דומיינים מופרדים בפסיק
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // מאפשרים ללא Origin (Postman/Server-to-Server)
    if (!origin) return cb(null, true);
    if (
      ALLOWED_ORIGINS.length === 0 ||
      ALLOWED_ORIGINS.includes('*') ||
      ALLOWED_ORIGINS.includes(origin)
    ) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

/* ---------- Security / Logs / Body ---------- */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));

/* ---------- Health ---------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/* ---------- Routes ---------- */
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// הטענות אופציונליות כדי למנוע קריסה אם קובץ לא קיים:
let attendanceRoutes;
try { attendanceRoutes = require('./routes/attendance.routes'); }
catch { attendanceRoutes = express.Router(); }

const qrRoutes = require('./routes/qr');

let locationsRoutes;
try { locationsRoutes = require('./routes/locations'); }
catch { locationsRoutes = express.Router(); }

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/locations', locationsRoutes);

/* ---------- Serve client build if exists ---------- */
(function serveClientIfExists() {
  const clientBuild = path.join(__dirname, '..', 'client', 'build');
  const indexHtml = path.join(clientBuild, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientBuild));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
    console.log('Serving client build from', clientBuild);
  } else {
    console.log('Client build not found; skipping static serving.');
  }
})();

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.stack || err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

/* ---------- DB & Start ---------- */
mongoose.set('strictQuery', false);
mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined })
  .then(() => {
    console.log('✅ Mongo connected');
    app.listen(PORT, () => console.log(`🚀 API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Mongo connect error:', err);
    process.exit(1);
  });
