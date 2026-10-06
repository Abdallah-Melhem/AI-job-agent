const { validateJob } = require('./jobValidator');

/**
 * JobAdapter — abstract base class for all job source adapters.
 *
 * Implements the standard adapter interface defined in Phase 2:
 *   - fetchJobs(query)       → raw jobs from the external source
 *   - normalizeJob(rawJob)   → normalized Job plain object matching Mongoose schema
 *   - validateJob(job)       → validate schema compliance before persisting
 *   - getSourceMetadata()    → describe source capabilities and config
 *
 * Backward-compatible aliases:
 *   - search(query)          → aliases fetchJobs(query)
 *   - normalize(rawJob)      → aliases normalizeJob(rawJob)
 */
class JobAdapter {
  /**
   * @param {string} sourceName - unique identifier for this source (e.g. 'arbeitnow', 'remoteok')
   * @param {object} [config={}] - source-specific configuration (e.g. timeout, rate limits, custom URLs)
   */
  constructor(sourceName, config = {}) {
    if (!sourceName) throw new Error('Adapter must have a sourceName');
    this.sourceName = sourceName;
    this.config = config;
  }

  /**
   * Fetch raw jobs from the external source.
   *
   * @param {object} query - optional search filters
   * @returns {Promise<object[]>} raw job records from source
   */
  async fetchJobs(query = {}) {
    // If subclass implemented search() instead of fetchJobs(), invoke that
    return this.search(query);
  }

  /**
   * Backward-compatible search method.
   */
  async search(query = {}) {
    throw new Error(`${this.sourceName}: fetchJobs() / search() not implemented`);
  }

  /**
   * Fetch a single raw job by external ID.
   *
   * @param {string} externalId
   * @returns {Promise<object|null>}
   */
  async getJob(externalId) {
    throw new Error(`${this.sourceName}: getJob() not implemented`);
  }

  /**
   * Normalize a raw job object into internal Job schema shape.
   *
   * @param {object} rawJob
   * @returns {object} normalized job object
   */
  normalizeJob(rawJob) {
    return this.normalize(rawJob);
  }

  /**
   * Backward-compatible normalize method.
   */
  normalize(rawJob) {
    throw new Error(`${this.sourceName}: normalizeJob() / normalize() not implemented`);
  }

  /**
   * Validate a normalized job against schema requirements.
   *
   * @param {object} normalizedJob
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateJob(normalizedJob) {
    return validateJob(normalizedJob);
  }

  /**
   * Return metadata and source capabilities.
   *
   * @returns {{ sourceName: string, displayName: string, description: string, isRealSource: boolean, config: object }}
   */
  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: this.sourceName,
      description: 'Job source adapter',
      isRealSource: true,
      config: { ...this.config }
    };
  }
}

module.exports = JobAdapter;
