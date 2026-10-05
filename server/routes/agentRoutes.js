const express = require('express');
const router = express.Router();
const { runAgent, getTasks, getTaskById } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/run', protect, runAgent);
router.get('/tasks', protect, getTasks);
router.get('/tasks/:id', protect, getTaskById);

module.exports = router;
