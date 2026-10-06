const MockAdapter = require('./mockAdapter');
const RemoteOkAdapter = require('./remoteOkAdapter');
const ArbeitnowAdapter = require('./arbeitnowAdapter');
const JobicyAdapter = require('./jobicyAdapter');
const jobService = require('../services/jobService');

/**
 * AdapterRegistry
 *
 * Central registry for job source adapters.
 *
 * Responsibilities:
 *  - Maintain registered adapters and their configs
 *  - Provide source metadata for frontend and agent tools
 *  - Orchestrate job discovery / import across single or all sources
 *  - Enforce error isolation: an error in one adapter never crashes the batch
 */
class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }

  /**
   * Register a new or replacement adapter instance.
   *
   * @param {import('./jobAdapter')} adapter
   */
  register(adapter) {
    if (!adapter || !adapter.sourceName) {
      throw new Error('Cannot register adapter without a valid sourceName');
    }
    this.adapters.set(adapter.sourceName, adapter);
  }

  /**
   * Unregister an adapter by sourceName.
   *
   * @param {string} sourceName
   * @returns {boolean} true if removed
   */
  unregister(sourceName) {
    return this.adapters.delete(sourceName);
  }

  /**
   * Get an adapter by sourceName.
   *
   * @param {string} sourceName
   * @returns {import('./jobAdapter')|null}
   */
  get(sourceName) {
    return this.adapters.get(sourceName) || null;
  }

  /**
   * List all registered source names.
   *
   * @returns {string[]}
   */
  listSources() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get metadata for a specific source.
   *
   * @param {string} sourceName
   * @returns {object|null}
   */
  getMetadata(sourceName) {
    const adapter = this.get(sourceName);
    return adapter ? adapter.getSourceMetadata() : null;
  }

  /**
   * Get metadata for all registered sources.
   *
   * @returns {object[]}
   */
  getAllMetadata() {
    const list = [];
    for (const adapter of this.adapters.values()) {
      list.push(adapter.getSourceMetadata());
    }
    return list;
  }

  /**
   * Update configuration for an existing adapter.
   *
   * @param {string} sourceName
   * @param {object} newConfig
   */
  configure(sourceName, newConfig = {}) {
    const adapter = this.get(sourceName);
    if (!adapter) throw new Error(`Adapter "${sourceName}" is not registered`);
    adapter.config = { ...adapter.config, ...newConfig };
    if (newConfig.apiUrl) adapter.apiUrl = newConfig.apiUrl;
    if (newConfig.timeout) adapter.timeout = newConfig.timeout;
    return adapter.getSourceMetadata();
  }

  /**
   * Import jobs from all or selected sources into the database.
   * Errors in any single adapter are isolated and do not crash the system.
   *
   * @param {string} source - 'all' or a specific sourceName
   * @param {object} query  - search/filter parameters passed to the adapters
   * @returns {Promise<object[]>} array of per-source import summaries
   */
  async importJobs(source = 'all', query = {}) {
    let targets = [];

    if (source && source !== 'all') {
      const adapter = this.get(source);
      if (adapter) {
        targets.push(adapter);
      } else {
        console.warn(`[AdapterRegistry] Requested unknown source: "${source}"`);
        return [{
          source,
          success: false,
          imported: 0,
          skipped: 0,
          errors: [`Unknown source "${source}"`],
          jobs: []
        }];
      }
    } else {
      targets = Array.from(this.adapters.values());
    }

    const importResults = [];
    for (const adapter of targets) {
      try {
        const res = await jobService.importFromAdapter(adapter, query);
        importResults.push({
          source: adapter.sourceName,
          success: true,
          ...res
        });
      } catch (err) {
        console.warn(`[AdapterRegistry] Source error for "${adapter.sourceName}":`, err.message);
        importResults.push({
          source: adapter.sourceName,
          success: false,
          imported: 0,
          skipped: 0,
          errors: [err.message],
          jobs: []
        });
      }
    }

    return importResults;
  }

  /**
   * Register default built-in adapters.
   */
  registerDefaults() {
    // Isolate mock data: only register MockAdapter when explicitly enabled via env flag (e.g. testing)
    if (process.env.ENABLE_MOCK_JOBS === 'true') {
      this.register(new MockAdapter());
    }
    this.register(new RemoteOkAdapter());
    this.register(new ArbeitnowAdapter());
    this.register(new JobicyAdapter());
  }
}

module.exports = new AdapterRegistry();
