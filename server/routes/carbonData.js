const express = require('express');
const router = express.Router();
const { submitData, getData, getDataByYear, deleteDataById, updateDataById } = require('../controllers/carbonData');
const { protect, optionalAuth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

// POST route to submit data
router.post('/', protect, checkPermission(PERMISSIONS.CARBON_DATA_CREATE), submitData);

// GET route to fetch all data (optional auth - allows mobile app access)
router.get('/', optionalAuth, getData);

// GET route to fetch single data entry by year
router.get('/:year', protect, checkPermission(PERMISSIONS.CARBON_DATA_READ), getDataByYear);

// PUT route to update a single data entry by its ID
router.put('/:id', protect, checkPermission(PERMISSIONS.CARBON_DATA_UPDATE), updateDataById);

// DELETE route to delete a single data entry by its ID
router.delete('/:id', protect, checkPermission(PERMISSIONS.CARBON_DATA_DELETE), deleteDataById);

module.exports = router;
