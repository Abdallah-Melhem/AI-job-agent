/**
 * getJobDetails.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Retrieves verified, untampered job details from the database.
 * External job description content is marked and sanitized.
 */

'use strict';

const Job = require('../../models/Job');
const guardrails = require('../guardrails');

module.exports = {
  name: 'getJobDetails',
  description: 'Retrieve verified job details by ID from the database.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'MongoDB ObjectId of the job' }
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
  async execute(params) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      return { success: false, message: 'Job not found', job: null };
    }

    // Sanitize untrusted external content
    const safeTitle = guardrails.sanitizeUntrustedContent(job.title);
    const safeDesc = guardrails.sanitizeUntrustedContent(job.description);

    return {
      success: true,
      job: {
        id: job._id.toString(),
        title: safeTitle,
        company: job.company,
        location: job.location,
        country: job.country,
        category: job.category,
        experienceLevel: job.experienceLevel,
        type: job.type,
        remote: job.remote,
        description: safeDesc,
        requirements: job.requirements || [],
        skills: job.skills || [],
        salary: job.salary,
        source: job.source,
        url: job.url || job.sourceUrl,
        postedAt: job.postedAt
      }
    };
  }
};
