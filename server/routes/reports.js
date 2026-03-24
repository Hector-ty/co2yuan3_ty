const express = require('express');
const router = express.Router();
const {
  exportCsv,
  compareData,
  exportExcel,
  exportCarbonReport,
  exportCarbonReportStream,
  downloadCarbonReport,
  createBatchExport,
  getBatchExportStatus,
  downloadBatchZip,
} = require('../controllers/reports');
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

// @desc    Export single carbon data as carbon emission report (docx/pdf)
// @route   GET /api/reports/carbon-report?id=xxx&format=docx|pdf
// @access  Private
router.get('/carbon-report', protect, reportsGeneratePermission, exportCarbonReport);

// @desc    Export carbon report with real-time progress (SSE)
// @route   GET /api/reports/carbon-report-stream?id=xxx&format=docx|pdf
// @access  Private
router.get('/carbon-report-stream', protect, reportsGeneratePermission, exportCarbonReportStream);

// @desc    Download report by token (after stream done)
// @route   GET /api/reports/carbon-report-download?token=xxx
// @access  Private
router.get('/carbon-report-download', protect, downloadCarbonReport);

// @desc    Create batch carbon report export job
// @route   POST /api/reports/carbon-report-batch
// @access  Private
router.post('/carbon-report-batch', protect, reportsGeneratePermission, createBatchExport);

// @desc    Get batch export job status
// @route   GET /api/reports/carbon-report-batch/:jobId
// @access  Private
router.get('/carbon-report-batch/:jobId', protect, getBatchExportStatus);

// @desc    Download batch export as ZIP
// @route   GET /api/reports/carbon-report-batch/:jobId/download-zip
// @access  Private
router.get('/carbon-report-batch/:jobId/download-zip', protect, reportsGeneratePermission, downloadBatchZip);

module.exports = router;
