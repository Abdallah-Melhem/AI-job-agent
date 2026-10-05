const mockApplicationAdapter = require('./mockApplicationAdapter');

class ApplicationRegistry {
  constructor() {
    this.adapters = new Map();
  }

  register(adapter) {
    this.adapters.set(adapter.name, adapter);
  }

  get(name) {
    return this.adapters.get(name);
  }

  listAdapters() {
    return Array.from(this.adapters.values()).map(adapter => ({
      name: adapter.name,
      supportsPrepare: adapter.supportsPrepare,
      supportsFill: adapter.supportsFill,
      supportsSubmit: adapter.supportsSubmit,
      supportsGetStatus: adapter.supportsGetStatus
    }));
  }
}

const registry = new ApplicationRegistry();
registry.register(mockApplicationAdapter);
// Future adapters (e.g., workday, greenhouse, email) can be registered here.

module.exports = registry;
