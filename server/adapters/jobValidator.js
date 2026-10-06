/**
 * Job Validator
 *
 * Validates a normalized job object before it is inserted into the database.
 * This is the last line of defense before a job record is written.
 *
 * Responsibilities:
 *  - Check required fields exist and are non-empty
 *  - Check enum values are valid
 *  - Check string lengths are within limits
 *  - Return structured validation results (not throw) so the caller can skip
 *    individual bad records without crashing the entire import batch
 */

const VALID_TYPES   = ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'other'];
const VALID_REMOTE  = ['remote', 'hybrid', 'onsite', 'unknown'];
const VALID_STATUS  = ['active', 'closed', 'archived', 'draft'];
const VALID_PERIODS = ['hourly', 'monthly', 'yearly', ''];
const VALID_LEVELS  = ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'executive', 'not-specified'];

const MAX_TITLE_LEN       = 200;
const MAX_COMPANY_LEN     = 200;
const MAX_LOCATION_LEN    = 200;
const MAX_COUNTRY_LEN     = 100;
const MAX_CATEGORY_LEN    = 100;
const MAX_DESCRIPTION_LEN = 10000;
const MAX_EXTERNAL_ID_LEN = 500;

/**
 * Validate a normalized job object.
 *
 * @param {object} job - normalized job object
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateJob(job) {
  const errors = [];

  if (!job || typeof job !== 'object') {
    return { valid: false, errors: ['Job must be a non-null object'] };
  }

  // ── Required fields ────────────────────────────────────────────────
  if (!job.source || typeof job.source !== 'string' || !job.source.trim()) {
    errors.push('Missing or empty required field: source');
  }

  if (!job.externalId || typeof job.externalId !== 'string' || !job.externalId.trim()) {
    errors.push('Missing or empty required field: externalId');
  } else if (job.externalId.length > MAX_EXTERNAL_ID_LEN) {
    errors.push(`externalId exceeds maximum length of ${MAX_EXTERNAL_ID_LEN}`);
  }

  if (!job.title || typeof job.title !== 'string' || !job.title.trim()) {
    errors.push('Missing or empty required field: title');
  } else if (job.title.length > MAX_TITLE_LEN) {
    errors.push(`title exceeds maximum length of ${MAX_TITLE_LEN}`);
  }

  if (!job.company || typeof job.company !== 'string' || !job.company.trim()) {
    errors.push('Missing or empty required field: company');
  } else if (job.company.length > MAX_COMPANY_LEN) {
    errors.push(`company exceeds maximum length of ${MAX_COMPANY_LEN}`);
  }

  // ── Enum fields ─────────────────────────────────────────────────────
  if (job.type && !VALID_TYPES.includes(job.type)) {
    errors.push(`Invalid job type: "${job.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (job.remote && !VALID_REMOTE.includes(job.remote)) {
    errors.push(`Invalid remote value: "${job.remote}". Must be one of: ${VALID_REMOTE.join(', ')}`);
  }

  if (job.status && !VALID_STATUS.includes(job.status)) {
    errors.push(`Invalid status: "${job.status}". Must be one of: ${VALID_STATUS.join(', ')}`);
  }

  if (job.experienceLevel && !VALID_LEVELS.includes(job.experienceLevel)) {
    errors.push(`Invalid experienceLevel: "${job.experienceLevel}". Must be one of: ${VALID_LEVELS.join(', ')}`);
  }

  if (job.salary && job.salary.period && !VALID_PERIODS.includes(job.salary.period)) {
    errors.push(`Invalid salary period: "${job.salary.period}". Must be one of: ${VALID_PERIODS.join(', ')}`);
  }

  // ── Optional length limits ───────────────────────────────────────────
  if (job.location && job.location.length > MAX_LOCATION_LEN) {
    errors.push(`location exceeds maximum length of ${MAX_LOCATION_LEN}`);
  }

  if (job.country && job.country.length > MAX_COUNTRY_LEN) {
    errors.push(`country exceeds maximum length of ${MAX_COUNTRY_LEN}`);
  }

  if (job.category) {
    if (typeof job.category !== 'string') {
      errors.push('category must be a string');
    } else if (job.category.length > MAX_CATEGORY_LEN) {
      errors.push(`category exceeds maximum length of ${MAX_CATEGORY_LEN}`);
    }
  }

  if (job.description && job.description.length > MAX_DESCRIPTION_LEN) {
    errors.push(`description exceeds maximum length of ${MAX_DESCRIPTION_LEN}`);
  }

  // ── Date fields ──────────────────────────────────────────────────────
  if (job.postedAt && !(job.postedAt instanceof Date) && isNaN(new Date(job.postedAt).getTime())) {
    errors.push('postedAt is not a valid date');
  }

  // ── Skills / requirements type checks ────────────────────────────────
  if (job.skills !== undefined && !Array.isArray(job.skills)) {
    errors.push('skills must be an array');
  }

  if (job.requirements !== undefined && !Array.isArray(job.requirements)) {
    errors.push('requirements must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { validateJob };
