/**
 * Category Normalizer
 *
 * Normalizes source categories, industries, tags, and job titles into canonical
 * application categories.
 *
 * Supports both Technology and Non-Technology categories per Phase 3 specifications.
 */

const CANONICAL_CATEGORIES = {
  // ── Technology ──────────────────────────────────────────────────────────
  SOFTWARE_DEVELOPMENT: 'Software Development',
  WEB_DEVELOPMENT:      'Web Development',
  MOBILE_DEVELOPMENT:   'Mobile Development',
  QA_TESTING:           'QA/Testing',
  DEVOPS:               'DevOps',
  CLOUD:                'Cloud',
  CYBERSECURITY:        'Cybersecurity',
  DATA:                 'Data',
  AI_ML:                'AI/ML',
  IT_SUPPORT:           'IT Support',
  DATABASE:             'Database',

  // ── Non-Technology ──────────────────────────────────────────────────────
  CUSTOMER_SERVICE:     'Customer Service',
  SALES:                'Sales',
  MARKETING:            'Marketing',
  HUMAN_RESOURCES:      'Human Resources',
  FINANCE:              'Finance',
  ACCOUNTING:           'Accounting',
  ADMINISTRATION:       'Administration',
  OPERATIONS:           'Operations',
  LOGISTICS:            'Logistics',
  DESIGN:               'Design',
  CONTENT:              'Content',
  EDUCATION:            'Education',
  HOSPITALITY:          'Hospitality',
  RETAIL:               'Retail',
  OTHER:                'Other'
};

const CATEGORY_LIST = Object.values(CANONICAL_CATEGORIES);

/**
 * Categorization rules mapping keywords/patterns to canonical categories.
 * Order matters: more specific categories appear earlier.
 */
