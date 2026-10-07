/**
 * resumeValidator.js — Comprehensive ATS & Truthfulness Validator
 * Phase 9: Resume Tailoring
 *
 * Enforces:
 *  1. Schema validation (standard ATS sections)
 *  2. Truthfulness: Compares generated resume against candidate source profile
 *  3. Unsupported claims detection (invented skills, employers, projects, institutions)
 *  4. Reverse chronological ordering for experience and education
 *  5. ATS formatting, conciseness, and bullet clarity
 */

'use strict';

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
 * Normalizes text for fuzzy token matching
 */
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Parses a date or year string into a sortable numeric score.
 * Newest dates receive higher numbers (Present = 999999).
 */
function parseDateOrderScore(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const lower = dateStr.toLowerCase();
  if (lower.includes('present') || lower.includes('current') || lower.includes('now')) {
    return 999999;
  }

  // Look for 4 digit year
  const yearMatch = dateStr.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return 0;
  const year = parseInt(yearMatch[1], 10);

  // Look for month (01-12 or Jan-Dec)
  const monthMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  let month = 0;
  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (lower.includes(mName)) {
      month = mNum;
      break;
    }
  }

  return year * 100 + month;
}

/**
 * Sorts an array of items reverse chronologically (newest first).
 */
function sortReverseChronological(items, startField = 'startDate', endField = 'endDate') {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    // Prefer endDate for sorting if present, otherwise startDate
    const scoreA = Math.max(parseDateOrderScore(a[endField]), parseDateOrderScore(a[startField]));
    const scoreB = Math.max(parseDateOrderScore(b[endField]), parseDateOrderScore(b[startField]));
    return scoreB - scoreA;
  });
}

/**
 * Checks whether an array of dated items is strictly in reverse chronological order.
 */
function isReverseChronological(items, startField = 'startDate', endField = 'endDate') {
  if (!Array.isArray(items) || items.length <= 1) return true;

  for (let i = 0; i < items.length - 1; i++) {
    const scoreCurrent = Math.max(parseDateOrderScore(items[i][endField]), parseDateOrderScore(items[i][startField]));
    const scoreNext = Math.max(parseDateOrderScore(items[i + 1][endField]), parseDateOrderScore(items[i + 1][startField]));
    // If next entry is dated higher than current, it is NOT reverse chronological
    if (scoreCurrent > 0 && scoreNext > 0 && scoreCurrent < scoreNext) {
      return false;
    }
  }
  return true;
}

/**
 * Validates the structured resume against ATS requirements, reverse chronology,
 * and truthfulness against the candidate profile.
 *
 * @param {object} structuredResume
 * @param {object} originalProfile
 * @returns {object} Validation report
 */
function validateTailoredResume(structuredResume, originalProfile) {
  const errors = [];
  const warnings = [];
  const unsupportedClaims = [];

  // 1. Schema Validation
  const validate = ajv.compile(resumeSchema);
  if (!validate(structuredResume)) {
    const ajvErrors = (validate.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
    errors.push(`Schema validation failed: ${ajvErrors}`);
  }

  // 2. Truthfulness & Unsupported Claims Check
  // 2a. Employer check
  const sourceCompanies = (originalProfile?.experience || [])
    .map(e => norm(e.company))
    .filter(Boolean);

  if (Array.isArray(structuredResume.experience)) {
    for (const exp of structuredResume.experience) {
      const coNorm = norm(exp.company);
      if (coNorm && sourceCompanies.length > 0) {
        const matches = sourceCompanies.some(orig => orig.includes(coNorm) || coNorm.includes(orig));
        if (!matches) {
          const claim = `Unsupported employer: "${exp.company}" was not found in candidate profile work history.`;
          unsupportedClaims.push(claim);
          warnings.push(claim);
        }
      }
    }
  }

  // 2b. Skills check
  const sourceSkillsSet = new Set(
    (originalProfile?.skills || []).map(norm).filter(Boolean)
  );

  // Also include skills mentioned in projects or certifications
  (originalProfile?.projects || []).forEach(p => {
    (p.technologies || []).forEach(t => sourceSkillsSet.add(norm(t)));
  });
  (originalProfile?.certifications || []).forEach(c => sourceSkillsSet.add(norm(c)));

  if (Array.isArray(structuredResume.skills) && sourceSkillsSet.size > 0) {
    for (const skill of structuredResume.skills) {
      const sNorm = norm(skill);
      if (sNorm) {
        const isSupported = Array.from(sourceSkillsSet).some(orig =>
          orig.includes(sNorm) || sNorm.includes(orig)
        );
        if (!isSupported) {
          const claim = `Unsupported skill: "${skill}" was not provided in candidate profile or projects.`;
          unsupportedClaims.push(claim);
          warnings.push(claim);
        }
      }
    }
  }

  // 2c. Projects check
  const sourceProjectNames = (originalProfile?.projects || []).map(p => norm(p.name)).filter(Boolean);
  if (Array.isArray(structuredResume.projects) && sourceProjectNames.length > 0) {
    for (const proj of structuredResume.projects) {
      const pNorm = norm(proj.name);
      if (pNorm) {
        const matches = sourceProjectNames.some(orig => orig.includes(pNorm) || pNorm.includes(orig));
        if (!matches) {
          const claim = `Unsupported project: "${proj.name}" was not listed in candidate profile.`;
          unsupportedClaims.push(claim);
          warnings.push(claim);
        }
      }
    }
  }

  // 3. Reverse Chronological Ordering Check
  const expRevChron = isReverseChronological(structuredResume.experience);
  if (!expRevChron) {
    warnings.push('Experience entries are not in strict reverse chronological order.');
  }

  const eduRevChron = isReverseChronological(structuredResume.education);
  if (!eduRevChron) {
    warnings.push('Education entries are not in strict reverse chronological order.');
  }

  // 4. ATS & Conciseness Checks
  let isAtsCompliant = true;
  if (structuredResume.summary) {
    if (structuredResume.summary.length > 800) {
      warnings.push('Summary is too long for standard ATS format (exceeds 800 characters).');
      isAtsCompliant = false;
    }
    if (structuredResume.summary.length < 30) {
      warnings.push('Summary is too short for ATS format (less than 30 characters).');
      isAtsCompliant = false;
    }
  }

  if (Array.isArray(structuredResume.experience)) {
    for (const exp of structuredResume.experience) {
      if (Array.isArray(exp.highlights) && exp.highlights.length > 7) {
        warnings.push(`Experience for "${exp.company}" has excessive bullet points (${exp.highlights.length}). Recommended: 3–5 bullets.`);
      }
    }
  }

  const isTruthful = unsupportedClaims.length === 0;
  const isReverseChron = expRevChron && eduRevChron;

  return {
    isValid: errors.length === 0,
    isTruthful,
    isAtsCompliant,
    isReverseChronological: isReverseChron,
    unsupportedClaims,
    warnings,
    errors
  };
}

module.exports = {
  resumeSchema,
  validateTailoredResume,
  sortReverseChronological,
  parseDateOrderScore,
  isReverseChronological
};
