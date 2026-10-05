const worker = require('../services/backgroundWorker');

/**
 * @desc  Enqueue a background task
 * @route POST /api/worker/tasks
 * @access Private
 */
const enqueueTask = async (req, res) => {
  try {
    const { type, payload } = req.body;
    const validTypes = [
      'job_discovery', 'job_sync', 'cv_parse',
      'ai_match', 'resume_generation',
      'application_prep', 'application_status_check'
    ];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid task type. Valid types: ${validTypes.join(', ')}`
      });
    }

    const task = await worker.enqueue(type, payload || {}, req.user._id);
    res.status(201).json({
      success: true,
      message: 'Task queued for background processing. Poll the status endpoint for updates.',
      task: {
        id: task._id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc  Get all background tasks for user
 * @route GET /api/worker/tasks
 * @access Private
 */
const listTasks = async (req, res) => {
  try {
    const tasks = await worker.listUserTasks(req.user._id, 30);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc  Get status of a specific background task
 * @route GET /api/worker/tasks/:id
 * @access Private
 */
const getTask = async (req, res) => {
  try {
    const task = await worker.getTask(req.params.id, req.user._id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { enqueueTask, listTasks, getTask };
