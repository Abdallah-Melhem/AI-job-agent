const JobAdapter = require('./jobAdapter');
const {
  normalizeJobType,
  normalizeRemote,
  normalizeExternalId,
  normalizeCategory,
  normalizeExperienceLevel,
  extractCountry
} = require('./jobNormalizer');

/**
 * Mock adapter — returns hard-coded sample jobs so the rest of the stack
 * can be developed and tested without any external API dependency.
 *
 * NOTE: This adapter is ONLY registered when ENABLE_MOCK_JOBS=true.
 * It must never run in production.
 */

const MOCK_JOBS = [
  {
    id: 'mock-001',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'New York, NY',
    type: 'full-time',
    remote: 'hybrid',
    description: 'We are looking for a skilled frontend developer with experience in React, TypeScript, and modern CSS. You will work on building responsive, accessible UIs for our SaaS platform.',
    requirements: ['2+ years React experience', 'TypeScript proficiency', 'CSS/SCSS expertise', 'Git version control'],
    skills: ['React', 'TypeScript', 'CSS', 'HTML', 'Git', 'REST API'],
    salary: { min: 70000, max: 95000, currency: 'USD', period: 'yearly' },
    url: 'https://example.com/jobs/mock-001',
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    id: 'mock-002',
    title: 'Backend Engineer',
    company: 'DataFlow Inc.',
    location: 'San Francisco, CA',
    type: 'full-time',
    remote: 'remote',
    description: 'Join our backend team building high-throughput data pipelines. Experience with Node.js, PostgreSQL, and message queues is essential.',
    requirements: ['3+ years Node.js', 'PostgreSQL or MongoDB', 'Message queues (RabbitMQ / Kafka)', 'Docker basics'],
    skills: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Docker', 'Redis'],
    salary: { min: 90000, max: 130000, currency: 'USD', period: 'yearly' },
    url: 'https://example.com/jobs/mock-002',
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'mock-003',
    title: 'Full-Stack Intern',
    company: 'StartupXYZ',
    location: 'Remote',
    type: 'internship',
    remote: 'remote',
    description: 'Great opportunity for students or recent graduates. Work on a real product using the MERN stack under mentorship from senior engineers.',
    requirements: ['Basic JavaScript knowledge', 'Familiarity with React', 'Willingness to learn'],
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    salary: { min: 1000, max: 2000, currency: 'USD', period: 'monthly' },
    url: 'https://example.com/jobs/mock-003',
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'mock-004',
    title: 'DevOps Engineer',
    company: 'CloudNine',
    location: 'Austin, TX',
    type: 'contract',
    remote: 'onsite',
    description: 'Seeking a DevOps engineer to manage CI/CD pipelines, Kubernetes clusters, and cloud infrastructure on AWS.',
    requirements: ['AWS certification preferred', 'Kubernetes experience', 'Terraform / IaC', 'Linux administration'],
    skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Linux', 'CI/CD', 'GitHub Actions'],
    salary: { min: 100000, max: 150000, currency: 'USD', period: 'yearly' },
    url: 'https://example.com/jobs/mock-004',
    postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'mock-005',
    title: 'React Native Developer',
    company: 'MobileFirst',
    location: 'Berlin, Germany',
    type: 'full-time',
    remote: 'hybrid',
    description: 'Build cross-platform mobile apps with React Native. Work closely with designers and backend engineers.',
    requirements: ['React Native experience', 'Published app on App Store or Google Play', 'REST/GraphQL integration'],
    skills: ['React Native', 'JavaScript', 'TypeScript', 'GraphQL', 'REST API'],
    salary: { min: 60000, max: 85000, currency: 'EUR', period: 'yearly' },
    url: 'https://example.com/jobs/mock-005',
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
];

class MockAdapter extends JobAdapter {
  constructor(config = {}) {
    super('mock', config);
  }

  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: 'Mock (Dev/Test)',
      description: 'Hardcoded sample jobs for development and testing. Not a real source.',
      isRealSource: false,
      website: null,
      apiUrl: null,
      config: { ...this.config }
    };
  }

  async search(query = {}) {
    let results = [...MOCK_JOBS];

    // Simple keyword filter on title / company / description
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      results = results.filter(j =>
        j.title.toLowerCase().includes(kw) ||
        j.company.toLowerCase().includes(kw) ||
        j.description.toLowerCase().includes(kw) ||
        j.skills.some(s => s.toLowerCase().includes(kw))
      );
    }

    // Type filter
    if (query.type) {
      results = results.filter(j => j.type === query.type);
    }

    // Remote filter
    if (query.remote) {
      results = results.filter(j => j.remote === query.remote);
    }

    // Location filter
    if (query.location) {
      const loc = query.location.toLowerCase();
      results = results.filter(j => j.location.toLowerCase().includes(loc));
    }

    return results;
  }

  async getJob(externalId) {
    return MOCK_JOBS.find(j => j.id === externalId) || null;
  }

  normalize(rawJob) {
    const category = normalizeCategory(rawJob.skills, rawJob.title, rawJob.skills);

    return {
      source:          this.sourceName,
      externalId:      normalizeExternalId(rawJob.id),
      title:           rawJob.title    || 'Job',
      company:         rawJob.company  || 'Company',
      location:        rawJob.location || '',
      country:         extractCountry(rawJob.location, ''),
      experienceLevel: normalizeExperienceLevel('', rawJob.title),
      category:        category,
      subcategory:     '',
      type:            normalizeJobType(rawJob.type),
      remote:       normalizeRemote(rawJob.remote),
      description:  rawJob.description || '',
      requirements: rawJob.requirements || [],
      skills:       rawJob.skills || [],
      salary:       rawJob.salary || {},
      url:          rawJob.url    || '',
      sourceUrl:    rawJob.url    || '',
      status:       'active',
      postedAt:     rawJob.postedAt || new Date(),
      importedAt:   new Date(),
      rawData:      rawJob
    };
  }
}

module.exports = MockAdapter;

