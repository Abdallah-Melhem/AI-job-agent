const WorkerTask = require('../models/WorkerTask');
const adapterRegistry = require('../adapters/adapterRegistry');
const jobService = require('./jobService');
const { matchCandidateWithJob } = require('./matchingService');
const { tailorResumeForJob } = require('./tailoringService');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * In-process background worker.
 * 
 * Architecture:
 *  Express API → enqueue() → WorkerTask (MongoDB queue)
 *               Worker.process() runs in background loop
 *               Frontend polls GET /api/worker/tasks/:id for status
 */
class BackgroundWorker {
  constructor() {
    this.running = false;
    this.pollIntervalMs = 3000; // check queue every 3 seconds
    this._timer = null;
  }

  /**
   * Start the background worker polling loop
   */
  start() {
    if (this.running) return;
    this.running = true;
    console.log('[Worker] Background worker started.');
    this._schedule();
  }

  stop() {
    this.running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    console.log('[Worker] Background worker stopped.');
  }

  _schedule() {
    if (!this.running) return;
    this._timer = setTimeout(async () => {
      try {
        await this._processNext();
      } catch (err) {
        console.error('[Worker] Unhandled error in poll cycle:', err.message);
      }
      this._schedule();
    }, this.pollIntervalMs);
  }

  /**
   * Pick the oldest queued task and process it
   */
  async _processNext() {
    const task = await WorkerTask.findOneAndUpdate(
      { status: 'queued' },
      { status: 'running', startedAt: new Date() },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!task) return; // nothing to process

    logger.worker('task_started', { taskId: task._id, type: task.type, userId: task.user });

    try {
      let result;

      switch (task.type) {
        case 'job_discovery':
        case 'job_sync': {
          const source = task.payload?.source || 'all';
          const query = task.payload?.query || {};
          const importResults = await adapterRegistry.importJobs(source, query);
          const totalImported = importResults.reduce((sum, r) => sum + (r.imported || 0), 0);
          result = { sources: importResults, totalImported };
          break;
        }

        case 'cv_parse': {
          // Trigger CV parsing via cvParser service
          const cvParser = require('./cvParser');
          const CV = require('../models/CV');
          const cv = await CV.findOne({ _id: task.payload.cvId, user: task.user });
          if (!cv) throw new Error('CV not found');
          const parsed = await cvParser.parseCV(cv.filePath);
          result = { parsed };
          break;
        }

        case 'ai_match': {
          const job = await Job.findById(task.payload.jobId);
          if (!job) throw new Error('Job not found');
          const profile = await Profile.findOne({ user: task.user });
          if (!profile) throw new Error('Profile not found');
          result = await matchCandidateWithJob(profile, job);
          break;
        }

        case 'resume_generation': {
          const job = await Job.findById(task.payload.jobId);
          if (!job) throw new Error('Job not found');
          const profile = await Profile.findOne({ user: task.user });
          if (!profile) throw new Error('Profile not found');
          const user = await User.findById(task.user);
          if (!user) throw new Error('User not found');
          const tailorResult = await tailorResumeForJob(user, profile, job);
          result = {
            tailoredResumeId: tailorResult.tailoredResume._id,
            pdfPath: tailorResult.tailoredResume.pdfPath,
            docxPath: tailorResult.tailoredResume.docxPath
          };
          break;
        }

        case 'application_prep': {
          // Placeholder — Phase 14 will implement full Application Adapters
          result = {
            message: 'Application package prepared.',
            jobId: task.payload.jobId
          };
          break;
        }

        case 'application_status_check': {
          // Placeholder — Phase 14 will implement status checking via adapters
          result = {
            message: 'Application status check queued for Phase 14 implementation.',
            jobId: task.payload.jobId
          };
          break;
        }

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      await WorkerTask.findByIdAndUpdate(task._id, {
        status: 'completed',
        result,
        progress: 100,
        completedAt: new Date()
      });

      logger.worker('task_completed', { taskId: task._id, type: task.type });
    } catch (err) {
      logger.error('[WORKER] task_failed', { taskId: task._id, type: task.type, error: err.message });
      await WorkerTask.findByIdAndUpdate(task._id, {
        status: 'failed',
        error: err.message,
        completedAt: new Date()
      });
    }
  }

  /**
   * Enqueue a new background task
   */
  async enqueue(type, payload = {}, userId = null) {
    const task = await WorkerTask.create({
      user: userId,
      type,
      payload,
      status: 'queued'
    });
    return task;
  }

  /**
   * Get status of a task
   */
  async getTask(taskId, userId) {
    return WorkerTask.findOne({ _id: taskId, user: userId });
  }

  /**
   * List recent tasks for a user
   */
  async listUserTasks(userId, limit = 20) {
    return WorkerTask.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = new BackgroundWorker();
