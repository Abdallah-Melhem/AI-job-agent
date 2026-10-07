/**
 * createApplicationDraft.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Creates or updates an application draft record for a job.
 */

'use strict';

const Application = require('../../models/Application');
const Job = require('../../models/Job');

module.exports = {
  name: 'createApplicationDraft',
  description: 'Create a draft application record for a specific job opportunity.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'MongoDB ObjectId of the target job' },
      notes: { type: 'string', description: 'Optional initial notes for the application draft' }
    },
    required: ['jobId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      applicationId: { type: 'string' },
      status: { type: 'string' }
    },
    required: ['success', 'applicationId', 'status']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const job = await Job.findById(params.jobId);
    if (!job) {
      throw new Error(`Job not found with ID ${params.jobId}`);
    }

    let application = await Application.findOne({ user: context.user._id, job: job._id });
    if (!application) {
      application = await Application.create({
        user: context.user._id,
        job: job._id,
        status: 'draft',
        notes: params.notes || 'Created via AI Job Agent draft tool.'
      });
    } else {
      if (params.notes) {
        application.notes = params.notes;
        await application.save();
      }
    }

    return {
      success: true,
      applicationId: application._id.toString(),
      jobId: job._id.toString(),
      jobTitle: job.title,
      company: job.company,
      status: application.status
    };
  }
};
