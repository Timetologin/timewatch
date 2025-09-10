// server/middleware/officeGuard.js
const geo = require('../geo'); // משתמשים ב-withinRadiusMeters מה-geo שלך

/**
 * אוכף שהפעולה מתבצעת בטווח המשרד, אלא אם למשתמש יש הרשאת BYPASS.
 * קורא lat/lng גם מ-body.lat/lng וגם מ-body.coords.lat/lng.
 * סביבת הפעלה:
 *  - OFFICE_LAT / OFFICE_LNG
 *  - OFFICE_RADIUS_M (או OFFICE_RADIUS_METERS)
 *  - ATTENDANCE_REQUIRE_OFFICE=1 כדי לאכוף
 * הרשאות BYPASS נתמכות בשמות שכיחים:
 *  - permissions.attendanceBypassLocation / bypassLocation / locationBypass
 *  - או אם יש לך דגל admin/isAdmin (נלקח בחשבון)
 */
module.exports = (opts = {}) => {
  const officeLat =
    typeof opts.officeLat === 'number' ? opts.officeLat : Number(process.env.OFFICE_LAT);
  const officeLng =
    typeof opts.officeLng === 'number' ? opts.officeLng : Number(process.env.OFFICE_LNG);

  const radiusMeters =
    typeof opts.radiusMeters === 'number'
      ? opts.radiusMeters
      : Number(process.env.OFFICE_RADIUS_M || process.env.OFFICE_RADIUS_METERS || 200);

  const requireGps =
    typeof opts.requireGps === 'boolean'
      ? opts.requireGps
      : Boolean(Number(process.env.ATTENDANCE_REQUIRE_OFFICE || 0));

  return (req, res, next) => {
    try {
      const userDoc = req.userDoc || {};
      const perms = userDoc.permissions || {};

      // BYPASS?
      const hasBypass =
        Boolean(
          perms.attendanceBypassLocation ||
            perms.bypassLocation ||
            perms.locationBypass ||
            userDoc.isAdmin ||
            perms.admin
        );

      if (!requireGps || hasBypass) {
        return next();
      }

      if (!isFinite(officeLat) || !isFinite(officeLng)) {
        return res.status(500).json({ message: 'Office location is not configured' });
      }

      const b = req.body || {};
      const lat =
        typeof b.lat === 'number'
          ? b.lat
          : b.coords && typeof b.coords.lat === 'number'
          ? b.coords.lat
          : undefined;
      const lng =
        typeof b.lng === 'number'
          ? b.lng
          : b.coords && typeof b.coords.lng === 'number'
          ? b.coords.lng
          : undefined;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ message: 'Missing GPS coordinates (lat/lng)' });
      }

      const inside = geo.withinRadiusMeters(
        { lat, lng },
        { lat: officeLat, lng: officeLng },
        radiusMeters
      );

      if (!inside) {
        // אם קיימת פונקציית distanceMeters, נחזיר גם מרחק
        const distance =
          typeof geo.distanceMeters === 'function'
            ? Math.round(geo.distanceMeters({ lat, lng }, { lat: officeLat, lng: officeLng }))
            : undefined;

        return res.status(403).json({
          message: 'Outside the office radius',
          details: {
            distanceMeters: distance,
            radiusMeters,
            office: { lat: officeLat, lng: officeLng },
            you: { lat, lng },
          },
        });
      }

      return next();
    } catch (e) {
      return res.status(500).json({ message: e.message || 'Office guard failed' });
    }
  };
};
