const MockAdapter = require('./mockAdapter');
const RemoteOkAdapter = require('./remoteOkAdapter');
const ArbeitnowAdapter = require('./arbeitnowAdapter');
const jobService = require('../services/jobService');

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }

  register(adapter) {
    this.adapters.set(adapter.sourceName, adapter);
  }

  get(sourceName) {
    return this.adapters.get(sourceName) || null;
  }

  listSources() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Import jobs from all or selected sources into the database
   */
  async importJobs(source = 'all', query = {}) {
    let targets = [];

    if (source && source !== 'all') {
      const adapter = this.get(source);
      if (adapter) targets.push(adapter);
    } else {
      targets = Array.from(this.adapters.values());
    }

    const importResults = [];
    for (const adapter of targets) {
      try {
        const res = await jobService.importFromAdapter(adapter, query);
        importResults.push({ source: adapter.sourceName, ...res });
      } catch (err) {
        console.warn(`Failed to import from source ${adapter.sourceName}:`, err.message);
      }
    }

    return importResults;
  }

  registerDefaults() {
    this.register(new MockAdapter());
    this.register(new RemoteOkAdapter());
    this.register(new ArbeitnowAdapter());
  }
}

module.exports = new AdapterRegistry();
