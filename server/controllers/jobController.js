const jobService = require('../services/jobService');
const adapterRegistry = require('../adapters/adapterRegistry');
const logger = require('../utils/logger');

/**
 * @desc    Search & import jobs from adapters, then return from DB
 * @route   GET /api/jobs/search
 * @access  Private
 */
const searchJobs = async (req, res) => {
  try {
    const {
      keyword,
      type,
      remote,
      location,
      country,
      source,
      category,
      subcategory,
      experienceLevel,
      company,
      minSalary,
      maxSalary,
      currency,
      postedAfter,
      sortBy,
      page,
      limit
    } = req.query;

    // Import from selected adapter or all registered adapters
    await adapterRegistry.importJobs(source || 'all', { keyword, type, remote, location, category });

    // Then search from DB with all combined filters and sorting
    const result = await jobService.searchJobs({
      keyword, 
      type, 
      remote, 
      location,
      country,
      category: (category && category !== 'all') ? category : undefined,
      subcategory,
      experienceLevel: (experienceLevel && experienceLevel !== 'all') ? experienceLevel : undefined,
      company,
      source: (source && source !== 'all') ? source : undefined, 
      minSalary,
      maxSalary,
      currency,
      postedAfter,
      sortBy,
      page, 
      limit
    });

    res.json(result);
  } catch (error) {
    logger.error(`[JOB] Job search error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get list of available job sources
 * @route   GET /api/jobs/sources
 * @access  Private
 */
const getSources = (req, res) => {
  res.json({
    success: true,
    sources: ['all', ...adapterRegistry.listSources()],
    details: adapterRegistry.getAllMetadata()
  });
};

/**
 * @desc    Get a single job by ID
 * @route   GET /api/jobs/:id
 * @access  Private
 */
const getJob = async (req, res) => {
  try {
    const Job = require('../models/Job');
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Toggle save / un-save a job for the authenticated user
 * @route   POST /api/jobs/:id/save
 * @access  Private
 */
const toggleSaveJob = async (req, res) => {
  try {
    const job = await jobService.toggleSave(req.params.id, req.user._id);
    const saved = job.savedBy.some(id => id.toString() === req.user._id.toString());
    res.json({ saved, job });
  } catch (error) {
    res.status(error.message === 'Job not found' ? 404 : 500).json({ message: error.message });
  }
};

/**
 * @desc    Get saved jobs for the authenticated user
 * @route   GET /api/jobs/saved
 * @access  Private
 */
const getSavedJobs = async (req, res) => {
  try {
    const jobs = await jobService.getSavedJobs(req.user._id);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const Profile = require('../models/Profile');
const Job = require('../models/Job');
const TailoredResume = require('../models/TailoredResume');
const { matchCandidateWithJob } = require('../services/matchingService');
const { tailorResumeForJob } = require('../services/tailoringService');

/**
 * @desc    Match candidate profile with a specific job using AI analysis
 * @route   POST /api/jobs/:id/match
 * @access  Private
 */
const matchJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Fetch candidate profile
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(400).json({ 
        message: 'Please complete your Candidate Profile or upload a CV first before matching.' 
      });
    }

    const matchResult = await matchCandidateWithJob(profile, job);
    res.json({
      success: true,
      jobId: job._id,
      jobTitle: job.title,
      company: job.company,
      match: matchResult
    });
  } catch (error) {
    logger.error(`[JOB] Job matching error: ${error.message}`);
    res.status(500).json({ message: error.message || 'Failed to analyze job match' });
  }
};

/**
 * @desc    Tailor resume for a specific job application
 * @route   POST /api/jobs/:id/tailor
 * @access  Private
 */
const tailorResume = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(400).json({
        message: 'Please complete your Candidate Profile or upload a CV first before tailoring.'
      });
    }

    const result = await tailorResumeForJob(req.user, profile, job);
    res.json({
      success: true,
      tailoredResume: result.tailoredResume,
      validation: result.validation
    });
  } catch (error) {
    logger.error(`[JOB] Resume tailoring error: ${error.message}`);
    res.status(500).json({ message: error.message || 'Failed to tailor resume' });
  }
};

/**
 * @desc    Get tailored resume for a specific job
 * @route   GET /api/jobs/:id/tailor
 * @access  Private
 */
const getTailoredResume = async (req, res) => {
  try {
    const tailored = await TailoredResume.findOne({ user: req.user._id, job: req.params.id });
    res.json(tailored || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get list of standardized job categories
 * @route   GET /api/jobs/categories
 * @access  Private
 */
const getCategories = async (req, res) => {
  try {
    const categories = await jobService.getCategories();
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  searchJobs,
  getJob,
  toggleSaveJob,
  getSavedJobs,
  matchJob,
  tailorResume,
  getTailoredResume,
  getSources,
  getCategories
};

