/**
 * matchingService.js — Phase 6: Hybrid AI Matching Engine
 *
 * Architecture:
 *   1. Structured scoring  (deterministic, no AI required)
 *   2. AI semantic layer   (Gemini/Ollama — enriches explanation, optional)
 *   3. Result composition  (merge scores, build explainable breakdown)
 *
 * The structured score is always the primary source of truth.
 * The AI layer may adjust the final score within a bounded range and
 * provides the narrative explanation.  If AI is unavailable the
 * structured result is returned as-is with a lower confidence flag.
 *
 * Anti-fabrication rules enforced throughout:
 *   - matchingSkills must come from the candidate profile, not invented
 *   - missingSkills must come from the job requirements, not invented
 *   - experienceAssessment uses only data present in the profile
 */

'use strict';

const aiService = require('./aiService');

// ─── Weights ──────────────────────────────────────────────────────────────────
const WEIGHTS = {
  skills:       0.40,   // 40 %
  experience:   0.25,   // 25 %
  workMode:     0.10,   // 10 %
  jobType:      0.10,   // 10 %
  salary:       0.10,   // 10 %
  extras:       0.05    //  5 % (projects + certifications)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lowercase + strip punctuation for fuzzy comparison */
function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/** True if two skill strings are a reasonable match (substring or alias) */
function skillsMatch(candidateSkill, jobSkill) {
  const cs = normalize(candidateSkill);
  const js = normalize(jobSkill);
  if (!cs || !js) return false;
  return cs.includes(js) || js.includes(cs);
}

/**
 * Map an experience level string to a numeric tier:
 *  entry-level=1, junior=2, mid-level=3, senior=4, lead=5, executive=6
 */
const LEVEL_TIERS = {
  'entry-level': 1,
  'intern':      1,
  'junior':      2,
  'mid-level':   3,
  'mid':         3,
  'senior':      4,
  'lead':        5,
  'principal':   5,
  'executive':   6,
  'director':    6,
  'vp':          6,
  'c-level':     6
};

function levelTier(levelStr) {
  const key = normalize(levelStr || 'not-specified');
  for (const [k, v] of Object.entries(LEVEL_TIERS)) {
    if (key.includes(k)) return v;
  }
  return null; // unknown / not-specified → skip comparison
}

/**
 * Estimate candidate seniority from experience array.
 * Returns the highest tier found in position titles, or null if no experience.
 */
function estimateCandidateTier(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return null;
  let max = 1;
  for (const exp of experience) {
    const t = levelTier(exp.position || '');
    if (t !== null && t > max) max = t;
  }
  return max;
}

// ─── 1. Structured Scoring ────────────────────────────────────────────────────

/**
 * Score the skills dimension.
 *
 * @returns {{ score: number, matchingSkills: string[], missingSkills: string[], skillsRatio: number }}
 */
function scoreSkills(candidateProfile, job) {
  const candidateSkills = (candidateProfile.skills || []);
  const jobSkills       = (job.skills || []);

  if (jobSkills.length === 0) {
    // No required skills listed — can't score, neutral result
    return { score: 50, matchingSkills: [], missingSkills: [], skillsRatio: null };
  }

  const matchingSkills = [];
  const missingSkills  = [];

  for (const js of jobSkills) {
    const matched = candidateSkills.some(cs => skillsMatch(cs, js));
    if (matched) {
      matchingSkills.push(js);
    } else {
      missingSkills.push(js);
    }
  }

  // Also check non-tech/business skills if present in parsedData
  const businessSkills = (
    candidateProfile.parsedData?.skills?.nonTechBusiness || []
  );
  for (const bs of businessSkills) {
    for (const js of missingSkills) {
      if (skillsMatch(bs, js)) {
        // Move from missing → matching
        const idx = missingSkills.indexOf(js);
        if (idx !== -1) {
          missingSkills.splice(idx, 1);
          matchingSkills.push(js);
        }
      }
    }
  }

  const ratio = matchingSkills.length / jobSkills.length;
  const score = Math.round(ratio * 100);

  return { score, matchingSkills, missingSkills, skillsRatio: ratio };
}

/**
 * Score the experience level dimension.
 *
 * @returns {{ score: number, assessment: string }}
 */
function scoreExperience(candidateProfile, job) {
  const jobLevelStr = job.experienceLevel || 'not-specified';
  const jobTier     = levelTier(jobLevelStr);

  // Number of experience entries as a rough proxy for seniority
  const experienceCount = (candidateProfile.experience || []).length;
  const candidateTier   = estimateCandidateTier(candidateProfile.experience);

  // If job doesn't specify, we can't penalise
  if (jobTier === null) {
    return {
      score: 70,
      assessment: 'Job does not specify a required experience level.'
    };
  }

  if (candidateTier === null) {
    // Profile has no experience entries — we flag it but don't assume the worst
    return {
      score: 40,
      assessment: `Job requires ${jobLevelStr} level. Candidate profile has no recorded work experience to assess.`
    };
  }

  const diff = jobTier - candidateTier;

  let score;
  let assessment;

  if (diff <= 0) {
    // Candidate meets or exceeds required level
    score = 100;
    const verb = diff === 0 ? 'matches' : 'exceeds';
    assessment = `Candidate experience level (${Object.keys(LEVEL_TIERS).find(k => LEVEL_TIERS[k] === candidateTier) || 'unknown'}) ${verb} the job requirement (${jobLevelStr}).`;
  } else if (diff === 1) {
    score = 60;
    assessment = `Candidate experience level is one tier below the job requirement (${jobLevelStr}). May be a stretch role.`;
  } else {
    score = Math.max(10, 40 - (diff - 2) * 15);
    assessment = `Candidate experience level is ${diff} tiers below the job requirement (${jobLevelStr}). Significant gap.`;
  }

  // Bonus: many roles present → positive signal
  if (experienceCount >= 3 && score < 80) score = Math.min(score + 10, 80);

  return { score, assessment };
}

/**
 * Score work mode preference.
 * @returns {{ score: number, note: string|null }}
 */
function scoreWorkMode(candidateProfile, job) {
  const jobRemote = job.remote || 'unknown';

  // Check candidate preferences
  const prefLocations = (
    candidateProfile.preferences?.locations || []
  ).map(l => normalize(l));

  // If preferences are not set or job is unknown → neutral
  if (prefLocations.length === 0 || jobRemote === 'unknown') {
    return { score: 70, note: null };
  }

  const wantsRemote = prefLocations.some(l => l.includes('remote'));

  if (jobRemote === 'remote' && wantsRemote) return { score: 100, note: null };
  if (jobRemote === 'remote' && !wantsRemote) return { score: 55, note: 'Job is remote but candidate prefers on-site.' };
  if ((jobRemote === 'onsite' || jobRemote === 'hybrid') && wantsRemote) return { score: 55, note: 'Candidate prefers remote but job is ' + jobRemote + '.' };

  return { score: 85, note: null };
}

/**
 * Score employment type alignment.
 * @returns {{ score: number, note: string|null }}
 */
function scoreJobType(candidateProfile, job) {
  const jobType    = job.type || 'other';
  const prefTypes  = (candidateProfile.preferences?.employmentTypes || []).map(normalize);

  if (prefTypes.length === 0) return { score: 70, note: null };

  const matches = prefTypes.some(pt =>
    pt.includes(normalize(jobType)) || normalize(jobType).includes(pt)
  );

  if (matches) return { score: 100, note: null };

  return {
    score: 50,
    note: `Job is ${jobType} but candidate prefers: ${prefTypes.join(', ')}.`
  };
}

/**
 * Score salary alignment.
 * @returns {{ score: number, note: string|null }}
 */
function scoreSalary(candidateProfile, job) {
  const prefSalary = candidateProfile.preferences?.salary;
  const jobSalary  = job.salary;

  if (!prefSalary?.min || !jobSalary?.max) return { score: 70, note: null };

  const jobMax  = jobSalary.max || 0;
  const prefMin = prefSalary.min || 0;

  if (jobMax >= prefMin) return { score: 100, note: null };

  const gap = ((prefMin - jobMax) / prefMin) * 100;
  if (gap < 20) return { score: 60, note: 'Salary may be slightly below candidate expectation.' };
  if (gap < 40) return { score: 35, note: 'Salary is below candidate expectation.' };
  return { score: 15, note: 'Significant salary gap between job offer and candidate expectation.' };
}

/**
 * Score presence of projects and certifications (bonus signals).
 * @returns {{ score: number, note: string|null }}
 */
function scoreExtras(candidateProfile) {
  const projects  = (candidateProfile.projects || []).length;
  const certs     = (candidateProfile.certifications || []).length;

  if (projects === 0 && certs === 0) return { score: 30, note: 'No projects or certifications listed on profile.' };
  if (projects >= 2 && certs >= 1)   return { score: 100, note: null };
  if (projects >= 1 || certs >= 1)   return { score: 70, note: null };
  return { score: 50, note: null };
}

/**
 * Compose the weighted structured score from all dimension scores.
 */
function computeStructuredMatch(candidateProfile, job) {
  const skillsResult   = scoreSkills(candidateProfile, job);
  const expResult      = scoreExperience(candidateProfile, job);
  const workModeResult = scoreWorkMode(candidateProfile, job);
  const jobTypeResult  = scoreJobType(candidateProfile, job);
  const salaryResult   = scoreSalary(candidateProfile, job);
  const extrasResult   = scoreExtras(candidateProfile);

  const weightedScore =
    skillsResult.score   * WEIGHTS.skills   +
    expResult.score      * WEIGHTS.experience +
    workModeResult.score * WEIGHTS.workMode  +
    jobTypeResult.score  * WEIGHTS.jobType   +
    salaryResult.score   * WEIGHTS.salary    +
    extrasResult.score   * WEIGHTS.extras;

  const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore)));

  // Collect gap notes
  const gaps = [];
  if (workModeResult.note) gaps.push(workModeResult.note);
  if (jobTypeResult.note)  gaps.push(jobTypeResult.note);
  if (salaryResult.note)   gaps.push(salaryResult.note);
  if (extrasResult.note)   gaps.push(extrasResult.note);

  return {
    score:          finalScore,
    matchingSkills: skillsResult.matchingSkills,
    missingSkills:  skillsResult.missingSkills,
    skillsRatio:    skillsResult.skillsRatio,
    experienceAssessment: expResult.assessment,
    gaps,
    breakdown: {
      skills:     { score: skillsResult.score,   weight: WEIGHTS.skills },
      experience: { score: expResult.score,       weight: WEIGHTS.experience },
      workMode:   { score: workModeResult.score,  weight: WEIGHTS.workMode },
      jobType:    { score: jobTypeResult.score,   weight: WEIGHTS.jobType },
      salary:     { score: salaryResult.score,    weight: WEIGHTS.salary },
      extras:     { score: extrasResult.score,    weight: WEIGHTS.extras }
    }
  };
}

