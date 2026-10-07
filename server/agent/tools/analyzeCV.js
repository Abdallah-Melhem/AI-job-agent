/**
 * analyzeCV.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Analyzes candidate's uploaded/active CV for completeness, extracted sections,
 * and identifies potential gaps or warnings.
 */

'use strict';

const CV = require('../../models/CV');
const Profile = require('../../models/Profile');

module.exports = {
  name: 'analyzeCV',
  description: 'Analyze candidate CV document and profile completeness, identifying strengths and missing sections.',
  parameters: {
    type: 'object',
    properties: {
      cvId: { type: 'string', description: 'Optional specific CV document ID. Defaults to active CV.' }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      completenessScore: { type: 'number' },
      sectionsFound: { type: 'array' },
      missingSections: { type: 'array' },
      isScanned: { type: 'boolean' },
      recommendations: { type: 'array' }
    },
    required: ['success', 'completenessScore']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const query = { user: context.user._id };
    if (params.cvId) {
      query._id = params.cvId;
    } else {
      query.isActive = true;
    }

    const cv = await CV.findOne(query).sort({ createdAt: -1 });
    const profile = await Profile.findOne({ user: context.user._id });

    const sectionsFound = [];
    const missingSections = [];
    const recommendations = [];

    // Analyze skills
    const skills = profile?.skills || cv?.parsedData?.skills?.technical || [];
    if (skills.length > 0) sectionsFound.push('Skills');
    else {
      missingSections.push('Skills');
      recommendations.push('Add key technical and domain skills to improve automated matching.');
    }

    // Analyze experience
    const experience = profile?.experience || cv?.parsedData?.experience || [];
    if (experience.length > 0) sectionsFound.push('Experience');
    else {
      missingSections.push('Experience');
      recommendations.push('Record previous work roles or academic projects with clear bullet points.');
    }

    // Analyze education
    const education = profile?.education || cv?.parsedData?.education || [];
    if (education.length > 0) sectionsFound.push('Education');
    else {
      missingSections.push('Education');
      recommendations.push('Include academic degrees, universities, and graduation dates.');
    }

    // Summary / headline
    if (profile?.summary) sectionsFound.push('Professional Summary');
    else recommendations.push('Add a concise 2–3 sentence professional summary.');

    // Completeness calculation
    const totalCoreSections = 4;
    const completenessScore = Math.round((sectionsFound.length / totalCoreSections) * 100);

    return {
      success: true,
      cvId: cv ? cv._id.toString() : null,
      isScanned: cv ? Boolean(cv.isScanned) : false,
      completenessScore,
      sectionsFound,
      missingSections,
      recommendations
    };
  }
};
