const Application = require('../models/Application');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const CV = require('../models/CV');
const TailoredResume = require('../models/TailoredResume');
const applicationRegistry = require('../adapters/application/applicationRegistry');
const logger = require('../utils/logger');
const { STATE_TRANSITIONS } = require('../models/Application');

// ─── Read ────────────────────────────────────────────────────────────────────

const getApplications = async (userId, { status } = {}) => {
  const query = { user: userId };
  if (status) query.status = status;
  return Application.find(query)
    .populate('job', 'title company location remote type salary source url')
    .populate('tailoredResume', 'summary skills isTruthful isAtsCompliant')
    .sort({ updatedAt: -1 });
};

const getApplicationById = async (userId, appId) => {
  return Application.findOne({ _id: appId, user: userId })
    .populate('job')
    .populate('tailoredResume');
};

const getApplicationForJob = async (userId, jobId) => {
  return Application.findOne({ user: userId, job: jobId })
    .populate('job')
    .populate('tailoredResume');
};

// ─── Create / Upsert ─────────────────────────────────────────────────────────

/**
 * Track a job — creates an application record in 'discovered' state if none exists.
 * If already tracked, returns existing record.
 */
const trackJob = async (userId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  let app = await Application.findOne({ user: userId, job: jobId });
  if (app) return app; // already tracked

  app = new Application({
    user: userId,
    job: jobId,
    status: 'discovered',
    logs: [{ message: 'Job discovered and tracking started', level: 'info' }]
  });
  await app.save();
  logger.info(`[APPLICATION] tracked user=${userId} job=${jobId}`);
  return app;
};

// ─── Status Transitions ──────────────────────────────────────────────────────

/**
 * Transition an application to a new status.
 * @param {string} userId
 * @param {string} appId   - application document _id
 * @param {string} newStatus
 * @param {string} [message]  - optional log message
 */
const updateStatus = async (userId, appId, newStatus, message) => {
  const app = await Application.findOne({ _id: appId, user: userId });
  if (!app) throw new Error('Application not found');

  const result = app.transitionTo(newStatus, message);
  if (!result.ok) throw new Error(result.error);

  await app.save();
  logger.info(`[APPLICATION] status_change user=${userId} app=${appId} → ${newStatus}`);
  return app;
};

// ─── Update Fields ───────────────────────────────────────────────────────────

/**
 * Update mutable metadata fields: notes, source, applicationUrl, tailoredResume
 */
const updateApplication = async (userId, appId, updates) => {
  const ALLOWED = ['notes', 'source', 'applicationUrl', 'tailoredResume'];
  const app = await Application.findOne({ _id: appId, user: userId });
  if (!app) throw new Error('Application not found');

  for (const key of ALLOWED) {
    if (updates[key] !== undefined) {
      app[key] = updates[key];
    }
  }
  app.logs.push({ message: 'Application details updated', level: 'info' });
  await app.save();
  return app;
};

/**
 * Add a manual note to the application log
 */
const addNote = async (userId, appId, note) => {
  if (!note || typeof note !== 'string' || !note.trim()) {
    throw new Error('Note must be a non-empty string');
  }
  const app = await Application.findOne({ _id: appId, user: userId });
  if (!app) throw new Error('Application not found');

  app.notes = app.notes ? `${app.notes}\n---\n${note.trim()}` : note.trim();
  app.logs.push({ message: `Note added: ${note.trim().slice(0, 80)}`, level: 'info' });
  await app.save();
  return app;
};

// ─── Delete ──────────────────────────────────────────────────────────────────

const deleteApplication = async (userId, appId) => {
  const app = await Application.findOneAndDelete({ _id: appId, user: userId });
  if (!app) throw new Error('Application not found');
  logger.info(`[APPLICATION] deleted user=${userId} app=${appId}`);
  return { deleted: true };
};

// ─── Preparation Flow (legacy-compatible, now maps to new states) ─────────────

const getAdapterForJob = (job) => {
  let adapter = applicationRegistry.get(job.source);
  if (!adapter) adapter = applicationRegistry.get('mock');
  return adapter;
};

