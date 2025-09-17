// timewatch-clone/scripts/create_admin_invite.js
// שימוש:
//   node ./scripts/create_admin_invite.js            // ברירת מחדל: 7 ימים, שימוש 1
//   node ./scripts/create_admin_invite.js 30 3       // 30 ימים, עד 3 שימושים

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

const DAYS_VALID = Number(process.argv[2] || 7);
const MAX_USES   = Number(process.argv[3] || 1);

// DB שלך (אותו אחד של הפרוד/דב)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timewatch';

// ה־URL של הפרונט שלך (כדי להדפיס לינק מוכן)
const CLIENT_URL = (process.env.CLIENT_URL ||
  (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',')[0] : null) ||
  'http://localhost:5173').replace(/\/+$/, '');

async function getInviteModel() {
  // ננסה להיטען את המודל הקיים אם יש (server/models/Invite.js)
  try {
    const inviteModelPath = path.join(__dirname, '../server/models/Invite.js');
    const Invite = require(inviteModelPath);
    return Invite;
  } catch (_) {
    // פולבאק – סכימה מינימלית לאותו קולקשן ('invites')
    const inviteSchema = new mongoose.Schema(
      {
        token: { type: String, unique: true, index: true },
        role: { type: String, default: 'admin' },
        permissions: {
          usersManage: { type: Boolean, default: true },
          attendanceEdit: { type: Boolean, default: true },
          attendanceReadAll: { type: Boolean, default: true },
          reportExport: { type: Boolean, default: true },
          kioskAccess: { type: Boolean, default: true },
          bypassLocation: { type: Boolean, default: true }
        },
        email: { type: String, default: null }, // null = כל מי שמחזיק את הטוקן יכול להירשם
        maxUses: { type: Number, default: 1 },
        usedCount: { type: Number, default: 0 },
        expiresAt: { type: Date },
        createdBy: { type: String, default: 'script' },
        status: { type: String, default: 'active' }
      },
      { collection: 'invites', timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
    );
    return mongoose.models.Invite || mongoose.model('Invite', inviteSchema);
  }
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('[OK] Connected to MongoDB');

    const Invite = await getInviteModel();

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + DAYS_VALID * 24 * 60 * 60 * 1000);

    const doc = await Invite.create({
      token,
      role: 'admin',
      permissions: {
        usersManage: true,
        attendanceEdit: true,
        attendanceReadAll: true,
        reportExport: true,
        kioskAccess: true,
        bypassLocation: true
      },
      email: null,
      maxUses: MAX_USES,
      usedCount: 0,
      expiresAt,
      createdBy: 'create_admin_invite_script',
      status: 'active'
    });

    const url = `${CLIENT_URL}/register?token=${token}`;

    console.log('\n=== Admin Invite Created ===');
    console.log('Invite ID :', doc._id.toString());
    console.log('Role      :', doc.role);
    console.log('Expires   :', expiresAt.toISOString());
    console.log('Max uses  :', MAX_USES);
    console.log('\nPaste this URL to register an ADMIN:\n');
    console.log(url, '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[ERROR]', err);
    process.exit(1);
  }
})();
