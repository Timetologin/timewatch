// server/server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance.routes'); // ← שם הקובץ נכון

// ── ENV
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/timewatch';
const PORT = Number(process.env.PORT || 4000);

// ── APP
const app = express();

// ── CORS: מקבל כמה דומיינים מ-ENV (מופרדים בפסיקים)
// דוגמה: CLIENT_ORIGIN="https://timewatch-ten.vercel.app,https://timewatch-git-main-timetologins-projects.vercel.app,https://timewatch-j0cokts4i-timetologins-projects.vercel.app"
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // מאפשר Postman/cURL/SSR (ללא Origin)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// ── Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);

// ── Static serving של ה-Client רק אם באמת יש build (כדי למנוע ENOENT ב-Render)
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

// ── DB + Start
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
