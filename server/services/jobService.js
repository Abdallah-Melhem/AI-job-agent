const Job = require('../models/Job');
const logger = require('../utils/logger');
const { validateJob } = require('../adapters/jobValidator');
const jobDeduplicator = require('../adapters/jobDeduplicator');

/**
 * Job Service
 *
 * Centralised logic for:
 *  • searching (from DB)
 *  • importing from adapters (with normalization, validation & deduplication)
 *  • saving / un-saving jobs for a user
 */

class JobService {
  /**
   * Import jobs from an adapter into the database.
   *
   * Flow:
   *  1. Fetch raw jobs via adapter
   *  2. Normalize each job
   *  3. In-memory batch deduplication
   *  4. Validate normalized job
   *  5. Database deduplication check
   *  6. Insert into database
   *
   * @param {import('../adapters/jobAdapter')} adapter
   * @param {object} query - search parameters forwarded to the adapter
   * @returns {{ imported: number, skipped: number, invalid: number, total: number, jobs: object[] }}
   */
  async importFromAdapter(adapter, query = {}) {
    const rawJobs = adapter.fetchJobs 
      ? await adapter.fetchJobs(query) 
      : await adapter.search(query);

    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      return { imported: 0, skipped: 0, invalid: 0, total: 0, jobs: [] };
    }

    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    const jobs = [];

    // 1. Normalize raw jobs
    const normalizedList = [];
    for (const raw of rawJobs) {
      try {
        const item = adapter.normalizeJob ? adapter.normalizeJob(raw) : adapter.normalize(raw);
        if (item) normalizedList.push(item);
      } catch (err) {
        invalid++;
        logger.job('job_normalization_failed', {
          source: adapter.sourceName,
          error: err.message
        });
      }
    }

    // 2. In-memory batch deduplication (prevent duplicates in the same response)
    const uniqueBatch = jobDeduplicator.deduplicateBatch(normalizedList);
    skipped += (normalizedList.length - uniqueBatch.length);

    // 3. Validate and persist each job
    for (const jobData of uniqueBatch) {
      // Ensure sourceUrl, url, timestamps, and status are consistent
      if (!jobData.sourceUrl && jobData.url) jobData.sourceUrl = jobData.url;
      if (!jobData.url && jobData.sourceUrl) jobData.url = jobData.sourceUrl;
      if (!jobData.importedAt) jobData.importedAt = new Date();
      if (!jobData.status) jobData.status = 'active';

      // Schema validation
      const validation = validateJob(jobData);
      if (!validation.valid) {
        invalid++;
        logger.job('job_validation_failed', {
          source: adapter.sourceName,
          externalId: jobData.externalId,
          errors: validation.errors
        });
        continue;
      }

      try {
        // Database deduplication check
        const existing = await jobDeduplicator.findExisting(jobData);

        if (existing) {
          skipped++;
          jobs.push(existing);
        } else {
          const newJob = await Job.create(jobData);
          imported++;
          jobs.push(newJob);
        }
      } catch (err) {
        // E11000 duplicate key → skip safely
        if (err.code === 11000) {
          skipped++;
        } else {
          logger.error(`[JobService] Error persisting job ${jobData.externalId}: ${err.message}`);
          throw err;
        }
      }
    }

    logger.job('adapter_import_completed', {
      source: adapter.sourceName || adapter.name,
      imported,
      skipped,
      invalid,
      total: rawJobs.length
    });

    return { imported, skipped, invalid, total: rawJobs.length, jobs };
  }

  /**
   * Search jobs already stored in the database with optional filters.
   */
  async searchJobs(filters = {}) {
    const query = {};

    // Filter by source: isolate fake jobs by excluding 'mock' by default
    if (filters.source && filters.source !== 'all') {
      query.source = filters.source;
    } else {
      query.source = { $ne: 'mock' };
    }

    // Default to active jobs (or legacy records without a status field)
    if (filters.status) {
      query.status = filters.status;
    } else {
      query.$or = [{ status: 'active' }, { status: { $exists: false } }];
    }

    // Full-text keyword search
    const isTextSearch = Boolean(filters.keyword && filters.keyword.trim());
    if (isTextSearch) {
      query.$text = { $search: filters.keyword.trim() };
    }

    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }

    if (filters.subcategory) {
      query.subcategory = { $regex: filters.subcategory, $options: 'i' };
    }

    if (filters.company) {
      query.company = { $regex: filters.company, $options: 'i' };
    }

    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }

    if (filters.remote && filters.remote !== 'all') {
      query.remote = filters.remote;
    }

    if (filters.experienceLevel && filters.experienceLevel !== 'all') {
      query.experienceLevel = filters.experienceLevel;
    }

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.country && filters.country !== 'all') {
      query.country = { $regex: filters.country, $options: 'i' };
    }

    // Salary filters
    if (filters.minSalary || filters.maxSalary) {
      const salaryClause = {};
      if (filters.minSalary) salaryClause.$gte = Number(filters.minSalary);
      if (filters.maxSalary) salaryClause.$lte = Number(filters.maxSalary);
      query['salary.min'] = salaryClause;
    }

    if (filters.currency) {
      query['salary.currency'] = String(filters.currency).toUpperCase();
    }

    if (filters.postedAfter) {
      query.postedAt = { $gte: new Date(filters.postedAfter) };
    }

    // Sorting
    let sortOptions = { postedAt: -1 };
    let projection = null;

    if (filters.sortBy === 'relevance' && isTextSearch) {
      projection = { score: { $meta: 'textScore' } };
      sortOptions = { score: { $meta: 'textScore' } };
    } else if (filters.sortBy === 'salary-desc' || filters.sortBy === 'salary') {
      sortOptions = { 'salary.max': -1, 'salary.min': -1, postedAt: -1 };
    } else if (filters.sortBy === 'salary-asc') {
      sortOptions = { 'salary.min': 1, postedAt: -1 };
    } else if (filters.sortBy === 'oldest') {
      sortOptions = { postedAt: 1 };
    } else {
      sortOptions = { postedAt: -1 };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const findQuery = Job.find(query, projection).sort(sortOptions).skip(skip).limit(limit);

    const [jobs, total] = await Promise.all([
      findQuery.exec(),
      Job.countDocuments(query)
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get all standardized categories.
   */
  async getCategories() {
    const { CATEGORY_LIST } = require('../adapters/categoryNormalizer');
    return CATEGORY_LIST;
  }

  /**
   * Toggle save/un-save a job for a user.
   */
  async toggleSave(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const idx = job.savedBy.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) {
      job.savedBy.push(userId);
    } else {
      job.savedBy.splice(idx, 1);
    }
    await job.save();
    return job;
  }

  /**
   * Get jobs saved by a specific user.
   */
  async getSavedJobs(userId) {
    return Job.find({ savedBy: userId }).sort({ postedAt: -1 });
  }
}

module.exports = new JobService();
