// scripts/fix_admin_perms.js
// שימוש: node ./scripts/fix_admin_perms.js admin@youremail.com
const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../server/.env'),
});
const mongoose = require(path.join(__dirname, '../server/node_modules/mongoose'));
const User = require(path.join(__dirname, '../server/models/User'));

const MONGO_URI = process.env.MONGO_URI;
const email = (process.argv[2] || '').trim().toLowerCase();

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in server/.env');
  process.exit(1);
}
if (!email) {
  console.error('Usage: node ./scripts/fix_admin_perms.js <admin-email>');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found:', email);
      process.exit(1);
    }

    user.role = 'admin';
    user.permissions = {
      usersManage: true,
      attendanceEdit: true,
      attendanceReadAll: true,
      reportExport: true,
      kioskAccess: true,
      bypassLocation: true, // ← השם הנכון
    };
    await user.save();
    console.log('Updated admin permissions for', email);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
