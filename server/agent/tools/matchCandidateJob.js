const Job = require('../../models/Job');
const Profile = require('../../models/Profile');
const { matchCandidateWithJob } = require('../../services/matchingService');

module.exports = {
  name: 'matchCandidateJob',
  description: 'Analyze the match between the authenticated candidate profile and a specific job posting.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'The MongoDB ObjectId of the job to match against' }
    },
    required: ['jobId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      score: { type: 'number' },
      matchingSkills: { type: 'array' },
      missingSkills: { type: 'array' },
      relevantExperience: { type: 'string' },
      concerns: { type: 'array' },
      explanation: { type: 'string' }
    },
    required: ['success', 'score']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const profile = await Profile.findOne({ user: context.user._id });
    if (!profile) {
      throw new Error('Candidate profile not found. Please create a profile first.');
    }

    const match = await matchCandidateWithJob(profile, job);
    return {
      success: true,
      jobId: job._id,
      jobTitle: job.title,
      company: job.company,
      ...match
    };
  }
};
