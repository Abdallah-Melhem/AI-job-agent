const Job = require('../../models/Job');
const Profile = require('../../models/Profile');
const { tailorResumeForJob } = require('../../services/tailoringService');

module.exports = {
  name: 'tailorResume',
  description: 'Generate an ATS-friendly, tailored resume (PDF and DOCX) customized for a specific job application.',
  parameters: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'The MongoDB ObjectId of the job to tailor the resume for' }
    },
    required: ['jobId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      tailoredResumeId: { type: 'string' },
      targetTitle: { type: 'string' },
      summary: { type: 'string' },
      skills: { type: 'array' },
      pdfPath: { type: 'string' },
      docxPath: { type: 'string' }
    },
    required: ['success', 'targetTitle']
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

    const result = await tailorResumeForJob(context.user, profile, job);
    return {
      success: true,
      tailoredResumeId: result.tailoredResume._id.toString(),
      targetTitle: result.tailoredResume.targetTitle,
      summary: result.tailoredResume.summary,
      skills: result.tailoredResume.skills,
      pdfPath: result.tailoredResume.pdfPath,
      docxPath: result.tailoredResume.docxPath,
      validation: result.validation
    };
  }
};
