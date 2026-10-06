const Job = require('../models/Job');

/**
 * JobDeduplicator
 *
 * Handles deduplication logic for imported jobs both in-memory and against MongoDB.
 *
 * Rules:
 *  1. Primary key: compound (source + externalId)
 *  2. Secondary key: exact match on sourceUrl or url from the same source
 *  3. In-batch deduplication: filter duplicates that appear multiple times in one API response
 */
class JobDeduplicator {
  /**
   * Deduplicate an array of normalized jobs in memory before persisting.
   *
   * @param {object[]} jobs - array of normalized job objects
   * @returns {object[]} unique jobs in batch
   */
  deduplicateBatch(jobs) {
    if (!Array.isArray(jobs)) return [];

    const seenIds = new Set();
    const unique = [];

    for (const job of jobs) {
      if (!job || !job.source || !job.externalId) continue;

      const key = `${job.source}:${String(job.externalId).trim().toLowerCase()}`;
      if (seenIds.has(key)) {
        continue;
      }
      seenIds.add(key);
      unique.push(job);
    }

    return unique;
  }

  /**
   * Check if a job already exists in the database.
   *
   * @param {object} job - normalized job object
   * @returns {Promise<Job|null>} existing Job document if found, else null
   */
  async findExisting(job) {
    if (!job || !job.source || !job.externalId) return null;

    // 1. Primary check: (source, externalId)
    const existing = await Job.findOne({
      source: job.source,
      externalId: String(job.externalId)
    });

    if (existing) return existing;

    // 2. Secondary check: identical sourceUrl or url from the same source
    const targetUrl = job.sourceUrl || job.url;
    if (targetUrl) {
      const existingByUrl = await Job.findOne({
        source: job.source,
        $or: [{ sourceUrl: targetUrl }, { url: targetUrl }]
      });
      if (existingByUrl) return existingByUrl;
    }

    return null;
  }
}

module.exports = new JobDeduplicator();
