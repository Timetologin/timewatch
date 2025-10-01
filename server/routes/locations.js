// server/routes/locations.js
const express = require('express');
const router = express.Router();

function readRadius() {
  const m = Number(process.env.OFFICE_RADIUS_M);
  if (Number.isFinite(m)) return m;
  const mm = Number(process.env.OFFICE_RADIUS_METERS);
  if (Number.isFinite(mm)) return mm;
  return 150;
}

const OFFICE = {
  id: 'main',
  name: process.env.OFFICE_NAME || 'Head Office',
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || 0),
  radiusMeters: readRadius(),
};

router.get('/', (_req, res) => res.json([OFFICE]));
router.get('/:id', (req, res) => {
  if (req.params.id === OFFICE.id) return res.json(OFFICE);
  return res.status(404).json({ message: 'Location not found' });
});

module.exports = router;
