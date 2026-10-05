const express = require('express');
const router = express.Router();
const { 
  searchJobs, 
  getJob, 
  toggleSaveJob, 
  getSavedJobs, 
  matchJob, 
  tailorResume, 
  getTailoredResume,
  getSources
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

router.get('/sources', protect, getSources);
router.get('/search', protect, searchJobs);
router.get('/saved', protect, getSavedJobs);
router.get('/:id', protect, getJob);
router.post('/:id/save', protect, toggleSaveJob);
router.post('/:id/match', protect, matchJob);
router.route('/:id/tailor')
  .get(protect, getTailoredResume)
  .post(protect, tailorResume);

module.exports = router;
