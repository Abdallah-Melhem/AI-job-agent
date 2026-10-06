const jobDeduplicator = require('../../adapters/jobDeduplicator');

describe('jobDeduplicator', () => {
  describe('deduplicateBatch', () => {
    test('filters out duplicate jobs by source and externalId', () => {
      const batch = [
        { source: 'remoteok', externalId: 'job-1', title: 'Developer 1' },
        { source: 'remoteok', externalId: 'job-1', title: 'Developer 1 Duplicate' },
        { source: 'remoteok', externalId: 'job-2', title: 'Developer 2' },
        { source: 'arbeitnow', externalId: 'job-1', title: 'Arbeitnow Job 1' } // different source, same id -> kept
      ];

      const deduplicated = jobDeduplicator.deduplicateBatch(batch);
      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(j => `${j.source}:${j.externalId}`)).toEqual([
        'remoteok:job-1',
        'remoteok:job-2',
        'arbeitnow:job-1'
      ]);
    });

    test('handles empty or non-array input', () => {
      expect(jobDeduplicator.deduplicateBatch([])).toEqual([]);
      expect(jobDeduplicator.deduplicateBatch(null)).toEqual([]);
    });

    test('ignores items missing required fields', () => {
      const batch = [
        { source: 'remoteok' },
        { externalId: '123' },
        null,
        { source: 'remoteok', externalId: 'valid-1', title: 'Valid' }
      ];

      const deduplicated = jobDeduplicator.deduplicateBatch(batch);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].externalId).toBe('valid-1');
    });
  });
});
