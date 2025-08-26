// server/routes/locations.js
const express = require('express');
const router = express.Router();

// מקור יחיד מה-ENV (Head Office)
const OFFICE = {
  id: 'main',
  name: process.env.OFFICE_NAME || 'Head Office',
  lat: Number(process.env.OFFICE_LAT || 0),
  lng: Number(process.env.OFFICE_LNG || 0),
  radiusMeters: Number(process.env.OFFICE_RADIUS_METERS || 150) // ברירת מחדל 150m
};

// GET /api/locations
router.get('/', (req, res) => {
  res.json([OFFICE]);
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  if (req.params.id === OFFICE.id) return res.json(OFFICE);
  return res.status(404).json({ message: 'Location not found' });
});

module.exports = router;
