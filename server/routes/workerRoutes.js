const express = require('express');
const router = express.Router();
const { enqueueTask, listTasks, getTask } = require('../controllers/workerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/tasks', protect, enqueueTask);
router.get('/tasks', protect, listTasks);
router.get('/tasks/:id', protect, getTask);

module.exports = router;
