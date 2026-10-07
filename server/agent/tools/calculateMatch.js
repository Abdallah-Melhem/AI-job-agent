/**
 * calculateMatch.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Calculates compatibility between authenticated candidate profile and a specific job.
 */

'use strict';

const Job = require('../../models/Job');
const Profile = require('../../models/Profile');
const { matchCandidateWithJob } = require('../../services/matchingService');

module.exports = {
  name: 'calculateMatch',
  description: 'Calculate comprehensive compatibility score and dimensional breakdown between candidate and job.',
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
      score: { type: 'number' },
      matchingSkills: { type: 'array' },
      missingSkills: { type: 'array' },
      confidence: { type: 'string' }
    },
    required: ['success', 'score']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      throw new Error(`Job not found with ID ${params.jobId}`);
    }

    const profile = await Profile.findOne({ user: context.user._id });
    if (!profile) {
      throw new Error('Candidate profile not found. Please complete profile before matching.');
    }

    const match = await matchCandidateWithJob(profile, job);
    return {
      success: true,
      jobId: job._id.toString(),
      jobTitle: job.title,
      company: job.company,
      score: match.score,
      matchingSkills: match.matchingSkills || [],
      missingSkills: match.missingSkills || [],
      confidence: match.confidence,
      experienceAssessment: match.experienceAssessment,
      breakdown: match.breakdown,
      explanation: match.explanation
    };
  }
};
