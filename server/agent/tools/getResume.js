const CV = require('../../models/CV');
const TailoredResume = require('../../models/TailoredResume');

module.exports = {
  name: 'getResume',
  description: 'Retrieve uploaded CVs and any previously generated tailored resumes for the candidate.',
  parameters: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'Optional Job ID to fetch a tailored resume specifically tailored for that job.'
      }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      cvs: { type: 'array' },
      tailoredResume: { type: ['object', 'null'] }
    },
    required: ['success', 'cvs']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const cvs = await CV.find({ user: context.user._id }).sort({ createdAt: -1 });
    let tailoredResume = null;
    if (params.jobId) {
      tailoredResume = await TailoredResume.findOne({ user: context.user._id, job: params.jobId });
    }
    return {
      success: true,
      cvs: cvs.map(c => ({
        id: c._id,
        originalName: c.originalName,
        size: c.size,
        uploadedAt: c.createdAt
      })),
      tailoredResume: tailoredResume ? {
        id: tailoredResume._id,
        targetTitle: tailoredResume.targetTitle,
        summary: tailoredResume.summary,
        skills: tailoredResume.skills,
        pdfPath: tailoredResume.pdfPath,
        docxPath: tailoredResume.docxPath
      } : null
    };
  }
};
