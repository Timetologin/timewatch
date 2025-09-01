// server/middleware/officeGuard.js
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const OFFICE = {
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || 0),
  radius: Number(process.env.OFFICE_RADIUS_METERS || 150),
};

function requireAtOffice(req, res, next) {
  const must = String(process.env.ATTENDANCE_REQUIRE_OFFICE || '0') === '1';

  // ✅ Bypass for users with explicit permission
  const bypass = !!req?.userDoc?.permissions?.attendanceBypassLocation;
  if (bypass) return next();
  if (!must) return next();

  const lat = Number(req.body?.lat ?? req.body?.coords?.lat);
  const lng = Number(req.body?.lng ?? req.body?.coords?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'Location required' });
  }

  const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
  if (dist > OFFICE.radius) {
    return res.status(403).json({ message: 'You are not at the office location' });
  }
  next();
}

module.exports = { requireAtOffice };
