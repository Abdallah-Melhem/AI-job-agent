const composioProvider = require('./providers/composioProvider');

class IntegrationRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.name, provider);
  }

  get(name) {
    return this.providers.get(name);
  }

  listProviders() {
    return Array.from(this.providers.keys());
  }
}

const registry = new IntegrationRegistry();
registry.register(composioProvider);

module.exports = registry;
