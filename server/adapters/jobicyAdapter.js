const fetch = require('node-fetch');
const JobAdapter = require('./jobAdapter');
const { isSafeUrl } = require('../utils/security');
const {
  normalizeJobType,
  normalizeRemote,
  stripHtml,
  parseSalaryValue,
  normalizeSalaryPeriod,
  normalizeExternalId,
  normalizeCategory,
  normalizeExperienceLevel,
  extractCountry
} = require('./jobNormalizer');

/**
 * Jobicy Job Source Adapter
 *
 * Source: https://jobicy.com/api/v2/remote-jobs
 * Type:   Open JSON API, no authentication required
 * Scope:  Worldwide remote jobs across Tech and Non-Tech industries
 *         (Sales, Marketing, Finance, Product, Operations, Engineering, Design, etc.)
 */
class JobicyAdapter extends JobAdapter {
  constructor(config = {}) {
    super('jobicy', config);
    this.apiUrl = config.apiUrl || 'https://jobicy.com/api/v2/remote-jobs';
    this.timeout = config.timeout || 8000;
  }

  getSourceMetadata() {
    return {
      sourceName: this.sourceName,
      displayName: 'Jobicy',
      description: 'Worldwide remote tech and non-tech jobs from the Jobicy open API.',
      isRealSource: true,
      website: 'https://jobicy.com',
      apiUrl: this.apiUrl,
      config: { ...this.config }
    };
  }

  async search(query = {}) {
    try {
      if (!isSafeUrl(this.apiUrl)) throw new Error('Unsafe API URL configured');

      const url = new URL(this.apiUrl);
      url.searchParams.set('count', '25');

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'AIJobAgent/1.0 (portfolio project)' },
        timeout: this.timeout
      });

      if (!response.ok) {
        console.warn(`[Jobicy] API returned status ${response.status}`);
        return [];
      }

      const json = await response.json();
      const rawJobs = Array.isArray(json.jobs) ? json.jobs : [];

      let filtered = rawJobs;

      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(j =>
          (j.jobTitle    && j.jobTitle.toLowerCase().includes(kw))    ||
          (j.companyName && j.companyName.toLowerCase().includes(kw)) ||
          (Array.isArray(j.jobIndustry) && j.jobIndustry.some(i => i.toLowerCase().includes(kw)))
        );
      }

      if (query.category && query.category !== 'all') {
        const catLower = query.category.toLowerCase();
        filtered = filtered.filter(j => {
          const itemCat = normalizeCategory(j.jobIndustry, j.jobTitle, j.jobIndustry);
          return itemCat.toLowerCase() === catLower;
        });
      }

      return filtered.slice(0, 25);
    } catch (error) {
      console.warn('[Jobicy] Fetch failed, returning empty:', error.message);
      return [];
    }
  }

  async getJob(externalId) {
    const jobs = await this.search();
    return jobs.find(j => String(j.id) === String(externalId)) || null;
  }

  normalize(raw) {
    const jobUrl = raw.url || `https://jobicy.com/jobs/${raw.id}`;
    const category = normalizeCategory(raw.jobIndustry, raw.jobTitle, raw.jobIndustry);

    return {
      source:          this.sourceName,
      externalId:      normalizeExternalId(raw.id),
      title:           raw.jobTitle    || 'Job Opening',
      company:         raw.companyName || 'Company',
      location:        raw.jobGeo      || 'Remote',
      country:         extractCountry(raw.jobGeo, raw.jobGeo),
      experienceLevel: normalizeExperienceLevel(raw.jobLevel, raw.jobTitle),
      category:        category,
      subcategory:     '',
      type:            normalizeJobType(raw.jobType),
      remote:      'remote',
      description: stripHtml(raw.jobDescription, 3000),
      requirements: [],
      skills:      Array.isArray(raw.jobIndustry) ? raw.jobIndustry : [],
      salary: {
        min:      parseSalaryValue(raw.salaryMin),
        max:      parseSalaryValue(raw.salaryMax),
        currency: raw.salaryCurrency || 'USD',
        period:   normalizeSalaryPeriod(raw.salaryPeriod || 'yearly')
      },
      url:        jobUrl,
      sourceUrl:  jobUrl,
      status:     'active',
      postedAt:   raw.pubDate ? new Date(raw.pubDate) : new Date(),
      importedAt: new Date(),
      rawData: {
        id:          raw.id,
        jobIndustry: raw.jobIndustry,
        jobGeo:      raw.jobGeo
      }
    };
  }
}

module.exports = JobicyAdapter;
