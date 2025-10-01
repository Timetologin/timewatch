// server/utils/mailer.js
// גרסה חסינה: לא דורשת nodemailer ברמת הטופ-לבל, טוענת אותו רק כשצריך.

function isMailConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  return Boolean(host && user && pass && from);
}

// מנסה לייצר transporter רק אם יש קונפיג וגם מותקן nodemailer
function getTransporter() {
  if (!isMailConfigured()) return { ok: false, reason: 'smtp_not_configured' };
  let nodemailer;
  try {
    nodemailer = require('nodemailer'); // טעינה עצלה
  } catch {
    return { ok: false, reason: 'nodemailer_not_installed' };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '0') === '1';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return { ok: true, transporter };
}

async function sendInviteEmail(to, inviteUrl, expiresAt) {
  // אם אין קונפיג או שאין חבילה מותקנת – לא נכשלים, רק מדלגים
  const t = getTransporter();
  if (!t.ok) {
    return { ok: false, skipped: true, reason: t.reason };
  }

  const from = process.env.SMTP_FROM;
  const subject = process.env.INVITE_EMAIL_SUBJECT || 'Your Costoro TimeWatch invite';

  const bodyText =
`Hi,

You have been invited to join Costoro • TimeWatch.

Invite link:
${inviteUrl}

This link may expire on: ${expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}

Thanks,
Costoro`;

  const bodyHtml =
`<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
  <p>Hi,</p>
  <p>You have been invited to join <b>Costoro • TimeWatch</b>.</p>
  <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none">Open Invite</a></p>
  <p style="word-break:break-all">${inviteUrl}</p>
  <p style="color:#6b7280">This link may expire on: ${expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}</p>
  <p>Thanks,<br/>Costoro</p>
</div>`;

  const info = await t.transporter.sendMail({
    from,
    to,
    subject,
    text: bodyText,
    html: bodyHtml,
  });

  return { ok: true, messageId: info?.messageId };
}

module.exports = { isMailConfigured, sendInviteEmail };
