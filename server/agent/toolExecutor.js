const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });
const toolRegistry = require('./toolRegistry');
const logger = require('../utils/logger');

// Structured Tool Execution Logs
const executionLogs = [];

/**
 * Tool Executor
 * Enforces:
 * 1. Permissions verification
 * 2. Input validation
 * 3. Structured Logging
 * 4. Safe controlled execution
 * 5. Output validation
 */
class ToolExecutor {
  constructor() {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Execute a tool by name with parameters in a user context
   * @param {string} toolName
   * @param {object} params
   * @param {object} context - Must include { user: object }
   */
  async execute(toolName, params = {}, context = {}) {
    const startTime = Date.now();
    const logEntry = {
      toolName,
      params,
      userId: context.user ? context.user._id : null,
      timestamp: new Date(),
      status: 'pending',
      durationMs: 0
    };

    try {
      // 1. Tool Lookup
      const tool = toolRegistry.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool "${toolName}" is not registered in ToolRegistry.`);
      }

      // 2. Permission Check
      if (tool.permission === 'authenticated_user' && (!context.user || !context.user._id)) {
        throw new Error(`Permission denied: Tool "${toolName}" requires an authenticated user.`);
      }

      // 3. Input Validation
      if (tool.parameters) {
        const validateInput = ajv.compile(tool.parameters);
        const valid = validateInput(params);
        if (!valid) {
          const errors = validateInput.errors.map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
          throw new Error(`Invalid arguments for tool "${toolName}": ${errors}`);
        }
      }

      // 4. Execution
      const result = await tool.execute(params, context);

      // 5. Output Validation (if defined)
      if (tool.outputSchema) {
        const validateOutput = ajv.compile(tool.outputSchema);
        const validOutput = validateOutput(result);
        if (!validOutput) {
          console.warn(`Output validation warning for tool "${toolName}":`, validateOutput.errors);
        }
      }

      // Record Success Log
      logEntry.status = 'success';
      logEntry.resultSnippet = JSON.stringify(result).slice(0, 200);
      logEntry.durationMs = Date.now() - startTime;
      this.recordLog(logEntry);

      return {
        success: true,
        toolName,
        data: result,
        durationMs: logEntry.durationMs
      };
    } catch (error) {
      // Record Error Log
      logEntry.status = 'error';
      logEntry.error = error.message;
      logEntry.durationMs = Date.now() - startTime;
      this.recordLog(logEntry);

      return {
        success: false,
        toolName,
        error: error.message,
        durationMs: logEntry.durationMs
      };
    }
  }

  recordLog(entry) {
    executionLogs.push(entry);
    // Keep max 500 recent logs in memory
    if (executionLogs.length > 500) {
      executionLogs.shift();
    }
    logger.tool(
      entry.taskId || 'direct',
      entry.toolName,
      entry.status,
      {
        userId: entry.userId,
        durationMs: entry.durationMs,
        error: entry.error
      }
    );
  }

  getLogs(limit = 50) {
    return executionLogs.slice(-limit).reverse();
  }
}

module.exports = new ToolExecutor();
