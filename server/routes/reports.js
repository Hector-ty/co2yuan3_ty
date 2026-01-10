const express = require('express');
const router = express.Router();
const { exportCsv, compareData, exportExcel } = require('../controllers/reports');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

const reportsGeneratePermission = checkPermission(PERMISSIONS.REPORTS_GENERATE);

// @desc    Export user data to CSV
// @route   GET /api/reports/csv
// @access  Private
router.get('/csv', protect, reportsGeneratePermission, exportCsv);

// @desc    Get comparison data
// @route   GET /api/reports/compare
// @access  Private
router.get('/compare', protect, reportsGeneratePermission, compareData);

// @desc    Export user data to Excel with multiple sheets
// @route   GET /api/reports/excel
// @access  Private
router.get('/excel', protect, reportsGeneratePermission, exportExcel);

module.exports = router;
