const Profile = require('../../models/Profile');

module.exports = {
  name: 'getCandidateProfile',
  description: 'Retrieve the structured candidate profile (skills, experience, education, projects, contact info) for the authenticated user.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      profile: { type: ['object', 'null'] }
    },
    required: ['success']
  },
  permission: 'authenticated_user',
  async execute(params, context) {
    const profile = await Profile.findOne({ user: context.user._id });
    return {
      success: true,
      profile: profile ? {
        skills: profile.skills,
        languages: profile.languages,
        education: profile.education,
        experience: profile.experience,
        projects: profile.projects,
        certifications: profile.certifications,
        phone: profile.phone,
        location: profile.location,
        links: profile.links,
        preferences: profile.preferences
      } : null
    };
  }
};
