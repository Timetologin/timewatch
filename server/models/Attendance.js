// server/models/Attendance.js
const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema(
  {
    start: { type: Date },
    end:   { type: Date }
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    start:  { type: Date },         // Clock In של הסשן
    end:    { type: Date },         // Clock Out של הסשן (יכול להיות ריק אם הסשן פתוח)
    breaks: { type: [breakSchema], default: [] }, // הפסקות בתוך הסשן
    // אופציונלי: meta למיקום/דפדפן
    inMeta:  { type: Object, default: {} },
    outMeta: { type: Object, default: {} },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD

    // תאימות לאחור (שדות של "הסשן הנוכחי/האחרון")
    clockIn:  { type: Date },
    clockOut: { type: Date },
    breaks:   { type: [breakSchema], default: [] },

    // חדש: ריבוי סשנים באותו יום
    sessions: { type: [sessionSchema], default: [] },

    // הערות
    notes: { type: String, default: '' },

    // אופציונלי: שמירת מטא לכניסה/יציאה ראשית (תאימות)
    clockInMeta:  { type: Object, default: {} },
    clockOutMeta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// אינדקס ייחודי על user+date — נשמור מסמך יומי אחד שמכיל כמה סשנים
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
