const { fillApplication } = require('../../services/applicationService');

module.exports = {
  name: 'fillApplication',
  description: 'Fills a prepared job application with the candidates tailored profile and resume data.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'ID of the Job to fill application for' }
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
      const app = await fillApplication(context.user._id, params.jobId);
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
