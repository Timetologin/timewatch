// server/middleware/officeGuard.js
//
// Middleware לאכיפת מיקום משרד + עקיפה למורשים.
//
// ENV הנתמכים:
//   ATTENDANCE_REQUIRE_OFFICE=1
//   OFFICE_LAT=32.08040
//   OFFICE_LNG=34.78070
//   OFFICE_RADIUS_M=600   או   OFFICE_RADIUS_METERS=600

function toNum(v, def = NaN) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function readRadiusMeters(options) {
  // סדר עדיפויות: options.radiusMeters -> OFFICE_RADIUS_M -> OFFICE_RADIUS_METERS -> 200
  if (Number.isFinite(options?.radiusMeters)) return Number(options.radiusMeters);
  const m = toNum(process.env.OFFICE_RADIUS_M);
  if (Number.isFinite(m)) return m;
  const mm = toNum(process.env.OFFICE_RADIUS_METERS);
  if (Number.isFinite(mm)) return mm;
  return 200;
}

module.exports = function officeGuard(options = {}) {
  const officeLat = toNum(options.officeLat, toNum(process.env.OFFICE_LAT));
  const officeLng = toNum(options.officeLng, toNum(process.env.OFFICE_LNG));
  const radiusMeters = readRadiusMeters(options);
  const requireGps = typeof options.requireGps === 'boolean'
    ? options.requireGps
    : Boolean(Number(process.env.ATTENDANCE_REQUIRE_OFFICE || 0));

  return (req, res, next) => {
    try {
      // BYPASS — למשתמשים מורשים
      if (req?.userDoc?.permissions?.attendanceBypassLocation) {
        req.locationBypassed = true;
        return next();
      }

      const lat = toNum(req.body?.lat ?? req.query?.lat);
      const lng = toNum(req.body?.lng ?? req.query?.lng);

      if (requireGps && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        return res.status(400).json({ message: 'Location required' });
      }

      if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng) || !Number.isFinite(radiusMeters)) {
        return next();
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return next();
      }

      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat - officeLat);
      const dLng = toRad(lng - officeLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(officeLat)) * Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > radiusMeters) {
        return res.status(403).json({ message: 'Outside office radius' });
      }

      next();
    } catch (e) {
      next(e);
    }
  };
};
