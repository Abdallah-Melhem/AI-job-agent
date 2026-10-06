const {
  normalizeJobType,
  normalizeRemote,
  stripHtml,
  parseSalaryValue,
  normalizeSalaryPeriod,
  normalizeExternalId,
  normalizeExperienceLevel,
  extractCountry
} = require('../../adapters/jobNormalizer');

describe('jobNormalizer', () => {
  describe('normalizeJobType', () => {
    test('normalizes standard English and German job types', () => {
      expect(normalizeJobType('Full-time')).toBe('full-time');
      expect(normalizeJobType('Vollzeit')).toBe('full-time');
      expect(normalizeJobType('Part-Time')).toBe('part-time');
      expect(normalizeJobType('Teilzeit')).toBe('part-time');
      expect(normalizeJobType('Internship')).toBe('internship');
      expect(normalizeJobType('Werkstudent')).toBe('internship');
      expect(normalizeJobType('Contract')).toBe('contract');
      expect(normalizeJobType('Freelance')).toBe('freelance');
    });

    test('handles array input (e.g. from Arbeitnow API)', () => {
      expect(normalizeJobType(['Vollzeit'])).toBe('full-time');
      expect(normalizeJobType(['Teilzeit', 'Festanstellung'])).toBe('part-time');
    });

    test('maps unknown type to other', () => {
      expect(normalizeJobType('volunteer')).toBe('other');
    });

    test('defaults to full-time when empty', () => {
      expect(normalizeJobType('')).toBe('full-time');
      expect(normalizeJobType(null)).toBe('full-time');
    });
  });

  describe('normalizeRemote', () => {
    test('normalizes boolean and string values', () => {
      expect(normalizeRemote(true)).toBe('remote');
      expect(normalizeRemote(false)).toBe('onsite');
      expect(normalizeRemote('remote')).toBe('remote');
      expect(normalizeRemote('hybrid')).toBe('hybrid');
      expect(normalizeRemote('onsite')).toBe('onsite');
      expect(normalizeRemote('on-site')).toBe('onsite');
      expect(normalizeRemote('office based')).toBe('onsite');
      expect(normalizeRemote(null)).toBe('unknown');
    });
  });

  describe('stripHtml', () => {
    test('strips HTML tags and decodes common entities', () => {
      const input = '<p>We are hiring a <strong>Frontend Engineer</strong> &amp; team lead!</p>';
      expect(stripHtml(input)).toBe('We are hiring a Frontend Engineer & team lead!');
    });

    test('respects character limit', () => {
      const longInput = '<p>' + 'A'.repeat(5000) + '</p>';
      const result = stripHtml(longInput, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    test('handles null/undefined gracefully', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });
  });

  describe('parseSalaryValue', () => {
    test('converts numeric string to number', () => {
      expect(parseSalaryValue('90000')).toBe(90000);
      expect(parseSalaryValue(85000)).toBe(85000);
    });

    test('returns undefined for invalid or empty values', () => {
      expect(parseSalaryValue(null)).toBeUndefined();
      expect(parseSalaryValue('')).toBeUndefined();
      expect(parseSalaryValue('not-a-number')).toBeUndefined();
    });
  });

  describe('normalizeSalaryPeriod', () => {
    test('normalizes hourly, monthly, yearly periods', () => {
      expect(normalizeSalaryPeriod('yearly')).toBe('yearly');
      expect(normalizeSalaryPeriod('annual')).toBe('yearly');
      expect(normalizeSalaryPeriod('per year')).toBe('yearly');
      expect(normalizeSalaryPeriod('monthly')).toBe('monthly');
      expect(normalizeSalaryPeriod('hourly')).toBe('hourly');
      expect(normalizeSalaryPeriod('')).toBe('');
    });
  });

  describe('normalizeExternalId', () => {
    test('converts number or string to trimmed string', () => {
      expect(normalizeExternalId(12345)).toBe('12345');
      expect(normalizeExternalId('  job-abc  ')).toBe('job-abc');
    });
  });

  describe('normalizeExperienceLevel', () => {
    test('detects senior from title', () => {
      expect(normalizeExperienceLevel('', 'Senior Software Engineer')).toBe('senior');
      expect(normalizeExperienceLevel('', 'Senior Frontend Developer')).toBe('senior');
    });

    test('detects entry-level from intern/werkstudent/graduate keywords', () => {
      expect(normalizeExperienceLevel('', 'Werkstudent iOS Development')).toBe('entry-level');
      expect(normalizeExperienceLevel('', 'Graduate Software Engineer')).toBe('entry-level');
      expect(normalizeExperienceLevel('', 'Intern – Data Science')).toBe('entry-level');
    });

    test('detects junior from title', () => {
      expect(normalizeExperienceLevel('', 'Junior Backend Developer')).toBe('junior');
    });

    test('detects mid-level from title', () => {
      expect(normalizeExperienceLevel('', 'Mid-Level Data Analyst')).toBe('mid-level');
    });

    test('detects lead from title', () => {
      expect(normalizeExperienceLevel('', 'Head of Engineering')).toBe('lead');
      expect(normalizeExperienceLevel('', 'Lead Product Designer')).toBe('lead');
    });

    test('detects executive from title', () => {
      expect(normalizeExperienceLevel('', 'Chief Technology Officer')).toBe('executive');
      expect(normalizeExperienceLevel('', 'VP of Sales')).toBe('executive');
    });

    test('falls back to not-specified for unrecognized titles', () => {
      expect(normalizeExperienceLevel('', 'Marketing Specialist')).toBe('not-specified');
      expect(normalizeExperienceLevel('', '')).toBe('not-specified');
    });

    test('accepts known level string as first argument', () => {
      expect(normalizeExperienceLevel('senior', '')).toBe('senior');
      expect(normalizeExperienceLevel('ENTRY-LEVEL', '')).toBe('entry-level');
    });
  });

  describe('extractCountry', () => {
    test('extracts known countries from location strings', () => {
      expect(extractCountry('Berlin, Germany')).toBe('Germany');
      expect(extractCountry('San Francisco, USA')).toBe('United States');
      expect(extractCountry('London, England')).toBe('United Kingdom');
    });

    test('returns Worldwide for remote/global location strings', () => {
      expect(extractCountry('Remote, Worldwide')).toBe('Worldwide');
      expect(extractCountry('Anywhere')).toBe('Worldwide');
    });

    test('falls back to geoStr when location is unknown', () => {
      expect(extractCountry('', 'Seoul')).toBe('Seoul');
    });

    test('returns empty string when no input provided', () => {
      expect(extractCountry('', '')).toBe('');
      expect(extractCountry()).toBe('');
    });
  });
});
