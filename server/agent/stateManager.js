const AgentTask = require('../models/AgentTask');

class StateManager {
  /**
   * Create a new agent task session
   */
  async createTask(userId, goal) {
    return await AgentTask.create({
      user: userId,
      goal,
      status: 'planning',
      plan: [],
      currentStep: 0,
      logs: [{
        timestamp: new Date(),
        level: 'info',
        message: `Task created for goal: "${goal}"`
      }]
    });
  }

  /**
   * Set the planned execution steps
   */
  async setPlan(taskId, planSteps) {
    return await AgentTask.findByIdAndUpdate(
      taskId,
      {
        plan: planSteps,
        status: 'running'
      },
      { new: true }
    );
  }

  /**
   * Update the status of a specific step in the plan
   */
  async updateStep(taskId, stepNumber, status, resultSummary = '') {
    const task = await AgentTask.findById(taskId);
    if (!task) return null;

    const stepIndex = task.plan.findIndex(s => s.step === stepNumber);
    if (stepIndex !== -1) {
      task.plan[stepIndex].status = status;
      if (resultSummary) {
        task.plan[stepIndex].resultSummary = resultSummary;
      }
    }
    task.currentStep = stepNumber;
    await task.save();
    return task;
  }

  /**
   * Add a log message
   */
  async addLog(taskId, message, details = null, level = 'info') {
    return await AgentTask.findByIdAndUpdate(
      taskId,
      {
        $push: {
          logs: {
            timestamp: new Date(),
            level,
            message,
            details
          }
        }
      },
      { new: true }
    );
  }

  /**
   * Complete the task with final results
   */
  async completeTask(taskId, results) {
    return await AgentTask.findByIdAndUpdate(
      taskId,
      {
        status: 'completed',
        results,
        $push: {
          logs: {
            timestamp: new Date(),
            level: 'info',
            message: 'Agent task completed successfully.'
          }
        }
      },
      { new: true }
    );
  }

  /**
   * Fail the task with an error message
   */
  async failTask(taskId, error) {
    return await AgentTask.findByIdAndUpdate(
      taskId,
      {
        status: 'failed',
        error: error.message || error,
        $push: {
          logs: {
            timestamp: new Date(),
            level: 'error',
            message: `Task failed: ${error.message || error}`
          }
        }
      },
      { new: true }
    );
  }

  /**
   * Get task by ID
   */
  async getTask(taskId, userId) {
    return await AgentTask.findOne({ _id: taskId, user: userId });
  }

  /**
   * List tasks for a user
   */
  async listUserTasks(userId) {
    return await AgentTask.find({ user: userId }).sort({ createdAt: -1 });
  }
}

module.exports = new StateManager();
