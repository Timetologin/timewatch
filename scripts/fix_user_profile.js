// scripts/fix_user_profile.js
// שימוש:
//   node ./scripts/fix_user_profile.js <email> "Full Name" --admin
// דוגמאות:
//   node ./scripts/fix_user_profile.js josh@gmail.com "Josh" --admin
//   node ./scripts/fix_user_profile.js josh@gmail.com "Josh"

const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../server/.env'),
});
const mongoose = require(path.join(__dirname, '../server/node_modules/mongoose'));
const User = require(path.join(__dirname, '../server/models/User'));

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI in server/.env');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = (args[0] || '').trim().toLowerCase();
const fullName = (args[1] || '').trim();
const makeAdmin = args.includes('--admin');

if (!email || !fullName) {
  console.error('Usage: node ./scripts/fix_user_profile.js <email> "Full Name" [--admin]');
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

    user.name = fullName;

    if (makeAdmin) {
      user.role = 'admin';
      user.permissions = {
        usersManage: true,
        attendanceEdit: true,
        attendanceReadAll: true,
        reportExport: true,
        kioskAccess: true,
        bypassLocation: true
      };
    }

    await user.save();
    console.log(`Updated user: ${email} -> name="${fullName}" role=${user.role}`);
    if (makeAdmin) console.log('Admin permissions applied.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
