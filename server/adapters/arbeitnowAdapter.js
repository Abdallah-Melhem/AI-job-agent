const fetch = require('node-fetch');
const JobAdapter = require('./jobAdapter');
const { isSafeUrl } = require('../utils/security');
const {
  normalizeJobType,
  normalizeRemote,
  stripHtml,
  normalizeExternalId,
  normalizeCategory,
  normalizeExperienceLevel,
  extractCountry
} = require('./jobNormalizer');

/**
 * Arbeitnow Job Source Adapter
 *
 * Source: https://www.arbeitnow.com/api/job-board-api
 * Type:   Open JSON API, no authentication required
 * Scope:  European jobs (Germany-heavy), includes both tech and non-tech roles
 *
 * API notes:
 * - Response is { data: [...], links: {}, meta: {} }
 * - created_at is a Unix timestamp (seconds)
 * - job_types is an array of raw German/English type labels
 * - remote is a boolean
 */
class ArbeitnowAdapter extends JobAdapter {
  constructor(config = {}) {
    super('arbeitnow', config);
    this.apiUrl = config.apiUrl || 'https://www.arbeitnow.com/api/job-board-api';
    this.timeout = config.timeout || 8000;
  }

  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: 'Arbeitnow',
      description: 'European job listings including tech and non-tech roles, from the Arbeitnow open API.',
      isRealSource: true,
      website: 'https://www.arbeitnow.com',
      apiUrl: this.apiUrl,
      config: { ...this.config }
    };
  }

  async search(query = {}) {
    try {
      if (!isSafeUrl(this.apiUrl)) throw new Error('Unsafe API URL configured');

      const response = await fetch(this.apiUrl, {
        headers: { 'User-Agent': 'AIJobAgent/1.0 (portfolio project)' },
        timeout: this.timeout
      });

      if (!response.ok) {
        console.warn(`[Arbeitnow] API returned status ${response.status}`);
        return [];
      }

      const json = await response.json();
      const rawJobs = Array.isArray(json.data) ? json.data : [];

      let filtered = rawJobs;

      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(j =>
          (j.title        && j.title.toLowerCase().includes(kw))        ||
          (j.company_name && j.company_name.toLowerCase().includes(kw)) ||
          (j.tags         && j.tags.some(t => t.toLowerCase().includes(kw)))
        );
      }

      if (query.remote === 'remote') {
        filtered = filtered.filter(j => j.remote === true);
      }

      if (query.category && query.category !== 'all') {
        const catLower = query.category.toLowerCase();
        filtered = filtered.filter(j => {
          const itemCat = normalizeCategory(j.tags, j.title, j.tags);
          return itemCat.toLowerCase() === catLower;
        });
      }

      return filtered.slice(0, 25);
    } catch (error) {
      console.warn('[Arbeitnow] Fetch failed, returning empty:', error.message);
      return [];
    }
  }

  async getJob(externalId) {
    const jobs = await this.search();
    return jobs.find(j => String(j.slug) === String(externalId)) || null;
  }

  normalize(raw) {
    // Use slug as externalId; fall back to slugified title
    const externalId = raw.slug
      ? normalizeExternalId(raw.slug)
      : normalizeExternalId(String(raw.title || '').replace(/\s+/g, '-').toLowerCase());

    const category = normalizeCategory(raw.tags, raw.title, raw.tags);

    return {
      source:          this.sourceName,
      externalId,
      title:           raw.title        || 'Job Opening',
      company:         raw.company_name || 'Company',
      location:        raw.location     || (raw.remote ? 'Remote' : 'Europe'),
      country:         extractCountry(raw.location, raw.location),
      experienceLevel: normalizeExperienceLevel('', raw.title),
      category:        category,
      subcategory:     '',
      type:            normalizeJobType(raw.job_types),
      remote:      normalizeRemote(raw.remote),
      description: stripHtml(raw.description, 3000),
      requirements: [],
      skills:      Array.isArray(raw.tags) ? raw.tags.slice(0, 30) : [],
      salary:      {},
      url:         raw.url     || '',
      sourceUrl:   raw.url     || '',
      status:      'active',
      postedAt:    raw.created_at ? new Date(raw.created_at * 1000) : new Date(),
      importedAt:  new Date(),
      rawData: {
        slug:    raw.slug,
        company: raw.company_name
      }
    };
  }
}

module.exports = ArbeitnowAdapter;