const prepareApplication = async (userId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  const adapter = getAdapterForJob(job);
  if (!adapter.supportsPrepare) {
    throw new Error(`Adapter ${adapter.name} does not support automated preparation`);
  }

  const prepData = await adapter.prepare(job, { _id: userId });

  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) {
    app = new Application({
      user: userId,
      job: jobId,
      adapterName: adapter.name,
      status: 'preparing',
      data: { preparation: prepData },
      logs: [{ message: 'Application preparation started', fromStatus: null, toStatus: 'preparing' }]
    });
  } else {
    // Move to preparing state
    if (['discovered', 'saved', 'preparing'].includes(app.status)) {
      const old = app.status;
      app.status = 'preparing';
      if (!app.preparingAt) app.preparingAt = new Date();
      app.data = { ...app.data, preparation: prepData };
      app.adapterName = adapter.name;
      app.logs.push({ message: 'Application re-prepared', fromStatus: old, toStatus: 'preparing' });
    }
  }

  await app.save();
  logger.info(`[APPLICATION] prepare_success user=${userId} job=${jobId} adapter=${adapter.name}`);
  return app;
};

const fillApplication = async (userId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new Error('Profile not found. Please complete profile first.');

  const user = { _id: userId, email: 'placeholder@email.com' };

  // Get best CV: tailored first, then standard
  let cv = await TailoredResume.findOne({ user: userId, job: jobId });
  if (!cv) cv = await CV.findOne({ user: userId }).sort({ createdAt: -1 });

  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Must prepare application before filling');

  const adapter = applicationRegistry.get(app.adapterName);
  if (!adapter.supportsFill) throw new Error('Adapter does not support automated filling');

  const filledData = await adapter.fill(job, user, profile, cv);

  app.data = { ...app.data, filled: filledData };
  // Move to ready_for_review — requires explicit user confirmation to proceed to applied
  const old = app.status;
  app.status = 'ready_for_review';
  if (!app.readyForReviewAt) app.readyForReviewAt = new Date();
  app.logs.push({
    message: 'Application auto-filled by agent — awaiting user review',
    fromStatus: old,
    toStatus: 'ready_for_review'
  });

  await app.save();
  logger.info(`[APPLICATION] fill_success user=${userId} job=${jobId} status=ready_for_review`);
  return app;
};

/**
 * Mark application as Applied — requires explicit user action.
 * Does NOT perform automated external submission.
 */
const submitApplication = async (userId, jobId) => {
  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Application not found');
  if (app.status !== 'ready_for_review') {
    throw new Error(`Application status is '${app.status}', expected 'ready_for_review'`);
  }

  const job = await Job.findById(jobId);
  const adapter = applicationRegistry.get(app.adapterName);

  let externalResult = null;
  if (adapter && adapter.supportsSubmit) {
    // Only submit via adapter if it explicitly supports it
    logger.info(`[APPLICATION] submit_started user=${userId} job=${jobId} adapter=${adapter.name}`);
    try {
      externalResult = await adapter.submit(job, app.data.filled);
      app.externalId = externalResult.externalId || null;
    } catch (error) {
      app.logs.push({ message: `External submission failed: ${error.message}`, level: 'error' });
      await app.save();
      logger.error(`[APPLICATION] submit_failed user=${userId} job=${jobId} error="${error.message}"`, { stack: error.stack });
      throw error;
    }
  }

  // Transition to 'applied' — user confirmed
  app.status = 'applied';
  if (!app.appliedAt) app.appliedAt = new Date();
  app.logs.push({
    message: externalResult
      ? `Successfully submitted externally: ${externalResult.message}`
      : 'Marked as Applied by user',
    fromStatus: 'ready_for_review',
    toStatus: 'applied'
  });

  await app.save();
  logger.info(`[APPLICATION] applied user=${userId} job=${jobId}`);
  return app;
};

const checkStatus = async (userId, jobId) => {
  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Application not found');
  if (!app.externalId) throw new Error('No external ID to check status against');

  const adapter = applicationRegistry.get(app.adapterName);
  if (!adapter.supportsGetStatus) throw new Error('Adapter does not support status checking');

  const status = await adapter.getStatus(app.externalId);
  if (app.status !== status) {
    app.logs.push({ message: `Status updated from ${app.status} to ${status}` });
    app.status = status;
    await app.save();
  }
  return app;
};

// ─── Stats ───────────────────────────────────────────────────────────────────

const getApplicationStats = async (userId) => {
  const results = await Application.aggregate([
    { $match: { user: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const stats = {};
  for (const r of results) stats[r._id] = r.count;
  return {
    total: Object.values(stats).reduce((a, b) => a + b, 0),
    byStatus: stats
  };
};

module.exports = {
  getApplications,
  getApplicationById,
  getApplicationForJob,
  trackJob,
  updateStatus,
  updateApplication,
  addNote,
  deleteApplication,
  prepareApplication,
  fillApplication,
  submitApplication,
  checkStatus,
  getApplicationStats
};