// ─── 2. AI Semantic Layer ─────────────────────────────────────────────────────

const aiMatchSchema = {
  type: 'object',
  properties: {
    semanticSkillInsights:  { type: 'string' },
    experienceNarrative:    { type: 'string' },
    overallExplanation:     { type: 'string' },
    scoreAdjustment:        { type: 'number', minimum: -15, maximum: 15 }
  },
  required: ['semanticSkillInsights', 'experienceNarrative', 'overallExplanation', 'scoreAdjustment']
};

/**
 * Ask the AI to enrich the structured result with semantic analysis.
 * Returns null if AI is unavailable.
 */
async function enrichWithAI(candidateProfile, job, structured) {
  const profileSummary = {
    skills:         candidateProfile.skills || [],
    experience:     (candidateProfile.experience || []).map(e => ({
      position: e.position,
      company:  e.company,
      duration: e.duration || `${e.startDate || ''} – ${e.endDate || 'present'}`
    })),
    education:      (candidateProfile.education || []).map(e => ({
      degree:      e.degree,
      institution: e.institution
    })),
    projects:       (candidateProfile.projects || []).map(p => p.name),
    certifications: candidateProfile.certifications || [],
    summary:        candidateProfile.summary || null
  };

  const jobSummary = {
    title:           job.title,
    company:         job.company,
    experienceLevel: job.experienceLevel,
    remote:          job.remote,
    type:            job.type,
    skills:          job.skills || [],
    requirements:    (job.requirements || []).slice(0, 8),
    descriptionSnippet: (job.description || '').slice(0, 600)
  };

  const prompt = `
You are an expert technical recruiter performing a precise job-candidate compatibility analysis.

STRICT RULES — VIOLATIONS WILL INVALIDATE YOUR RESPONSE:
1. Do NOT invent, fabricate, or assume any candidate skills, experience, or qualifications not listed below.
2. Only reference information explicitly present in the CANDIDATE PROFILE section.
3. If the candidate profile lacks a field, say so — do not fill it in.
4. scoreAdjustment must be between -15 and +15 — it adjusts an already-computed structured score.
5. Return ONLY a JSON object matching the schema, no prose outside the JSON.

CANDIDATE PROFILE (source of truth — use ONLY this data):
${JSON.stringify(profileSummary, null, 2)}

JOB DETAILS:
${JSON.stringify(jobSummary, null, 2)}

STRUCTURED SCORE (already computed): ${structured.score}/100
  - Skills match: ${structured.breakdown.skills.score}/100 (${structured.matchingSkills.length} of ${(structured.matchingSkills.length + structured.missingSkills.length)} job skills matched)
  - Experience:   ${structured.breakdown.experience.score}/100
  - Work mode:    ${structured.breakdown.workMode.score}/100
  - Job type:     ${structured.breakdown.jobType.score}/100
  - Salary:       ${structured.breakdown.salary.score}/100
  - Extras:       ${structured.breakdown.extras.score}/100

Provide:
- semanticSkillInsights: 1–2 sentences on skill depth/relevance using only listed skills
- experienceNarrative: 1–2 sentences on how listed experience relates to this specific role
- overallExplanation: 2–4 sentences summarising match quality, strengths, and key gaps
- scoreAdjustment: integer -15..+15, positive if semantic analysis reveals strong hidden fit, negative if semantic analysis reveals important gaps not captured structurally
`;

  try {
    const result = await aiService.generate(prompt, aiMatchSchema);
    // Validate that the AI didn't hallucinate skills
    if (result && Array.isArray(result.additionalMatchingSkills)) {
      // strip anything not in the profile
      const profileSkillsNorm = (candidateProfile.skills || []).map(normalize);
      result.additionalMatchingSkills = result.additionalMatchingSkills.filter(
        s => profileSkillsNorm.some(ps => skillsMatch(ps, s))
      );
    }
    return result;
  } catch {
    return null;
  }
}

