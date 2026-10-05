const express = require('express');
const router = express.Router();
const {
  getApplications,
  getApplicationForJob,
  prepareApplication,
  fillApplication,
  submitApplication,
  checkStatus
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getApplications);
router.get('/job/:jobId', protect, getApplicationForJob);
router.post('/job/:jobId/prepare', protect, prepareApplication);
router.post('/job/:jobId/fill', protect, fillApplication);
router.post('/job/:jobId/submit', protect, submitApplication);
router.post('/job/:jobId/status', protect, checkStatus);

module.exports = router;
