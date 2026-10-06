const {
  CANONICAL_CATEGORIES,
  CATEGORY_LIST,
  normalizeCategory
} = require('../../adapters/categoryNormalizer');

describe('categoryNormalizer', () => {
  test('has complete list of canonical categories', () => {
    expect(CATEGORY_LIST).toContain('Software Development');
    expect(CATEGORY_LIST).toContain('Web Development');
    expect(CATEGORY_LIST).toContain('Mobile Development');
    expect(CATEGORY_LIST).toContain('DevOps');
    expect(CATEGORY_LIST).toContain('Cybersecurity');
    expect(CATEGORY_LIST).toContain('Data');
    expect(CATEGORY_LIST).toContain('AI/ML');
    expect(CATEGORY_LIST).toContain('Sales');
    expect(CATEGORY_LIST).toContain('Marketing');
    expect(CATEGORY_LIST).toContain('Customer Service');
    expect(CATEGORY_LIST).toContain('Finance');
    expect(CATEGORY_LIST).toContain('Accounting');
    expect(CATEGORY_LIST).toContain('Administration');
    expect(CATEGORY_LIST).toContain('Operations');
    expect(CATEGORY_LIST).toContain('Design');
    expect(CATEGORY_LIST).toContain('Content');
    expect(CATEGORY_LIST).toContain('Education');
    expect(CATEGORY_LIST).toContain('Hospitality');
    expect(CATEGORY_LIST).toContain('Retail');
    expect(CATEGORY_LIST).toContain('Other');
  });

  test('normalizes direct category names case-insensitively', () => {
    expect(normalizeCategory('sales')).toBe(CANONICAL_CATEGORIES.SALES);
    expect(normalizeCategory('marketing')).toBe(CANONICAL_CATEGORIES.MARKETING);
    expect(normalizeCategory('cybersecurity')).toBe(CANONICAL_CATEGORIES.CYBERSECURITY);
  });

  test('normalizes tech titles and tags', () => {
    expect(normalizeCategory([], 'Senior React Engineer', ['react', 'frontend'])).toBe(CANONICAL_CATEGORIES.WEB_DEVELOPMENT);
    expect(normalizeCategory([], 'Kubernetes Platform Specialist', ['devops'])).toBe(CANONICAL_CATEGORIES.DEVOPS);
    expect(normalizeCategory([], 'Machine Learning Engineer', ['python', 'pytorch'])).toBe(CANONICAL_CATEGORIES.AI_ML);
    expect(normalizeCategory([], 'iOS App Developer', ['swift'])).toBe(CANONICAL_CATEGORIES.MOBILE_DEVELOPMENT);
    expect(normalizeCategory([], 'Lead QA Automation Engineer', ['selenium'])).toBe(CANONICAL_CATEGORIES.QA_TESTING);
  });

  test('normalizes non-tech titles and tags', () => {
    expect(normalizeCategory(['Sales'], 'Account Executive - EMEA')).toBe(CANONICAL_CATEGORIES.SALES);
    expect(normalizeCategory(['Finance & Accounting'], 'Senior Bookkeeper')).toBe(CANONICAL_CATEGORIES.ACCOUNTING);
    expect(normalizeCategory([], 'Head of People & Talent Acquisition', ['recruiting'])).toBe(CANONICAL_CATEGORIES.HUMAN_RESOURCES);
    expect(normalizeCategory([], 'Customer Support Specialist', ['support'])).toBe(CANONICAL_CATEGORIES.CUSTOMER_SERVICE);
    expect(normalizeCategory([], 'Administration und Sachbearbeitung')).toBe(CANONICAL_CATEGORIES.ADMINISTRATION);
    expect(normalizeCategory([], 'Senior Graphic Designer', ['figma', 'ui'])).toBe(CANONICAL_CATEGORIES.DESIGN);
    expect(normalizeCategory([], 'Copywriter & Content Creator', ['writing'])).toBe(CANONICAL_CATEGORIES.CONTENT);
  });

  test('falls back to Other for unrecognized tags and titles', () => {
    expect(normalizeCategory([], 'Generalist Role 123', [])).toBe(CANONICAL_CATEGORIES.OTHER);
    expect(normalizeCategory('', '', [])).toBe(CANONICAL_CATEGORIES.OTHER);
  });
});
