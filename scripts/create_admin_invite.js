// timewatch-clone/scripts/create_admin_invite.js
// שימוש:
//   node ./scripts/create_admin_invite.js            // ברירת מחדל: 7 ימים, שימוש 1
//   node ./scripts/create_admin_invite.js 30 3       // 30 ימים, עד 3 שימושים

const path = require('path');

// טען dotenv ישירות מתוך server/node_modules + קרא את server/.env
require(path.join(__dirname, '../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../server/.env'),
});

// טען את mongoose מתוך server/node_modules
const mongoose = require(path.join(__dirname, '../server/node_modules/mongoose'));
const crypto = require('crypto');

const DAYS_VALID = Number(process.argv[2] || 7);
const MAX_USES   = Number(process.argv[3] || 1);

// DB שלך (אותו אחד של הפרוד/דב)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timewatch';

// ה־URL של הפרונט (כדי להדפיס לינק מוכן)
const CLIENT_URL = (process.env.CLIENT_URL ||
  (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',')[0] : null) ||
  'http://localhost:5173').replace(/\/+$/, '');

async function getInviteModel() {
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
        // createdBy: ObjectId (אם אצלך מוגדר כך – נטפל בזה בלוגיקה למטה)
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

    // ננסה קודם בלי createdBy בכלל
    let payload = {
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
      status: 'active'
    };

    let doc;
    try {
      doc = await Invite.create(payload);
    } catch (e) {
      // אם נכשל בגלל createdBy חובה/ObjectId – ננסה שוב עם ObjectId דמה
      const msg = String(e && e.message || '');
      const createdByErr = msg.includes('createdBy');
      if (createdByErr) {
        payload = { ...payload, createdBy: new mongoose.Types.ObjectId() };
        doc = await Invite.create(payload);
      } else {
        throw e;
      }
    }

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
