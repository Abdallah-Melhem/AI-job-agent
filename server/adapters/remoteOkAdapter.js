const fetch = require('node-fetch');
const JobAdapter = require('./jobAdapter');
const { isSafeUrl } = require('../utils/security');
const {
  normalizeJobType,
  normalizeRemote,
  stripHtml,
  parseSalaryValue,
  normalizeExternalId,
  normalizeCategory,
  normalizeExperienceLevel,
  extractCountry
} = require('./jobNormalizer');

/**
 * RemoteOK Job Source Adapter
 *
 * Source: https://remoteok.com/api
 * Type:   Open JSON API, no authentication required
 * Scope:  Remote-first tech jobs worldwide
 *
 * API notes:
 * - The first element of the response array is a legal notice object (no `id` field) — filtered out
 * - Rate limiting: fetch once per search call, slice to 25 results max
 */
class RemoteOkAdapter extends JobAdapter {
  constructor(config = {}) {
    super('remoteok', config);
    this.apiUrl = config.apiUrl || 'https://remoteok.com/api';
    this.timeout = config.timeout || 8000;
  }

  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: 'RemoteOK',
      description: 'Remote-first tech jobs from the RemoteOK open API.',
      isRealSource: true,
      website: 'https://remoteok.com',
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
        console.warn(`[RemoteOK] API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();

      // First element is a legal notice object without an id — filter it out
      const rawJobs = Array.isArray(data) ? data.filter(item => item && item.id) : [];

      let filtered = rawJobs;

      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(j =>
          (j.position && j.position.toLowerCase().includes(kw)) ||
          (j.company  && j.company.toLowerCase().includes(kw))  ||
          (j.tags     && j.tags.some(t => t.toLowerCase().includes(kw)))
        );
      }

      if (query.category && query.category !== 'all') {
        const catLower = query.category.toLowerCase();
        filtered = filtered.filter(j => {
          const itemCat = normalizeCategory(j.tags, j.position, j.tags);
          return itemCat.toLowerCase() === catLower;
        });
      }

      // RemoteOK only has remote jobs — skip remote filter (all pass)

      return filtered.slice(0, 25);
    } catch (error) {
      console.warn('[RemoteOK] Fetch failed, returning empty:', error.message);
      return [];
    }
  }

  async getJob(externalId) {
    // RemoteOK has no single-job endpoint; search and filter locally
    const jobs = await this.search();
    return jobs.find(j => String(j.id) === String(externalId)) || null;
  }

  normalize(raw) {
    const jobUrl = raw.url || `https://remoteok.com/l/${raw.id}`;
    const category = normalizeCategory(raw.tags, raw.position, raw.tags);

    return {
      source:          this.sourceName,
      externalId:      normalizeExternalId(raw.id),
      title:           raw.position || 'Software Engineer',
      company:         raw.company  || 'Remote Company',
      location:        raw.location || 'Remote',
      country:         extractCountry(raw.location, ''),
      experienceLevel: normalizeExperienceLevel('', raw.position),
      category:        category,
      subcategory:     '',
      type:            normalizeJobType(raw.job_types || 'full-time'),
      remote:      'remote',               // RemoteOK is exclusively remote
      description: stripHtml(raw.description, 3000),
      requirements: [],
      skills:      Array.isArray(raw.tags) ? raw.tags.slice(0, 30) : [],
      salary: {
        min:      parseSalaryValue(raw.salary_min),
        max:      parseSalaryValue(raw.salary_max),
        currency: 'USD',
        period:   'yearly'
      },
      url:        jobUrl,
      sourceUrl:  jobUrl,
      status:     'active',
      postedAt:   raw.date ? new Date(raw.date) : new Date(),
      importedAt: new Date(),
      rawData: {
        id:      raw.id,
        tags:    raw.tags,
        company: raw.company
      }
    };
  }
}

module.exports = RemoteOkAdapter;
