const Job = require('../models/Job');
const logger = require('../utils/logger');

/**
 * Job Service
 *
 * Centralised logic for:
 *  • searching (from DB)
 *  • importing from adapters (with deduplication)
 *  • saving / un-saving jobs for a user
 */

class JobService {
  /**
   * Import jobs from an adapter into the database.
   * Duplicate (source + externalId) entries are skipped automatically
   * thanks to the compound unique index on the Job model.
   *
   * @param {import('../adapters/jobAdapter')} adapter
   * @param {object} query - search parameters forwarded to the adapter
   * @returns {{ imported: number, skipped: number, jobs: object[] }}
   */
  async importFromAdapter(adapter, query = {}) {
    const rawJobs = await adapter.search(query);
    let imported = 0;
    let skipped = 0;
    const jobs = [];

    for (const raw of rawJobs) {
      const normalised = adapter.normalize(raw);
      try {
        const job = await Job.findOneAndUpdate(
          { source: normalised.source, externalId: normalised.externalId },
          { $setOnInsert: normalised },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        // If createdAt and updatedAt are the same it was just inserted
        if (job.createdAt.getTime() === job.updatedAt.getTime()) {
          imported++;
        } else {
          skipped++;
        }
        jobs.push(job);
      } catch (err) {
        // E11000 duplicate key → skip silently
        if (err.code === 11000) {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    logger.job('adapter_import_completed', {
      source: adapter.name,
      imported,
      skipped,
      total: rawJobs.length
    });

    return { imported, skipped, jobs };
  }

  /**
   * Search jobs already stored in the database with optional filters.
   */
  async searchJobs(filters = {}) {
    const query = {};

    // Full-text keyword search
    if (filters.keyword) {
      query.$text = { $search: filters.keyword };
    }

    if (filters.type) query.type = filters.type;
    if (filters.remote) query.remote = filters.remote;

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.source) query.source = filters.source;

    if (filters.minSalary) {
      query['salary.min'] = { $gte: Number(filters.minSalary) };
    }

    if (filters.postedAfter) {
      query.postedAt = { $gte: new Date(filters.postedAfter) };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ postedAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(query)
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
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
