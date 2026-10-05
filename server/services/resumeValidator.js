const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

const resumeSchema = {
  type: 'object',
  properties: {
    targetTitle: { type: 'string', minLength: 2 },
    summary: { type: 'string', minLength: 20 },
    skills: { type: 'array', items: { type: 'string' } },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          position: { type: 'string' },
          company: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } }
        },
        required: ['position', 'company', 'highlights']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          degree: { type: 'string' },
          institution: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },
        required: ['degree', 'institution']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  },
  required: ['targetTitle', 'summary', 'skills', 'experience', 'education']
};

/**
 * Validates the structured resume against ATS requirements and truthfulness
 */
function validateTailoredResume(structuredResume, originalProfile) {
  const errors = [];

  // 1. Schema validation
  const validate = ajv.compile(resumeSchema);
  if (!validate(structuredResume)) {
    const ajvErrors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
    errors.push(`Schema validation failed: ${ajvErrors}`);
  }

  // 2. Truthfulness check: ensure AI did not invent fake companies
  const originalCompanies = (originalProfile?.experience || []).map(e => (e.company || '').toLowerCase().trim());
  if (structuredResume.experience && structuredResume.experience.length > 0) {
    for (const exp of structuredResume.experience) {
      const expCompany = (exp.company || '').toLowerCase().trim();
      if (originalCompanies.length > 0 && !originalCompanies.some(orig => orig.includes(expCompany) || expCompany.includes(orig))) {
        // Warning / correction rather than hard crash to keep resilience
        errors.push(`Truthfulness warning: Company "${exp.company}" does not match candidate profile`);
      }
    }
  }

  // 3. ATS & Conciseness checks
  if (structuredResume.summary && structuredResume.summary.length > 800) {
    errors.push('Summary is too long for ATS standards (maximum 800 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  resumeSchema,
  validateTailoredResume
};
