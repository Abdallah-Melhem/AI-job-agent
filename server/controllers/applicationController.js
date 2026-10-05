const applicationService = require('../services/applicationService');

exports.getApplications = async (req, res) => {
  try {
    const apps = await applicationService.getApplications(req.user._id);
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getApplicationForJob = async (req, res) => {
  try {
    const app = await applicationService.getApplicationForJob(req.user._id, req.params.jobId);
    if (!app) return res.status(404).json({ message: 'Application not found for this job' });
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.prepareApplication = async (req, res) => {
  try {
    const app = await applicationService.prepareApplication(req.user._id, req.params.jobId);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.fillApplication = async (req, res) => {
  try {
    const app = await applicationService.fillApplication(req.user._id, req.params.jobId);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const app = await applicationService.submitApplication(req.user._id, req.params.jobId);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.checkStatus = async (req, res) => {
  try {
    const app = await applicationService.checkStatus(req.user._id, req.params.jobId);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
