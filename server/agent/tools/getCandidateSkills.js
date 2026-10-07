/**
 * getCandidateSkills.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Retrieves verified candidate skills from profile and active CV.
 */

'use strict';

const Profile = require('../../models/Profile');
const CV = require('../../models/CV');

module.exports = {
  name: 'getCandidateSkills',
  description: 'Retrieve verified technical and business skills for the authenticated candidate.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      skills: { type: 'array' },
      languages: { type: 'array' },
      certifications: { type: 'array' }
    },
    required: ['success', 'skills']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const profile = await Profile.findOne({ user: context.user._id });
    const skillsSet = new Set(profile?.skills || []);
    const languages = profile?.languages || [];
    const certifications = profile?.certifications || [];

    // Also check active CV parsedData if available
    const activeCv = await CV.findOne({ user: context.user._id, isActive: true });
    if (activeCv?.parsedData?.skills) {
      const cvSkills = activeCv.parsedData.skills;
      (cvSkills.technical || []).forEach(s => skillsSet.add(s));
      (cvSkills.tools || []).forEach(s => skillsSet.add(s));
      (cvSkills.nonTechBusiness || []).forEach(s => skillsSet.add(s));
    }

    return {
      success: true,
      skills: Array.from(skillsSet),
      languages,
      certifications
    };
  }
};
