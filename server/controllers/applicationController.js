const applicationService = require('../services/applicationService');

// ─── Read ────────────────────────────────────────────────────────────────────

exports.getApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const apps = await applicationService.getApplications(req.user._id, { status });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const app = await applicationService.getApplicationById(req.user._id, req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json(app);
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

exports.getApplicationStats = async (req, res) => {
  try {
    const stats = await applicationService.getApplicationStats(req.user._id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Create / Track ──────────────────────────────────────────────────────────

exports.trackJob = async (req, res) => {
  try {
    const app = await applicationService.trackJob(req.user._id, req.params.jobId);
    res.status(200).json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Status Transition ───────────────────────────────────────────────────────

exports.updateStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });
    const app = await applicationService.updateStatus(req.user._id, req.params.id, status, message);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Update Fields ───────────────────────────────────────────────────────────

exports.updateApplication = async (req, res) => {
  try {
    const app = await applicationService.updateApplication(req.user._id, req.params.id, req.body);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { note } = req.body;
    const app = await applicationService.addNote(req.user._id, req.params.id, note);
    res.json(app);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Delete ──────────────────────────────────────────────────────────────────

exports.deleteApplication = async (req, res) => {
  try {
    const result = await applicationService.deleteApplication(req.user._id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Preparation Flow ────────────────────────────────────────────────────────

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
