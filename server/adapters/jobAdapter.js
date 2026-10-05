/**
 * Job Source Adapter – abstract base class.
 *
 * Every adapter must implement:
 *   search(query)  → raw results from the external source
 *   getJob(id)     → raw single job from the external source
 *   normalize(raw) → internal Job-compatible plain object
 */
class JobAdapter {
  constructor(sourceName) {
    if (!sourceName) throw new Error('Adapter must have a sourceName');
    this.sourceName = sourceName;
  }

  /** Search the external source. Returns an array of raw job objects. */
  async search(query) {
    throw new Error('search() not implemented');
  }

  /** Fetch a single raw job by its external ID. */
  async getJob(externalId) {
    throw new Error('getJob() not implemented');
  }

  /**
   * Convert one raw external job object into the internal normalised shape
   * that matches the Job mongoose schema.
   * Must include at least: { source, externalId, title, company }
   */
  normalize(rawJob) {
    throw new Error('normalize() not implemented');
  }
}

module.exports = JobAdapter;
