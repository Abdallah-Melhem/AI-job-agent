const adapterRegistry = require('../../adapters/adapterRegistry');
const JobAdapter = require('../../adapters/jobAdapter');

class DummyTestAdapter extends JobAdapter {
  constructor(config = {}) {
    super('dummy-source', config);
  }

  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: 'Dummy Source',
      description: 'Used for unit testing adapter registry',
      isRealSource: false,
      config: { ...this.config }
    };
  }

  async search() {
    return [{ id: 'dummy-1', title: 'Dummy Developer' }];
  }

  normalize(raw) {
    return {
      source: this.sourceName,
      externalId: raw.id,
      title: raw.title,
      company: 'Dummy Co',
      type: 'full-time',
      status: 'active'
    };
  }
}

describe('adapterRegistry', () => {
  let dummy;

  beforeAll(() => {
    dummy = new DummyTestAdapter({ timeout: 5000 });
    adapterRegistry.register(dummy);
  });

  afterAll(() => {
    adapterRegistry.unregister('dummy-source');
  });

  test('lists registered sources including dummy', () => {
    const sources = adapterRegistry.listSources();
    expect(sources).toContain('dummy-source');
  });

  test('retrieves adapter by name', () => {
    const retrieved = adapterRegistry.get('dummy-source');
    expect(retrieved).toBe(dummy);
  });

  test('returns metadata for a source', () => {
    const meta = adapterRegistry.getMetadata('dummy-source');
    expect(meta).toBeTruthy();
    expect(meta.displayName).toBe('Dummy Source');
    expect(meta.config.timeout).toBe(5000);
  });

  test('updates adapter configuration', () => {
    const updated = adapterRegistry.configure('dummy-source', { timeout: 9000 });
    expect(updated.config.timeout).toBe(9000);
    expect(dummy.config.timeout).toBe(9000);
  });

  test('getAllMetadata returns metadata array for all adapters', () => {
    const all = adapterRegistry.getAllMetadata();
    expect(Array.isArray(all)).toBe(true);
    expect(all.some(m => m.sourceName === 'dummy-source')).toBe(true);
  });
});
