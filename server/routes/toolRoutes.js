const express = require('express');
const router = express.Router();
const { listTools, executeTool, getToolLogs } = require('../controllers/toolController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, listTools);
router.post('/execute', protect, executeTool);
router.get('/logs', protect, getToolLogs);

module.exports = router;
