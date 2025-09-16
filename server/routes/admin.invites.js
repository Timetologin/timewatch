// server/routes/admin.invites.js
const express = require('express');
const crypto = require('crypto');
const Invite = require('../models/Invite');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/perm');

const router = express.Router();

/**
 * כל הראוטים כאן מוגנים:
 * - חייבים להיות מחוברים (authenticate)
 * - חייבים הרשאת usersManage או admin
 */
router.use(authenticate);
router.use(requirePermission(['usersManage', 'admin']));

/**
 * POST /api/admin/invites
 * צור הזמנה חדשה
 * body: {
 *   emailLock?: string,
 *   role?: string,
 *   permissions?: { ... },
 *   maxUses?: number,
 *   daysValid?: number    // ברירת מחדל 7 ימים
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      emailLock = null,
      role = 'user',
      permissions = {},
      maxUses = 1,
      daysValid = 7,
    } = req.body || {};

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + (Number(daysValid) || 7) * 24 * 60 * 60 * 1000);

    const invite = await Invite.create({
      token,
      createdBy: req.user._id,
      emailLock: emailLock ? String(emailLock).toLowerCase().trim() : null,
      role,
      permissions: {
        usersManage: !!permissions.usersManage,
        attendanceReadAll: !!permissions.attendanceReadAll,
        attendanceEdit: !!permissions.attendanceEdit,
        reportExport: !!permissions.reportExport,
        kioskAccess: !!permissions.kioskAccess,
        attendanceBypassLocation: !!permissions.attendanceBypassLocation,
        admin: !!permissions.admin,
      },
      maxUses: Math.max(1, Number(maxUses) || 1),
      expiresAt,
      active: true,
    });

    // בנה לינק שמיש ללקוח (תכניס את הדומיין שלך במקום CLIENT_ORIGIN הראשי)
    const origins = (process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const base = origins[0] || 'https://timetologin.space';
    const inviteUrl = `${base}/register?invite=${invite.token}`;

    res.status(201).json({ ok: true, invite, inviteUrl });
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ ok: false, error: 'Failed to create invite' });
  }
});

/**
 * GET /api/admin/invites
 * רשימת הזמנות (מצומצם)
 */
router.get('/', async (_req, res) => {
  const list = await Invite.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ ok: true, invites: list });
});

/**
 * POST /api/admin/invites/:token/disable
 * ביטול הזמנה
 */
router.post('/:token/disable', async (req, res) => {
  const { token } = req.params;
  const inv = await Invite.findOne({ token });
  if (!inv) return res.status(404).json({ ok: false, error: 'Invite not found' });
  inv.active = false;
  await inv.save();
  res.json({ ok: true, invite: inv });
});

module.exports = router;
