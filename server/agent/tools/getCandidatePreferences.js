/**
 * getCandidatePreferences.js — Controlled Agent Tool
 * Phase 8: AI Agent and Controlled Tools
 *
 * Retrieves candidate job search preferences (locations, salary, employment types, keywords).
 */

'use strict';

const Profile = require('../../models/Profile');

module.exports = {
  name: 'getCandidatePreferences',
  description: 'Retrieve candidate job search preferences (locations, salary expectations, employment types).',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      preferences: { type: 'object' }
    },
    required: ['success', 'preferences']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const profile = await Profile.findOne({ user: context.user._id });
    const prefs = profile?.preferences || {};

    return {
      success: true,
      preferences: {
        locations: prefs.locations || (profile?.location ? [profile.location] : []),
        employmentTypes: prefs.employmentTypes || [],
        salary: prefs.salary || null,
        keywords: prefs.keywords || { include: [], exclude: [] },
        companies: prefs.companies || { include: [], exclude: [] }
      }
    };
  }
};
