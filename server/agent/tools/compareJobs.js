/**
 * compareJobs.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Compares two or more jobs side-by-side against candidate profile.
 */

'use strict';

const Job = require('../../models/Job');
const Profile = require('../../models/Profile');
const { matchCandidateWithJob } = require('../../services/matchingService');

module.exports = {
  name: 'compareJobs',
  description: 'Compare 2 to 4 jobs side-by-side on skills, experience level, salary, and compatibility.',
  parameters: {
    type: 'object',
    properties: {
      jobIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description: 'Array of 2 to 4 job ObjectIds to compare'
      }
    },
    required: ['jobIds']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      comparison: { type: 'array' },
      recommendation: { type: 'string' }
    },
    required: ['success', 'comparison']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const profile = await Profile.findOne({ user: context.user._id });
    const jobs = await Job.find({ _id: { $in: params.jobIds } });

    if (jobs.length === 0) {
      return { success: false, message: 'No jobs found for comparison.', comparison: [] };
    }

    const comparison = [];
    for (const job of jobs) {
      let matchScore = 0;
      let matchingSkills = [];
      let missingSkills = [];

      if (profile) {
        const matchRes = await matchCandidateWithJob(profile, job);
        matchScore = matchRes.score;
        matchingSkills = matchRes.matchingSkills || [];
        missingSkills = matchRes.missingSkills || [];
      }

      comparison.push({
        jobId: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        remote: job.remote,
        experienceLevel: job.experienceLevel,
        salary: job.salary,
        matchScore,
        matchingSkillsCount: matchingSkills.length,
        missingSkillsCount: missingSkills.length,
        matchingSkills: matchingSkills.slice(0, 5),
        missingSkills: missingSkills.slice(0, 5)
      });
    }

    // Sort by match score descending
    comparison.sort((a, b) => b.matchScore - a.matchScore);

    const top = comparison[0];
    const recommendation = top
      ? `Top recommendation: ${top.title} at ${top.company} (Match Score: ${top.matchScore}%) with ${top.matchingSkillsCount} matching skills.`
      : 'Insufficient job data to form recommendation.';

    return {
      success: true,
      comparison,
      recommendation
    };
  }
};
