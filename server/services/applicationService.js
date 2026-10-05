const Application = require('../models/Application');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const CV = require('../models/CV');
const TailoredResume = require('../models/TailoredResume');
const applicationRegistry = require('../adapters/application/applicationRegistry');
const logger = require('../utils/logger');

const getApplicationForJob = async (userId, jobId) => {
  return Application.findOne({ user: userId, job: jobId });
};

const getApplications = async (userId) => {
  return Application.find({ user: userId }).populate('job').sort({ updatedAt: -1 });
};

const getAdapterForJob = (job) => {
  // Simple heuristic: if job source matches an adapter name, use it. Otherwise use 'mock'
  let adapter = applicationRegistry.get(job.source);
  if (!adapter) {
    adapter = applicationRegistry.get('mock');
  }
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
      status: 'prepared',
      data: { preparation: prepData },
      logs: [{ message: 'Application prepared' }]
    });
  } else {
    app.status = 'prepared';
    app.data = { ...app.data, preparation: prepData };
    app.logs.push({ message: 'Application re-prepared' });
  }

  await app.save();
  logger.application(userId, jobId, 'prepare_success', { adapter: adapter.name });
  return app;
};

const fillApplication = async (userId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new Error('Profile not found. Please complete profile first.');

  const user = { _id: userId, email: 'placeholder@email.com' }; // Should fetch user from DB if needed, but assuming middleware provides it or we fetch real user.

  // Get best CV: tailored first, then standard
  let cv = await TailoredResume.findOne({ user: userId, job: jobId });
  if (!cv) {
    cv = await CV.findOne({ user: userId }).sort({ createdAt: -1 });
  }

  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Must prepare application before filling');

  const adapter = applicationRegistry.get(app.adapterName);
  if (!adapter.supportsFill) throw new Error(`Adapter does not support automated filling`);

  const filledData = await adapter.fill(job, user, profile, cv);
  
  app.data = { ...app.data, filled: filledData };
  app.status = 'ready_to_submit';
  app.logs.push({ message: 'Application auto-filled by agent' });
  
  await app.save();
  logger.application(userId, jobId, 'fill_success', { status: 'ready_to_submit' });
  return app;
};

const submitApplication = async (userId, jobId) => {
  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Application not found');
  if (app.status !== 'ready_to_submit') throw new Error(`Application status is ${app.status}, expected ready_to_submit`);

  const job = await Job.findById(jobId);
  const adapter = applicationRegistry.get(app.adapterName);
  
  if (!adapter.supportsSubmit) throw new Error(`Adapter does not support automated submission`);

  logger.application(userId, jobId, 'submit_started', { adapter: adapter.name });

  try {
    const result = await adapter.submit(job, app.data.filled);
    app.status = 'submitted';
    app.externalId = result.externalId || null;
    app.appliedAt = new Date();
    app.logs.push({ message: `Successfully submitted: ${result.message}` });
    logger.application(userId, jobId, 'submit_success', { externalId: result.externalId });
  } catch (error) {
    app.status = 'failed';
    app.logs.push({ message: `Submission failed: ${error.message}`, level: 'error' });
    await app.save();
    logger.error(`[APPLICATION] submit_failed user=${userId} job=${jobId} error="${error.message}"`, { stack: error.stack });
    throw error;
  }

  await app.save();
  return app;
};

const checkStatus = async (userId, jobId) => {
  let app = await Application.findOne({ user: userId, job: jobId });
  if (!app) throw new Error('Application not found');
  if (!app.externalId) throw new Error('No external ID to check status against');

  const adapter = applicationRegistry.get(app.adapterName);
  if (!adapter.supportsGetStatus) throw new Error(`Adapter does not support status checking`);

  const status = await adapter.getStatus(app.externalId);
  
  // if status changed, log it
  if (app.status !== status) {
    app.logs.push({ message: `Status updated from ${app.status} to ${status}` });
    app.status = status;
    await app.save();
  }

  return app;
};

module.exports = {
  getApplications,
  getApplicationForJob,
  prepareApplication,
  fillApplication,
  submitApplication,
  checkStatus
};
