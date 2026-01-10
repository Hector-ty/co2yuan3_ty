const express = require('express');
const router = express.Router();
const { getMobileData } = require('../controllers/carbonData');

// GET route for mobile app to fetch carbon data (public read-only)
router.get('/carbon-data', getMobileData);

module.exports = router;

