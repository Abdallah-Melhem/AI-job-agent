/**
 * explainMatch.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Provides clear, human-readable explanations of why a candidate fits or does not fit a job.
 */

'use strict';

const Job = require('../../models/Job');
const Profile = require('../../models/Profile');
const { matchCandidateWithJob } = require('../../services/matchingService');

module.exports = {
  name: 'explainMatch',
  description: 'Provide an explainable breakdown of strengths, gaps, and rationale for candidate-job compatibility.',
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
      explanation: { type: 'string' },
      strengths: { type: 'array' },
      gaps: { type: 'array' },
      experienceFit: { type: 'string' }
    },
    required: ['success', 'score', 'explanation']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      throw new Error(`Job not found with ID ${params.jobId}`);
    }

    const profile = await Profile.findOne({ user: context.user._id });
    if (!profile) {
      throw new Error('Candidate profile not found.');
    }

    const match = await matchCandidateWithJob(profile, job);

    return {
      success: true,
      jobId: job._id.toString(),
      jobTitle: job.title,
      company: job.company,
      score: match.score,
      explanation: match.explanation,
      strengths: match.matchingSkills || [],
      gaps: match.missingSkills || [],
      experienceFit: match.experienceAssessment,
      confidence: match.confidence,
      semanticInsights: match.semanticInsights
    };
  }
};
