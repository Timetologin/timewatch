// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const PermissionsSchema = new mongoose.Schema(
  {
    usersManage:       { type: Boolean, default: false }, // ניהול משתמשים והרשאות
    attendanceReadAll: { type: Boolean, default: false }, // צפייה בדוחות של כולם
    attendanceEdit:    { type: Boolean, default: false }, // עריכת רשומות נוכחות
    reportExport:      { type: Boolean, default: true  }, // ייצוא CSV/XLSX/PDF
    kioskAccess:       { type: Boolean, default: false }  // גישה למסך QR/Kiosk
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password:   { type: String, required: true, minlength: 6, select: true },
    role:       { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    department: { type: String, default: '' },
    active:     { type: Boolean, default: true },

    permissions: { type: PermissionsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

// Hash password on create/update
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(String(this.password), salt);
    next();
  } catch (e) {
    next(e);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(String(candidate), this.password);
};

UserSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

UserSchema.methods.hasPermission = function (key) {
  return !!(this.permissions && this.permissions[key]);
};

module.exports = mongoose.model('User', UserSchema);
