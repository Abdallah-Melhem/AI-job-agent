const aiAgent = require('../agent/agent');
const stateManager = require('../agent/stateManager');

/**
 * @desc    Launch autonomous agent task
 * @route   POST /api/agent/run
 * @access  Private
 */
const runAgent = async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal || !goal.trim()) {
      return res.status(400).json({ message: 'Goal is required to launch agent.' });
    }

    const taskResult = await aiAgent.run(req.user, goal.trim());
    res.json(taskResult);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Agent failed to run' });
  }
};

/**
 * @desc    Get all agent tasks for user
 * @route   GET /api/agent/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  try {
    const tasks = await stateManager.listUserTasks(req.user._id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get details / state of a specific task
 * @route   GET /api/agent/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res) => {
  try {
    const task = await stateManager.getTask(req.params.id, req.user._id);
    if (!task) {
      return res.status(404).json({ message: 'Agent task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  runAgent,
  getTasks,
  getTaskById
};