// ─── 3. Result Composition ────────────────────────────────────────────────────

/**
 * Determine a human-readable confidence label.
 * Confidence is lower when profile data is sparse.
 */
function computeConfidence(candidateProfile, structured) {
  const hasSkills   = (candidateProfile.skills || []).length > 0;
  const hasExp      = (candidateProfile.experience || []).length > 0;
  const hasJobSkills = structured.matchingSkills.length + structured.missingSkills.length > 0;

  if (hasSkills && hasExp && hasJobSkills)   return 'High';
  if (hasSkills && hasJobSkills)             return 'Medium';
  if (hasSkills || hasExp)                   return 'Low — profile is incomplete';
  return 'Very Low — profile has insufficient data for reliable matching';
}

/**
 * Main public function.
 * Always returns a valid result even if AI is offline.
 *
 * @param {object} candidateProfile  — Mongoose Profile document (plain object or document)
 * @param {object} job               — Mongoose Job document (plain object or document)
 * @returns {Promise<MatchResult>}
 */
async function matchCandidateWithJob(candidateProfile, job) {
  // Step 1: Structured matching (always runs)
  const structured = computeStructuredMatch(candidateProfile, job);

  // Step 2: AI semantic enrichment (optional)
  const aiResult = await enrichWithAI(candidateProfile, job, structured);

  // Step 3: Compose final result
  let finalScore = structured.score;

  if (aiResult && typeof aiResult.scoreAdjustment === 'number') {
    // Clamp adjustment to ±15
    const adj = Math.max(-15, Math.min(15, Math.round(aiResult.scoreAdjustment)));
    finalScore = Math.round(Math.min(100, Math.max(0, finalScore + adj)));
  }

  const confidence = computeConfidence(candidateProfile, structured);

  // Build explanation: prefer AI narrative, fall back to structured narrative
  const explanation = aiResult?.overallExplanation
    || buildFallbackExplanation(structured, candidateProfile, job);

  const semanticInsights = aiResult?.semanticSkillInsights || null;
  const experienceNarrative = aiResult?.experienceNarrative
    || structured.experienceAssessment;

  // missingSkills: job skills the candidate doesn't have (capped for display)
  const missingSkills = structured.missingSkills.slice(0, 10);

  return {
    score:              finalScore,
    matchingSkills:     structured.matchingSkills,
    missingSkills,
    experienceAssessment: experienceNarrative,
    gaps:               structured.gaps,
    semanticInsights,
    explanation,
    confidence,
    aiEnhanced:         aiResult !== null,
    breakdown:          structured.breakdown
  };
}

/**
 * Build a plain-text explanation when AI is unavailable.
 */
function buildFallbackExplanation(structured, candidateProfile, job) {
  const total = structured.matchingSkills.length + structured.missingSkills.length;
  const matched = structured.matchingSkills.length;
  const skillLine = total > 0
    ? `Candidate matches ${matched} of ${total} listed job skills.`
    : 'No explicit skills listed for this job.';
  const expLine = structured.experienceAssessment;
  const gapLine = structured.gaps.length > 0
    ? `Considerations: ${structured.gaps.join(' ')}`
    : '';
  return [skillLine, expLine, gapLine].filter(Boolean).join(' ');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  matchCandidateWithJob,
  // Export internals for unit testing
  _internal: {
    computeStructuredMatch,
    scoreSkills,
    scoreExperience,
    scoreWorkMode,
    scoreJobType,
    scoreSalary,
    scoreExtras
  }
};
