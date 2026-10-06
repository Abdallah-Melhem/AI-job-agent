const JobicyAdapter = require('../../adapters/jobicyAdapter');

describe('JobicyAdapter', () => {
  const adapter = new JobicyAdapter();

  test('has correct sourceName and metadata', () => {
    expect(adapter.sourceName).toBe('jobicy');
    const meta = adapter.getSourceMetadata();
    expect(meta.sourceName).toBe('jobicy');
    expect(meta.displayName).toBe('Jobicy');
    expect(meta.isRealSource).toBe(true);
    expect(meta.apiUrl).toContain('jobicy.com');
  });

  test('normalizes raw Jobicy job payload properly', () => {
    const rawJob = {
      id: 998877,
      url: 'https://jobicy.com/jobs/998877-sales-manager',
      jobTitle: 'Sales Manager - EMEA',
      companyName: 'Global Solutions Ltd',
      jobGeo: 'Remote, Europe',
      jobIndustry: ['Sales'],
      jobType: ['full-time'],
      jobDescription: '<p>Lead our enterprise <strong>sales team</strong> across EMEA.</p>',
      salaryMin: 90000,
      salaryMax: 120000,
      salaryCurrency: 'EUR',
      salaryPeriod: 'yearly',
      pubDate: '2026-10-05T12:00:00Z'
    };

    const normalized = adapter.normalize(rawJob);

    expect(normalized.source).toBe('jobicy');
    expect(normalized.externalId).toBe('998877');
    expect(normalized.title).toBe('Sales Manager - EMEA');
    expect(normalized.company).toBe('Global Solutions Ltd');
    expect(normalized.location).toBe('Remote, Europe');
    expect(normalized.category).toBe('Sales');
    expect(normalized.type).toBe('full-time');
    expect(normalized.remote).toBe('remote');
    expect(normalized.description).toBe('Lead our enterprise sales team across EMEA.');
    expect(normalized.salary.min).toBe(90000);
    expect(normalized.salary.max).toBe(120000);
    expect(normalized.salary.currency).toBe('EUR');
    expect(normalized.salary.period).toBe('yearly');
    expect(normalized.status).toBe('active');
    expect(normalized.sourceUrl).toBe('https://jobicy.com/jobs/998877-sales-manager');
  });
});
