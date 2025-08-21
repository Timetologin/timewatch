// server/middleware/officeGuard.js
// שומר תאימות: אם ATTENDANCE_REQUIRE_OFFICE=1 נדרש lat/lng, אחרת עובר.
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function requireAtOffice(req, res, next) {
  const must = String(process.env.ATTENDANCE_REQUIRE_OFFICE || '0') === '1';
  if (!must) return next();

  const officeLat = Number(process.env.OFFICE_LAT);
  const officeLng = Number(process.env.OFFICE_LNG);
  const radius = Number(process.env.OFFICE_RADIUS_M || 150);

  const { lat, lng } = Object.assign({}, req.body || {}, req.query || {});
  const plat = Number(lat);
  const plng = Number(lng);

  if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng)) {
    return res.status(500).json({ message: 'Office location not configured' });
  }
  if (!Number.isFinite(plat) || !Number.isFinite(plng)) {
    return res.status(400).json({ message: 'Location required' });
  }

  const dist = haversineMeters(officeLat, officeLng, plat, plng);
  if (dist > radius) {
    return res.status(403).json({ message: 'You are not at the office location' });
  }
  next();
}

module.exports = { requireAtOffice };
