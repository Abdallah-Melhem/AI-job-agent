const MockAdapter = require('../../adapters/mockAdapter');

const adapter = new MockAdapter();

describe('MockAdapter — normalize()', () => {
  const rawJob = {
    id: 'mock-001',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'New York, NY',
    type: 'full-time',
    remote: 'hybrid',
    description: 'We are looking for a skilled frontend developer.',
    requirements: ['2+ years React experience'],
    skills: ['React', 'TypeScript'],
    salary: { min: 70000, max: 95000, currency: 'USD', period: 'yearly' },
    url: 'https://example.com/jobs/mock-001',
    postedAt: new Date()
  };

  let normalized;

  beforeAll(() => {
    normalized = adapter.normalize(rawJob);
  });

  test('sets source to "mock"', () => {
    expect(normalized.source).toBe('mock');
  });

  test('maps externalId from id', () => {
    expect(normalized.externalId).toBe('mock-001');
  });

  test('preserves title', () => {
    expect(normalized.title).toBe('Frontend Developer');
  });

  test('preserves company', () => {
    expect(normalized.company).toBe('TechCorp');
  });

  test('preserves skills array', () => {
    expect(normalized.skills).toContain('React');
    expect(normalized.skills).toContain('TypeScript');
  });

  test('preserves salary', () => {
    expect(normalized.salary.min).toBe(70000);
    expect(normalized.salary.currency).toBe('USD');
  });
});

describe('MockAdapter — search()', () => {
  test('returns all jobs with no query', async () => {
    const jobs = await adapter.search();
    expect(jobs.length).toBe(5);
  });

  test('filters by keyword', async () => {
    const jobs = await adapter.search({ keyword: 'react' });
    expect(jobs.length).toBeGreaterThan(0);
    jobs.forEach(j => {
      const haystack = `${j.title} ${j.company} ${j.description} ${j.skills.join(' ')}`.toLowerCase();
      expect(haystack).toContain('react');
    });
  });

  test('filters by type', async () => {
    const jobs = await adapter.search({ type: 'internship' });
    expect(jobs.length).toBeGreaterThan(0);
    jobs.forEach(j => expect(j.type).toBe('internship'));
  });

  test('filters by remote', async () => {
    const jobs = await adapter.search({ remote: 'remote' });
    expect(jobs.length).toBeGreaterThan(0);
    jobs.forEach(j => expect(j.remote).toBe('remote'));
  });

  test('returns empty for non-existent keyword', async () => {
    const jobs = await adapter.search({ keyword: 'xyznonexistentskill99' });
    expect(jobs.length).toBe(0);
  });
});

describe('MockAdapter — getJob()', () => {
  test('returns the correct job by id', async () => {
    const job = await adapter.getJob('mock-002');
    expect(job).toBeTruthy();
    expect(job.id).toBe('mock-002');
    expect(job.title).toBe('Backend Engineer');
  });

  test('returns null for unknown id', async () => {
    const job = await adapter.getJob('does-not-exist');
    expect(job).toBeNull();
  });
});
