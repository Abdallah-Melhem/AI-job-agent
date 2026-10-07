const express = require('express');
const router = express.Router();
const {
  // Read
  getApplications,
  getApplicationById,
  getApplicationForJob,
  getApplicationStats,
  // Create / Track
  trackJob,
  // Status
  updateStatus,
  // Update fields
  updateApplication,
  addNote,
  // Delete
  deleteApplication,
  // Preparation flow (legacy / agent-assisted)
  prepareApplication,
  fillApplication,
  submitApplication,
  checkStatus
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

// ─── Stats ───────────────────────────────────────────────────────────────────
router.get('/stats', protect, getApplicationStats);

// ─── List / Get ──────────────────────────────────────────────────────────────
router.get('/', protect, getApplications);                         // GET /applications?status=applied
router.get('/:id', protect, getApplicationById);                   // GET /applications/:id
router.get('/job/:jobId', protect, getApplicationForJob);          // GET /applications/job/:jobId

// ─── Track a Job ─────────────────────────────────────────────────────────────
router.post('/job/:jobId/track', protect, trackJob);               // POST /applications/job/:jobId/track

// ─── Status Transition ───────────────────────────────────────────────────────
router.patch('/:id/status', protect, updateStatus);                // PATCH /applications/:id/status

// ─── Update metadata ─────────────────────────────────────────────────────────
router.patch('/:id', protect, updateApplication);                  // PATCH /applications/:id
router.post('/:id/notes', protect, addNote);                       // POST /applications/:id/notes

// ─── Delete ──────────────────────────────────────────────────────────────────
router.delete('/:id', protect, deleteApplication);                 // DELETE /applications/:id

// ─── Preparation Flow (agent-assisted, requires user review before submit) ───
router.post('/job/:jobId/prepare', protect, prepareApplication);   // POST /applications/job/:jobId/prepare
router.post('/job/:jobId/fill', protect, fillApplication);         // POST /applications/job/:jobId/fill
router.post('/job/:jobId/submit', protect, submitApplication);     // POST /applications/job/:jobId/submit (explicit user action)
router.post('/job/:jobId/status', protect, checkStatus);           // POST /applications/job/:jobId/status

module.exports = router;
