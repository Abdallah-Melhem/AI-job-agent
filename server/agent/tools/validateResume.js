/**
 * validateResume.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Validates a tailored or uploaded resume for ATS formatting and anti-hallucination truthfulness.
 */

'use strict';

const Profile = require('../../models/Profile');
const TailoredResume = require('../../models/TailoredResume');
const { validateTailoredResume } = require('../../services/resumeValidator');

module.exports = {
  name: 'validateResume',
  description: 'Validate tailored resume against ATS requirements and verify factual truthfulness.',
  parameters: {
    type: 'object',
    properties: {
      tailoredResumeId: { type: 'string', description: 'ID of the TailoredResume to validate' },
      jobId: { type: 'string', description: 'Optional Job ID to lookup tailored resume' }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      isValid: { type: 'boolean' },
      errors: { type: 'array' }
    },
    required: ['success', 'isValid']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const profile = await Profile.findOne({ user: context.user._id });
    if (!profile) {
      throw new Error('Candidate profile not found.');
    }

    let tailored = null;
    if (params.tailoredResumeId) {
      tailored = await TailoredResume.findById(params.tailoredResumeId);
    } else if (params.jobId) {
      tailored = await TailoredResume.findOne({ user: context.user._id, job: params.jobId });
    } else {
      tailored = await TailoredResume.findOne({ user: context.user._id }).sort({ createdAt: -1 });
    }

    if (!tailored) {
      return {
        success: false,
        isValid: false,
        errors: ['No tailored resume found to validate. Please tailor a resume first.']
      };
    }

    const structuredResume = {
      targetTitle: tailored.targetTitle,
      summary: tailored.summary,
      skills: tailored.skills,
      experience: tailored.experience,
      education: tailored.education,
      projects: tailored.projects
    };

    const validation = validateTailoredResume(structuredResume, profile);

    return {
      success: true,
      tailoredResumeId: tailored._id.toString(),
      targetTitle: tailored.targetTitle,
      isValid: validation.isValid,
      errors: validation.errors
    };
  }
};
