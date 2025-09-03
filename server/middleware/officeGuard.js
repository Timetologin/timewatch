// server/middleware/officeGuard.js
//
// Middleware שמוודא הימצאות בתוך רדיוס המשרד.
// אם למשתמש יש הרשאה attendanceBypassLocation – מדלגים על כל הבדיקות.

module.exports = function officeGuard(options = {}) {
  const {
    // אם יש לכם קונפיג של מיקום/רדיוס, הוא נשאר כאן (לא נגעתי)
    officeLat = null,
    officeLng = null,
    radiusMeters = 200,
    requireGps = false, // אם true – בדרך־כלל דורשים GPS; נעקוף כשיש bypass
  } = options;

  return (req, res, next) => {
    try {
      // ⛳️ עקיפה למי שמורשה
      if (req?.userDoc?.permissions?.attendanceBypassLocation) {
        req.locationBypassed = true;
        return next();
      }

      // אם אין עקיפה – ממשיכים באכיפה הרגילה
      const lat = Number(req.body?.lat ?? req.query?.lat);
      const lng = Number(req.body?.lng ?? req.query?.lng);

      // אם מוגדרים לבקש GPS ובאמת אין – חוסם
      if (requireGps && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        return res.status(400).json({ message: 'Location required' });
      }

      // אם אין קונפיג משרד – מאשרים (לא נוגעים בהגיון הקודם)
      if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng) || !Number.isFinite(radiusMeters)) {
        return next();
      }

      // אם לא נשלח מיקום כלל – חסם
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: 'Invalid location' });
      }

      // חישוב מרחק (Haversine)
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000; // meters
      const dLat = toRad(lat - officeLat);
      const dLng = toRad(lng - officeLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(officeLat)) * Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
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
