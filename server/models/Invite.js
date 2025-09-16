// server/models/Invite.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // אופציונלי: להזמין אימייל ספציפי בלבד
  emailLock: { type: String, default: null, lowercase: true, trim: true },

  // תפקיד והרשאות שיינתנו לנרשם דרך הלינק
  role: { type: String, default: 'user' },
  permissions: {
    usersManage: { type: Boolean, default: false },
    attendanceReadAll: { type: Boolean, default: false },
    attendanceEdit: { type: Boolean, default: false },
    reportExport: { type: Boolean, default: false },
    kioskAccess: { type: Boolean, default: false },
    attendanceBypassLocation: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
  },

  // מגבלות שימוש/תוקף
  maxUses: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 1000*60*60*24*7) }, // ברירת מחדל: שבוע
  active: { type: Boolean, default: true },

}, { timestamps: true });

inviteSchema.methods.isUsable = function () {
  const now = new Date();
  return this.active &&
         this.usedCount < this.maxUses &&
         (!this.expiresAt || this.expiresAt > now);
};

module.exports = mongoose.model('Invite', inviteSchema);
