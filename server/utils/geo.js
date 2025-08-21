// server/utils/geo.js
function toRad(v) { return (v * Math.PI) / 180; }

/** מרחק בק״מ בין שתי נקודות */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function withinRadiusMeters(lat, lon, centerLat, centerLon, radiusMeters) {
  const km = haversineKm(lat, lon, centerLat, centerLon);
  return km * 1000 <= radiusMeters;
}

module.exports = { haversineKm, withinRadiusMeters };