const CATEGORY_RULES = [
  // ── AI / ML
  {
    category: CANONICAL_CATEGORIES.AI_ML,
    patterns: [/\bai\b/i, /artificial intelligence/i, /machine learning/i, /\bml\b/i, /nlp/i, /deep learning/i, /llm/i, /data scientist/i]
  },
  // ── Cybersecurity
  {
    category: CANONICAL_CATEGORIES.CYBERSECURITY,
    patterns: [/cybersecurity/i, /security/i, /infosec/i, /soc analyst/i, /penetration/i, /compliance/i]
  },
  // ── DevOps / Cloud
  {
    category: CANONICAL_CATEGORIES.DEVOPS,
    patterns: [/devops/i, /\bsre\b/i, /site reliability/i, /infrastructure/i, /ci\/cd/i, /kubernetes/i, /docker/i, /terraform/i]
  },
  {
    category: CANONICAL_CATEGORIES.CLOUD,
    patterns: [/cloud/i, /\baws\b/i, /\bgcp\b/i, /\bazure\b/i]
  },
  // ── Mobile Development
  {
    category: CANONICAL_CATEGORIES.MOBILE_DEVELOPMENT,
    patterns: [/mobile/i, /ios/i, /android/i, /react native/i, /flutter/i, /swift\b/i, /kotlin\b/i]
  },
  // ── Web Development
  {
    category: CANONICAL_CATEGORIES.WEB_DEVELOPMENT,
    patterns: [/frontend/i, /front-end/i, /front end/i, /web developer/i, /react/i, /vue/i, /angular/i, /fullstack/i, /full-stack/i, /full stack/i, /html/i, /css/i]
  },
  // ── QA / Testing
  {
    category: CANONICAL_CATEGORIES.QA_TESTING,
    patterns: [/\bqa\b/i, /quality assurance/i, /test engineer/i, /tester/i, /automation tester/i]
  },
  // ── Database / Data
  {
    category: CANONICAL_CATEGORIES.DATABASE,
    patterns: [/database/i, /\bdba\b/i, /sql/i, /mongodb/i, /postgres/i]
  },
  {
    category: CANONICAL_CATEGORIES.DATA,
    patterns: [/data engineer/i, /data analyst/i, /analytics/i, /big data/i, /business intelligence/i, /\bbi\b/i]
  },
  // ── IT Support
  {
    category: CANONICAL_CATEGORIES.IT_SUPPORT,
    patterns: [/it support/i, /help desk/i, /technical support/i, /sysadmin/i, /system administrator/i, /it specialist/i]
  },
  // ── Software Development (General)
  {
    category: CANONICAL_CATEGORIES.SOFTWARE_DEVELOPMENT,
    patterns: [/software/i, /developer/i, /engineer/i, /backend/i, /back-end/i, /back end/i, /programmer/i, /java\b/i, /python/i, /golang/i, /c\+\+/i, /\bc#\b/i, /\.net/i, /softwareentwicklung/i]
  },

  // ── Non-Technology Categories ──────────────────────────────────────────
  // ── Customer Service
  {
    category: CANONICAL_CATEGORIES.CUSTOMER_SERVICE,
    patterns: [/customer service/i, /customer support/i, /customer success/i, /client support/i, /kundenservice/i, /support specialist/i]
  },
  // ── Sales
  {
    category: CANONICAL_CATEGORIES.SALES,
    patterns: [/sales/i, /account executive/i, /business development/i, /\bbdr\b/i, /\bsdr\b/i, /vertrieb/i, /verkäufer/i]
  },
  // ── Marketing
  {
    category: CANONICAL_CATEGORIES.MARKETING,
    patterns: [/marketing/i, /\bseo\b/i, /\bsem\b/i, /social media/i, /campaign/i, /brand/i, /growth/i]
  },
  // ── Human Resources
  {
    category: CANONICAL_CATEGORIES.HUMAN_RESOURCES,
    patterns: [/human resources/i, /\bhr\b/i, /recruiter/i, /recruiting/i, /talent acquisition/i, /people operations/i, /personal/i]
  },
  // ── Accounting
  {
    category: CANONICAL_CATEGORIES.ACCOUNTING,
    patterns: [/accounting/i, /accountant/i, /bookkeeper/i, /buchhaltung/i, /buchhalter/i, /payroll/i]
  },
  // ── Finance
  {
    category: CANONICAL_CATEGORIES.FINANCE,
    patterns: [/finance/i, /financial/i, /finanz/i, /controller/i, /investment/i, /banking/i]
  },
  // ── Administration
  {
    category: CANONICAL_CATEGORIES.ADMINISTRATION,
    patterns: [/administration/i, /administrative/i, /executive assistant/i, /office manager/i, /sachbearbeitung/i, /innendienst/i, /clerk/i]
  },
  // ── Operations
  {
    category: CANONICAL_CATEGORIES.OPERATIONS,
    patterns: [/operations/i, /\bops\b/i, /product operations/i, /business operations/i, /process manager/i]
  },
  // ── Logistics
  {
    category: CANONICAL_CATEGORIES.LOGISTICS,
    patterns: [/logistics/i, /supply chain/i, /warehouse/i, /shipping/i, /logistik/i]
  },
  // ── Design
  {
    category: CANONICAL_CATEGORIES.DESIGN,
    patterns: [/design/i, /designer/i, /\bui\b/i, /\bux\b/i, /graphic/i, /product designer/i, /art director/i]
  },
  // ── Content
  {
    category: CANONICAL_CATEGORIES.CONTENT,
    patterns: [/content/i, /copywriter/i, /writer/i, /editor/i, /journalist/i, /texter/i]
  },
  // ── Education
  {
    category: CANONICAL_CATEGORIES.EDUCATION,
    patterns: [/education/i, /teacher/i, /instructor/i, /tutor/i, /learning/i, /e-learning/i, /trainer/i]
  },
  // ── Hospitality
  {
    category: CANONICAL_CATEGORIES.HOSPITALITY,
    patterns: [/hospitality/i, /hotel/i, /restaurant/i, /barista/i, /chef/i, /waiter/i, /catering/i]
  },
  // ── Retail
  {
    category: CANONICAL_CATEGORIES.RETAIL,
    patterns: [/retail/i, /store associate/i, /cashier/i, /merchandiser/i, /einzelhandel/i]
  }
];

/**
 * Normalizes input hints (source industry, tags, job title) into a canonical category.
 *
 * @param {string|string[]} [rawCategory] - raw industry or category string/array
 * @param {string} [title=''] - job title
 * @param {string[]} [tags=[]] - job tags or keywords
 * @returns {string} canonical category name
 */
function normalizeCategory(rawCategory = '', title = '', tags = []) {
  // If rawCategory already matches a canonical category exactly (case-insensitive)
  const candidate = Array.isArray(rawCategory) ? rawCategory.join(' ') : String(rawCategory || '');
  const matchDirect = CATEGORY_LIST.find(c => c.toLowerCase() === candidate.trim().toLowerCase());
  if (matchDirect) return matchDirect;

  // Build combined search haystack: raw category + tags + title
  const tagsStr = Array.isArray(tags) ? tags.join(' ') : String(tags || '');
  const haystack = `${candidate} ${tagsStr} ${title}`.trim();

  if (!haystack) return CANONICAL_CATEGORIES.OTHER;

  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(haystack)) {
        return rule.category;
      }
    }
  }

  return CANONICAL_CATEGORIES.OTHER;
}

module.exports = {
  CANONICAL_CATEGORIES,
  CATEGORY_LIST,
  normalizeCategory
};
