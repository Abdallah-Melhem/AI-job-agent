const fetch = require('node-fetch');
const JobAdapter = require('./jobAdapter');

const { isSafeUrl } = require('../utils/security');

/**
 * RemoteOK Job Source Adapter
 * Connects to RemoteOK's open JSON API (https://remoteok.com/api)
 */
class RemoteOkAdapter extends JobAdapter {
  constructor() {
    super('remoteok');
    this.apiUrl = 'https://remoteok.com/api';
  }

  async search(query = {}) {
    try {
      if (!isSafeUrl(this.apiUrl)) throw new Error('Unsafe API URL configured');

      const response = await fetch(this.apiUrl, {
        headers: {
          'User-Agent': 'AIJobAgent/1.0'
        },
        timeout: 6000
      });

      if (!response.ok) {
        console.warn(`RemoteOK API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();
      // RemoteOK first element is legal notice object; filter it out
      const rawJobs = Array.isArray(data) ? data.filter(item => item && item.id) : [];

      let filtered = rawJobs;

      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(j =>
          (j.position && j.position.toLowerCase().includes(kw)) ||
          (j.company && j.company.toLowerCase().includes(kw)) ||
          (j.tags && j.tags.some(t => t.toLowerCase().includes(kw)))
        );
      }

      return filtered.slice(0, 25);
    } catch (error) {
      console.warn('RemoteOK fetch failed, fallback to empty:', error.message);
      return [];
    }
  }

  async getJob(externalId) {
    const jobs = await this.search();
    return jobs.find(j => String(j.id) === String(externalId)) || null;
  }

  normalize(raw) {
    const salaryMin = raw.salary_min ? Number(raw.salary_min) : undefined;
    const salaryMax = raw.salary_max ? Number(raw.salary_max) : undefined;

    return {
      source: this.sourceName,
      externalId: String(raw.id),
      title: raw.position || 'Software Engineer',
      company: raw.company || 'Remote Company',
      location: raw.location || 'Remote',
      type: 'full-time',
      remote: 'remote',
      description: raw.description ? raw.description.replace(/<[^>]*>?/gm, '').slice(0, 3000) : '',
      requirements: [],
      skills: Array.isArray(raw.tags) ? raw.tags : [],
      salary: {
        min: salaryMin,
        max: salaryMax,
        currency: 'USD',
        period: 'yearly'
      },
      url: raw.url || `https://remoteok.com/l/${raw.id}`,
      postedAt: raw.date ? new Date(raw.date) : new Date(),
      rawData: { id: raw.id, tags: raw.tags, company: raw.company }
    };
  }
}

module.exports = RemoteOkAdapter;
