const jobService = require('../../services/jobService');
const adapterRegistry = require('../../adapters/adapterRegistry');

module.exports = {
  name: 'searchJobs',
  description: 'Search for jobs based on keyword, job type, remote preferences, or location.',
  parameters: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: 'Keyword to search in title, description, or skills' },
      type: { 
        type: 'string', 
        enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
        description: 'Job type'
      },
      remote: { 
        type: 'string', 
        enum: ['remote', 'hybrid', 'onsite'],
        description: 'Remote work preference'
      },
      location: { type: 'string', description: 'Location city, state, or country' },
      country: { type: 'string', description: 'Country filter (e.g. Germany, United States, Worldwide)' },
      company: { type: 'string', description: 'Company name' },
      category: { type: 'string', description: 'Job category (e.g. Software Development, Sales, Marketing, Design)' },
      experienceLevel: { 
        type: 'string', 
        enum: ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'executive'],
        description: 'Seniority / experience level'
      },
      minSalary: { type: 'number', description: 'Minimum salary amount' },
      sortBy: { 
        type: 'string', 
        enum: ['newest', 'oldest', 'salary-desc', 'salary-asc', 'relevance'],
        description: 'Sorting criteria'
      },
      source: { type: 'string', description: 'Job source filter (e.g. remoteok, arbeitnow, jobicy, or all)' },
      limit: { type: 'number', description: 'Maximum number of jobs to return (default: 10)' }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      total: { type: 'number' },
      jobs: { type: 'array' }
    },
    required: ['success', 'jobs', 'total']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    // Import fresh jobs from registered sources if needed
    await adapterRegistry.importJobs('all', params);

    const result = await jobService.searchJobs({
      keyword: params.keyword,
      type: params.type,
      remote: params.remote,
      location: params.location,
      country: params.country,
      company: params.company,
      category: params.category,
      experienceLevel: params.experienceLevel,
      minSalary: params.minSalary,
      sortBy: params.sortBy,
      source: params.source,
      limit: params.limit || 10
    });

    return {
      success: true,
      total: result.total,
      jobs: result.jobs.map(j => ({
        id: j._id,
        title: j.title,
        company: j.company,
        location: j.location,
        country: j.country,
        category: j.category,
        experienceLevel: j.experienceLevel,
        type: j.type,
        remote: j.remote,
        skills: j.skills,
        salary: j.salary,
        postedAt: j.postedAt
      }))
    };
  }
};
