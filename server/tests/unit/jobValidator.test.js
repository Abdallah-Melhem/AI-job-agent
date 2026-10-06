const { validateJob } = require('../../adapters/jobValidator');

describe('jobValidator', () => {
  const validJob = {
    source: 'remoteok',
    externalId: '12345',
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    location: 'Remote',
    type: 'full-time',
    remote: 'remote',
    description: 'A great engineering role.',
    skills: ['JavaScript', 'Node.js'],
    requirements: ['3+ years experience'],
    salary: { min: 80000, max: 120000, currency: 'USD', period: 'yearly' },
    url: 'https://example.com/job/12345',
    sourceUrl: 'https://example.com/job/12345',
    status: 'active',
    postedAt: new Date()
  };

  test('validates a compliant job', () => {
    const result = validateJob(validJob);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('detects missing required fields', () => {
    const invalid = { ...validJob, title: '', company: '' };
    delete invalid.source;
    delete invalid.externalId;

    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  test('flags invalid type enum', () => {
    const invalid = { ...validJob, type: 'consultant' };
    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid job type'))).toBe(true);
  });

  test('flags invalid remote enum', () => {
    const invalid = { ...validJob, remote: 'everywhere' };
    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid remote value'))).toBe(true);
  });

  test('flags invalid status enum', () => {
    const invalid = { ...validJob, status: 'cancelled' };
    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
  });

  test('flags non-array skills', () => {
    const invalid = { ...validJob, skills: 'JavaScript, Node.js' };
    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('skills must be an array'))).toBe(true);
  });

  test('flags invalid date', () => {
    const invalid = { ...validJob, postedAt: 'invalid-date-string' };
    const result = validateJob(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('postedAt is not a valid date'))).toBe(true);
  });

  test('handles null/undefined job input', () => {
    const result = validateJob(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Job must be a non-null object');
  });
});
