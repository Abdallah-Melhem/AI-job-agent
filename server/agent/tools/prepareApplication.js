const { prepareApplication } = require('../../services/applicationService');

module.exports = {
  name: 'prepareApplication',
  description: 'Prepares a job application by initializing required form fields based on the external job board.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'ID of the Job to prepare application for' }
    },
    required: ['jobId'],
    additionalProperties: false
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  },
  permission: 'write',
  execute: async (params, context) => {
    try {
      const app = await prepareApplication(context.user._id, params.jobId);
      return { 
        success: true, 
        data: { 
          applicationId: app._id.toString(),
          status: app.status 
        } 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
