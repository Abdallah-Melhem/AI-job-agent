/**
 * updateApplicationStatus.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Safely updates application workflow state with allowed transitions.
 */

'use strict';

const Application = require('../../models/Application');

const VALID_STATUSES = ['draft', 'prepared', 'applied', 'interviewing', 'rejected', 'offer'];

module.exports = {
  name: 'updateApplicationStatus',
  description: 'Update the tracking status of an existing job application.',
  parameters: {
    type: 'object',
    properties: {
      applicationId: { type: 'string', description: 'Application ObjectId' },
      status: {
        type: 'string',
        enum: VALID_STATUSES,
        description: 'New status for the application'
      },
      notes: { type: 'string', description: 'Optional updated notes' }
    },
    required: ['applicationId', 'status']
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
    const application = await Application.findOne({
      _id: params.applicationId,
      user: context.user._id
    });

    if (!application) {
      throw new Error(`Application not found or unauthorized for ID ${params.applicationId}`);
    }

    application.status = params.status;
    if (params.notes) {
      application.notes = params.notes;
    }
    await application.save();

    return {
      success: true,
      applicationId: application._id.toString(),
      status: application.status
    };
  }
};
