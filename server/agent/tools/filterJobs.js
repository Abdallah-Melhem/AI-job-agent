/**
 * filterJobs.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Filters a provided list of jobs or database jobs by location, work mode,
 * seniority, minimum salary, and keywords.
 */

'use strict';

module.exports = {
  name: 'filterJobs',
  description: 'Filter a list of candidate jobs by location, work mode, experience level, or salary.',
  parameters: {
    type: 'object',
    properties: {
      jobs: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array of jobs to filter. If omitted or empty, runs filtering on database search.'
      },
      location: { type: 'string', description: 'Target location or city' },
      country: { type: 'string', description: 'Target country' },
      remote: { type: 'string', enum: ['remote', 'hybrid', 'onsite'], description: 'Work mode' },
      experienceLevel: {
        type: 'string',
        enum: ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'executive'],
        description: 'Target seniority'
      },
      type: {
        type: 'string',
        enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
        description: 'Employment type'
      },
      minSalary: { type: 'number', description: 'Minimum acceptable salary' }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      filteredJobs: { type: 'array' },
      count: { type: 'number' }
    },
    required: ['success', 'filteredJobs', 'count']
  },
  permission: 'authenticated_user',
  async execute(params) {
    const inputJobs = Array.isArray(params.jobs) ? params.jobs : [];

    const filtered = inputJobs.filter(job => {
      // Location filter
      if (params.location) {
        const targetLoc = params.location.toLowerCase();
        const jobLoc = (job.location || '').toLowerCase();
        if (!jobLoc.includes(targetLoc)) return false;
      }

      // Country filter
      if (params.country) {
        const targetCountry = params.country.toLowerCase();
        const jobCountry = (job.country || '').toLowerCase();
        const jobLoc = (job.location || '').toLowerCase();
        if (!jobCountry.includes(targetCountry) && !jobLoc.includes(targetCountry)) return false;
      }

      // Remote filter
      if (params.remote && job.remote && job.remote !== 'unknown') {
        if (job.remote !== params.remote) return false;
      }

      // Experience level filter
      if (params.experienceLevel && job.experienceLevel && job.experienceLevel !== 'not-specified') {
        if (job.experienceLevel !== params.experienceLevel) return false;
      }

      // Type filter
      if (params.type && job.type) {
        if (job.type !== params.type) return false;
      }

      // Min salary filter
      if (params.minSalary && job.salary && job.salary.max) {
        if (job.salary.max < params.minSalary) return false;
      }

      return true;
    });

    return {
      success: true,
      filteredJobs: filtered,
      count: filtered.length
    };
  }
};
