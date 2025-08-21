// server/models/Attendance.js
const mongoose = require('mongoose');

const metaSchema = new mongoose.Schema(
  {
    ip: String,
    ua: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const breakSchema = new mongoose.Schema(
  { start: Date, end: Date },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD (מקומי)

    clockIn: { type: Date },
    clockOut: { type: Date },
    clockInMeta: { type: metaSchema },
    clockOutMeta: { type: metaSchema },

    breaks: { type: [breakSchema], default: [] },
    notes: { type: String, default: '' },

    // חישובים
    regularMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },

    // Audit עריכות ידניות
    lastEditedAt: { type: Date },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastEditedByName: { type: String, default: '' },
    lastEditedFields: { type: [String], default: [] },
  },
  { timestamps: true }
);

function computeMinutes(doc) {
  if (!doc.clockIn || !doc.clockOut) {
    doc.totalMinutes = 0;
    doc.regularMinutes = 0;
    doc.overtimeMinutes = 0;
    return;
  }
  const ms = doc.clockOut - doc.clockIn;
  const breakMs = (doc.breaks || []).reduce((acc, b) => (b.start && b.end ? acc + (b.end - b.start) : acc), 0);
  const total = Math.max(0, Math.round((ms - breakMs) / 60000));
  const REGULAR_LIMIT = Number(process.env.REGULAR_LIMIT_MINUTES || 480); // 8 שעות

  doc.totalMinutes = total;
  doc.regularMinutes = Math.min(total, REGULAR_LIMIT);
  doc.overtimeMinutes = Math.max(0, total - REGULAR_LIMIT);
}

attendanceSchema.pre('save', function(next) {
  computeMinutes(this);
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
