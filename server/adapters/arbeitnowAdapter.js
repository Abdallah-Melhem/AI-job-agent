const fetch = require('node-fetch');
const JobAdapter = require('./jobAdapter');

const { isSafeUrl } = require('../utils/security');

/**
 * Arbeitnow Job Source Adapter
 * Connects to Arbeitnow's open JSON API (https://www.arbeitnow.com/api/job-board-api)
 */
class ArbeitnowAdapter extends JobAdapter {
  constructor() {
    super('arbeitnow');
    this.apiUrl = 'https://www.arbeitnow.com/api/job-board-api';
  }

  async search(query = {}) {
    try {
      if (!isSafeUrl(this.apiUrl)) throw new Error('Unsafe API URL configured');

      const response = await fetch(this.apiUrl, {
        headers: { 'User-Agent': 'AIJobAgent/1.0' },
        timeout: 6000
      });

      if (!response.ok) {
        console.warn(`Arbeitnow API returned status ${response.status}`);
        return [];
      }

      const json = await response.json();
      const rawJobs = Array.isArray(json.data) ? json.data : [];

      let filtered = rawJobs;

      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(j =>
          (j.title && j.title.toLowerCase().includes(kw)) ||
          (j.company_name && j.company_name.toLowerCase().includes(kw)) ||
          (j.tags && j.tags.some(t => t.toLowerCase().includes(kw)))
        );
      }

      if (query.remote === 'remote') {
        filtered = filtered.filter(j => j.remote === true);
      }

      return filtered.slice(0, 25);
    } catch (error) {
      console.warn('Arbeitnow fetch failed, fallback to empty:', error.message);
      return [];
    }
  }

  async getJob(externalId) {
    const jobs = await this.search();
    return jobs.find(j => String(j.slug) === String(externalId)) || null;
  }

  normalize(raw) {
    const isRemote = raw.remote ? 'remote' : 'onsite';
    const cleanDesc = raw.description ? raw.description.replace(/<[^>]*>?/gm, '').slice(0, 3000) : '';

    return {
      source: this.sourceName,
      externalId: String(raw.slug || raw.title.replace(/\s+/g, '-').toLowerCase()),
      title: raw.title || 'Developer',
      company: raw.company_name || 'Tech Company',
      location: raw.location || (raw.remote ? 'Remote' : 'Europe'),
      type: Array.isArray(raw.job_types) && raw.job_types.length > 0 ? raw.job_types[0].toLowerCase() : 'full-time',
      remote: isRemote,
      description: cleanDesc,
      requirements: [],
      skills: Array.isArray(raw.tags) ? raw.tags : [],
      salary: {},
      url: raw.url || '',
      postedAt: raw.created_at ? new Date(raw.created_at * 1000) : new Date(),
      rawData: { slug: raw.slug, company: raw.company_name }
    };
  }
}

module.exports = ArbeitnowAdapter;
