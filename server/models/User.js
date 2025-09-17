// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // ← שורה יחידה! לא bcryptjs וגם לא כפול

const permissionsSchema = new mongoose.Schema(
  {
    usersManage:       { type: Boolean, default: false },
    attendanceReadAll: { type: Boolean, default: false },
    attendanceEdit:    { type: Boolean, default: false },
    reportExport:      { type: Boolean, default: true  },
    kioskAccess:       { type: Boolean, default: false },
    attendanceBypassLocation: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // מוחזר רק עם .select('+password')
    password:   { type: String, required: true, minlength: 6, select: false },
    role:       { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    department: { type: String, default: '' },
    active:     { type: Boolean, default: true },

    // אימוג'י פרופיל
    profileEmoji: { type: String, default: '🙂' },

    permissions: { type: permissionsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Hash once – אם הסיסמה כבר בפורמט bcrypt, לא נבצע האשה שוב
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const pwd = String(this.password || '');
  const looksHashed = /^\$2[aby]\$[\d]{2}\$[./A-Za-z0-9]{53}$/.test(pwd);
  if (looksHashed) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(pwd, salt);
    next();
  } catch (e) {
    next(e);
  }
});

// Hash גם בעדכונים עם findOneAndUpdate אם שינו סיסמה
userSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {};
    const pwd = update.password || (update.$set && update.$set.password);
    if (!pwd) return next();

    const looksHashed = /^\$2[aby]\$[\d]{2}\$[./A-Za-z0-9]{53}$/.test(String(pwd));
    if (looksHashed) return next();

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(String(pwd), salt);
    if (update.password) update.password = hashed;
    if (update.$set && update.$set.password) update.$set.password = hashed;

    next();
  } catch (err) {
    next(err);
  }
});

// השוואת סיסמה בלוגין
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(String(candidate), String(this.password || ''));
};

module.exports = mongoose.model('User', userSchema);
