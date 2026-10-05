const toolRegistry = require('../agent/toolRegistry');
const toolExecutor = require('../agent/toolExecutor');

/**
 * @desc    List all available registered tools
 * @route   GET /api/tools
 * @access  Private
 */
const listTools = (req, res) => {
  const tools = toolRegistry.listTools();
  res.json({
    success: true,
    total: tools.length,
    tools
  });
};

/**
 * @desc    Execute a registered tool safely
 * @route   POST /api/tools/execute
 * @access  Private
 */
const executeTool = async (req, res) => {
  try {
    const { toolName, params } = req.body;
    if (!toolName) {
      return res.status(400).json({ message: 'toolName is required' });
    }

    const context = { user: req.user };
    const result = await toolExecutor.execute(toolName, params || {}, context);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get recent tool execution logs
 * @route   GET /api/tools/logs
 * @access  Private
 */
const getToolLogs = (req, res) => {
  const logs = toolExecutor.getLogs(50);
  res.json({
    success: true,
    total: logs.length,
    logs
  });
};

module.exports = {
  listTools,
  executeTool,
  getToolLogs
};
