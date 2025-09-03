// server/middleware/officeGuard.js
//
// Middleware לאכיפת מיקום משרד + עקיפה למורשים.
// קורא הגדרות או מ-ENV או מהאופציות שהועברו אליו.
//
// ENV הנתמכים:
//   ATTENDANCE_REQUIRE_OFFICE=1      -> מחייב GPS למי שאין Bypass
//   OFFICE_LAT=32.08040
//   OFFICE_LNG=34.78070
//   OFFICE_RADIUS_M=600

function toNum(v, def = NaN) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

module.exports = function officeGuard(options = {}) {
  // טעינת אופציות עם נפילה ל-ENV כברירת מחדל
  const officeLat = toNum(options.officeLat, toNum(process.env.OFFICE_LAT));
  const officeLng = toNum(options.officeLng, toNum(process.env.OFFICE_LNG));
  const radiusMeters = toNum(options.radiusMeters, toNum(process.env.OFFICE_RADIUS_M, 200));
  const requireGps = typeof options.requireGps === 'boolean'
    ? options.requireGps
    : Boolean(Number(process.env.ATTENDANCE_REQUIRE_OFFICE || 0));

  return (req, res, next) => {
    try {
      // עקיפה — אם יש למשתמש ההרשאה
      if (req?.userDoc?.permissions?.attendanceBypassLocation) {
        req.locationBypassed = true;
        return next();
      }

      // שליפת מיקום מהבקשה
      const lat = toNum(req.body?.lat ?? req.query?.lat);
      const lng = toNum(req.body?.lng ?? req.query?.lng);

      // אם הגדרנו לדרוש GPS ואין קואורדינטות — חסימה
      if (requireGps && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        return res.status(400).json({ message: 'Location required' });
      }

      // אם אין לנו קונפיג משרד תקף (lat/lng/radius) — לא אוכפים רדיוס
      if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng) || !Number.isFinite(radiusMeters)) {
        return next();
      }

      // אם דרשנו GPS או התקבלו קואורדינטות — נבדוק מרחק
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        // לא דרשנו GPS אבל אין קואורדינטות — מעבירים
        return next();
      }

      // חישוב מרחק (Haversine)
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000; // meters
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
