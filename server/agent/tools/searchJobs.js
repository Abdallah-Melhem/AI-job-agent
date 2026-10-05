const jobService = require('../../services/jobService');
const MockAdapter = require('../../adapters/mockAdapter');
const mockAdapter = new MockAdapter();

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
    // Import from adapter if needed to ensure fresh data
    await jobService.importFromAdapter(mockAdapter, params);

    const result = await jobService.searchJobs({
      keyword: params.keyword,
      type: params.type,
      remote: params.remote,
      location: params.location,
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
        type: j.type,
        remote: j.remote,
        skills: j.skills,
        salary: j.salary,
        postedAt: j.postedAt
      }))
    };
  }
};
