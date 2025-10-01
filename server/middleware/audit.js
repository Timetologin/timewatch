// server/middleware/audit.js
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'actions.log');

function ensureDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

function logAction({ userId, action, meta = {}, ip, ua }) {
  ensureDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    userId, action, meta, ip, ua
  }) + '\n';
  fs.appendFile(LOG_FILE, line, () => {});
}

// מילוי אוטומטי למספר פעולות מוכרות של Attendance
function auditAttendance(req, res, next) {
  const map = {
    'POST:/api/attendance/clockin':  'CLOCK_IN',
    'POST:/api/attendance/clockout': 'CLOCK_OUT',
    'POST:/api/attendance/break/start': 'BREAK_START',
    'POST:/api/attendance/break/end':   'BREAK_END'
  };
  const key = `${req.method}:${req.baseUrl}${req.path}`;
  const action = map[key];

  // רק אם זו פעולה שאנו רוצים ללוגג
  if (action) {
    const userId = req?.user?._id || req?.user?.id || 'unknown';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];

    // ניקח lat/lng אם הגיעו בבקשה
    const { lat, lng } = req.body || {};
    const meta = {};
    if (lat && lng) meta.lat = lat, meta.lng = lng;

    // נרשום את הלוג *אחרי* שהתגובה נשלחת (כדי לדעת אם הצליח)
    const oldJson = res.json.bind(res);
    res.json = (payload) => {
      try {
        meta.status = 'ok';
        logAction({ userId, action, meta, ip, ua });
      } catch {}
      return oldJson(payload);
    };

    // במקרה של שגיאה (4xx/5xx)
    const oldStatus = res.status.bind(res);
    res.status = (code) => {
      const ret = oldStatus(code);
      if (code >= 400) {
        try {
          meta.status = `error:${code}`;
          logAction({ userId, action, meta, ip, ua });
        } catch {}
      }
      return ret;
    };
  }

  next();
}

module.exports = { auditAttendance };
