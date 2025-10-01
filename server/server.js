// server.js (FULL, start-first + mongo retry, supports MONGODB_URI)
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// ✅ תוספת: ראוטר ההזמנות
const inviteRoutes = require('./routes/invite.routes');

const app = express();

/* ---------- Config ---------- */
const PORT = Number(process.env.PORT || 4000);
// תומך גם ב-MONGODB_URI וגם ב-MONGO_URI, עם fallback ללוקאלי
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1/timewatch';

// מאחורי פרוקסי (Render/CF)
app.set('trust proxy', 1);

/* ---------- CORS ---------- */
// CLIENT_ORIGIN יכול להכיל כמה דומיינים מופרדים בפסיק
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // מאפשרים ללא Origin (Postman/Server-to-Server)
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
let mongoReady = false;
app.get('/api/health', (_req, res) => {
  // נשאיר 200 כדי ש-Render לא יכשיל deploy אם מונגו עדיין לא מחובר,
  // אבל נחזיר שדה mongo כדי שתוכל לראות סטטוס.
  res.status(200).json({ ok: true, mongo: mongoReady, ts: new Date().toISOString() });
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

// ✅ תוספת: חיבור /api/invite
app.use('/api/invite', inviteRoutes);

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

/* ---------- DB: connect with retry (non-blocking server) ---------- */
mongoose.set('strictQuery', false);

mongoose.connection.on('connected', () => {
  mongoReady = true;
  console.log('✅ Mongo connected');
});
mongoose.connection.on('disconnected', () => {
  mongoReady = false;
  console.log('⚠️  Mongo disconnected');
});
mongoose.connection.on('error', (err) => {
  mongoReady = false;
  console.error('❌ Mongo error:', err?.message || err);
});

async function connectWithRetry(attempt = 1) {
  if (!MONGO_URI) {
    console.error('❌ No Mongo URI provided (MONGODB_URI/MONGO_URI).');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: process.env.MONGO_DB || undefined,
      maxPoolSize: 10,
    });
  } catch (err) {
    const backoff = Math.min(30000, Math.floor(1000 * Math.pow(1.5, attempt)));
    console.error(`🔁 Mongo connect attempt ${attempt} failed: ${err?.message || err}. Retrying in ${backoff}ms`);
    setTimeout(() => connectWithRetry(attempt + 1), backoff);
  }
}

/* ---------- Start server first ---------- */
const server = app.listen(PORT, () => {
  console.log(`🚀 API listening on :${PORT}`);
  connectWithRetry().catch(() => {});
});

// Graceful shutdown (רשות)
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
process.on('SIGTERM', () => { console.log('SIGTERM'); server.close(() => process.exit(0)); });
