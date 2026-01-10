const express = require('express');
const router = express.Router();
const { regionTree } = require('../utils/regionData');

// @desc    Get region tree data
// @route   GET /api/regions
// @access  Public
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: regionTree
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
