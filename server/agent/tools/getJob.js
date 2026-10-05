const Job = require('../../models/Job');

module.exports = {
  name: 'getJob',
  description: 'Retrieve full details of a specific job posting by its ID.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'The MongoDB ObjectId of the job' }
    },
    required: ['jobId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      job: { type: ['object', 'null'] }
    },
    required: ['success']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      return { success: false, message: 'Job not found', job: null };
    }
    return {
      success: true,
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        remote: job.remote,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills,
        salary: job.salary,
        url: job.url,
        postedAt: job.postedAt
      }
    };
  }
};
