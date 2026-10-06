/**
 * Job Normalizer
 *
 * Shared utilities used by all source adapters to produce a consistent
 * normalized job object that matches the Job mongoose schema.
 *
 * Centralizing this logic means:
 *  - All adapters produce the same shape
 *  - Enum normalization rules are in one place
 *  - Adding a new adapter requires less boilerplate
 */

/**
 * Normalize a raw job type string into one of the allowed Job schema enum values.
 *
 * @param {string|string[]} rawType - raw type value(s) from the source
 * @returns {'full-time'|'part-time'|'contract'|'internship'|'freelance'|'other'}
 */
function normalizeJobType(rawType) {
  const allowedTypes = ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'other'];

  // Accept array (e.g. Arbeitnow job_types) or string
  const raw = Array.isArray(rawType) ? rawType[0] : rawType;
  if (!raw) return 'full-time';

  const lower = String(raw).toLowerCase().trim();

  // Exact match first
  if (allowedTypes.includes(lower)) return lower;

  // Pattern matching for common variants
  if (lower.includes('part') || lower.includes('teilzeit')) return 'part-time';
  if (
    lower.includes('intern') ||
    lower.includes('praktik') ||
    lower.includes('werkstudent') ||
    lower.includes('working student') ||
    lower.includes('student') ||
    lower.includes('trainee') ||
    lower.includes('apprentice')
  ) return 'internship';
  if (lower.includes('contract') || lower.includes('befristet') || lower.includes('freelance') === false && lower.includes('contracting')) return 'contract';
  if (lower.includes('freelance') || lower.includes('freiberuflich')) return 'freelance';
  if (
    lower.includes('full') ||
    lower.includes('vollzeit') ||
    lower.includes('permanent') ||
    lower.includes('experienced') ||
    lower.includes('berufserfahren') ||
    lower.includes('professional') ||
    lower.includes('unbefristet')
  ) return 'full-time';

  // Unknown type — use 'other' rather than defaulting to full-time silently
  return 'other';
}

/**
 * Normalize a raw remote/work-mode value into one of the allowed Job schema enum values.
 *
 * @param {string|boolean} rawRemote - raw remote value from the source
 * @returns {'remote'|'hybrid'|'onsite'|'unknown'}
 */
function normalizeRemote(rawRemote) {
  if (rawRemote === true || rawRemote === 'remote') return 'remote';
  if (rawRemote === false || rawRemote === 'onsite' || rawRemote === 'on-site') return 'onsite';
  if (rawRemote === 'hybrid') return 'hybrid';
  if (typeof rawRemote === 'string') {
    const lower = rawRemote.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('onsite') || lower.includes('office') || lower.includes('on-site')) return 'onsite';
  }
  return 'unknown';
}

/**
 * Strip HTML tags from a string and trim whitespace.
 *
 * @param {string} html
 * @param {number} [maxLength=3000] - truncate to this many characters
 * @returns {string}
 */
function stripHtml(html, maxLength = 3000) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>?/gm, '')       // strip tags
    .replace(/&nbsp;/g, ' ')         // decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n\n')      // collapse multiple blank lines
    .trim()
    .slice(0, maxLength);
}

/**
 * Parse a salary value from a raw source into a number or undefined.
 *
 * @param {string|number|null|undefined} raw
 * @returns {number|undefined}
 */
function parseSalaryValue(raw) {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const parsed = Number(raw);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Normalize a salary period label into the allowed schema enum.
 *
 * @param {string} raw
 * @returns {'hourly'|'monthly'|'yearly'|''}
 */
function normalizeSalaryPeriod(raw) {
  if (!raw) return '';
  const lower = String(raw).toLowerCase();
  if (lower.includes('hour')) return 'hourly';
  if (lower.includes('month')) return 'monthly';
  if (lower.includes('year') || lower.includes('annual')) return 'yearly';
  return '';
}

/**
 * Ensure externalId is always a non-empty string.
 *
 * @param {string|number} rawId
 * @returns {string}
 */
function normalizeExternalId(rawId) {
  return String(rawId).trim();
}

/**
 * Normalize seniority / experience level from raw input or job title.
 *
 * @param {string} [rawLevel]
 * @param {string} [title='']
 * @returns {'entry-level'|'junior'|'mid-level'|'senior'|'lead'|'executive'|'not-specified'}
 */
function normalizeExperienceLevel(rawLevel = '', title = '') {
  const text = `${rawLevel || ''} ${title || ''}`.toLowerCase();

  if (/\b(intern|internship|trainee|apprentice|werkstudent|working student|graduate|entry[- ]?level)\b/i.test(text)) {
    return 'entry-level';
  }
  if (/\b(junior|jr\.?|associate)\b/i.test(text)) {
    return 'junior';
  }
  if (/\b(lead|principal|staff|head of|director|team lead)\b/i.test(text)) {
    return 'lead';
  }
  if (/\b(vp|vice president|cxo|cto|cfo|ceo|chief|executive)\b/i.test(text)) {
    return 'executive';
  }
  if (/\b(senior|sr\.?|experienced|expert)\b/i.test(text)) {
    return 'senior';
  }
  if (/\b(mid[- ]?level|intermediate)\b/i.test(text)) {
    return 'mid-level';
  }

  return 'not-specified';
}

/**
 * Extract or normalize country name from location/geo string.
 *
 * @param {string} location
 * @param {string} [geo='']
 * @returns {string} Country name or empty string if unavailable
 */
function extractCountry(location = '', geo = '') {
  const combined = `${geo || ''} ${location || ''}`.trim();
  if (!combined) return '';

  const lower = combined.toLowerCase();
  if (/\b(united states|usa|u\.s\.a\.?|us\b)\b/i.test(lower)) return 'United States';
  if (/\b(united kingdom|uk\b|u\.k\.|great britain|england|scotland|wales)\b/i.test(lower)) return 'United Kingdom';
  if (/\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt)\b/i.test(lower)) return 'Germany';
  if (/\b(portugal|lisbon|porto)\b/i.test(lower)) return 'Portugal';
  if (/\b(spain|espana|madrid|barcelona)\b/i.test(lower)) return 'Spain';
  if (/\b(france|paris)\b/i.test(lower)) return 'France';
  if (/\b(canada|toronto|vancouver|montreal)\b/i.test(lower)) return 'Canada';
  if (/\b(netherlands|holland|amsterdam)\b/i.test(lower)) return 'Netherlands';
  if (/\b(switzerland|zurich|geneva)\b/i.test(lower)) return 'Switzerland';
  if (/\b(austria|vienna|wien)\b/i.test(lower)) return 'Austria';
  if (/\b(remote|anywhere|worldwide|global)\b/i.test(lower)) return 'Worldwide';

  if (geo && typeof geo === 'string' && geo.length <= 40 && !geo.toLowerCase().includes('http')) {
    return geo.trim();
  }

  return '';
}

const { normalizeCategory, CANONICAL_CATEGORIES, CATEGORY_LIST } = require('./categoryNormalizer');

module.exports = {
  normalizeJobType,
  normalizeRemote,
  stripHtml,
  parseSalaryValue,
  normalizeSalaryPeriod,
  normalizeExternalId,
  normalizeCategory,
  normalizeExperienceLevel,
  extractCountry,
  CANONICAL_CATEGORIES,
  CATEGORY_LIST
};


