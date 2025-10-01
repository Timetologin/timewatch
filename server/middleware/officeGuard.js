// server/middleware/officeGuard.js

// ---- geo helpers (ללא תלות בקובץ חיצוני) ----
function toRad(deg) { return (deg * Math.PI) / 180; }
function distanceMeters(a, b) {
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const h =
    sin1 * sin1 +
    Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
function withinRadiusMeters(p, center, radiusM) {
  return distanceMeters(p, center) <= radiusM;
}

/**
 * אוכף שהפעולה מתבצעת בטווח המשרד, אלא אם למשתמש יש הרשאת BYPASS.
 * קורא lat/lng גם מ-body.lat/lng וגם מ-body.coords.lat/lng.
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
      const hasBypass =
        Boolean(
          perms.attendanceBypassLocation ||
            perms.bypassLocation ||
            perms.locationBypass ||
            userDoc.isAdmin ||
            perms.admin
        );

      if (!requireGps || hasBypass) return next();

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

      const inside = withinRadiusMeters(
        { lat, lng },
        { lat: officeLat, lng: officeLng },
        radiusMeters
      );

      if (!inside) {
        const distance = Math.round(
          distanceMeters({ lat, lng }, { lat: officeLat, lng: officeLng })
        );
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

      next();
    } catch (e) {
      res.status(500).json({ message: e.message || 'Office guard failed' });
    }
  };
};
