// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    // נבטיח שהשדה חוזר בשאילתא login ע"י .select('+password')
    password:   { type: String, required: true, minlength: 6, select: false },
    role:       { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    department: { type: String, default: '' },
    active:     { type: Boolean, default: true },
    permissions:{ type: permissionsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Hash once – אם הסיסמה כבר נראית כמו bcrypt, לא נבצע האשה שוב
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const pwd = String(this.password || '');
  const looksHashed = /^\$2[aby]\$[\d]{2}\$[./A-Za-z0-9]{53}$/.test(pwd);
  if (looksHashed) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(pwd, salt);
    next();
  } catch (e) { next(e); }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(String(candidate), String(this.password || ''));
};

module.exports = mongoose.model('User', userSchema);
