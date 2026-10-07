/**
 * promptTemplates.js — Task-Specific Prompts & Anti-Hallucination Guardrails
 * Phase 7: AI Quality & Response Validation
 *
 * Provides standardized system instructions, input budgeting/truncation,
 * and post-generation anti-hallucination validation.
 */

'use strict';

const guardrails = require('../agent/guardrails');

const TASK_TYPES = {
  JOB_MATCHING: 'job_matching',
  RESUME_TAILORING: 'resume_tailoring',
  CV_ANALYSIS: 'cv_analysis',
  JOB_ANALYSIS: 'job_analysis',
  CAREER_RECOMMENDATION: 'career_recommendation',
  APPLICATION_PREPARATION: 'application_preparation',
  AGENT_PLANNING: 'agent_planning'
};

/**
 * Truncate long text to prevent context window overflow while preserving readability.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
function truncateText(text, maxChars = 2000) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}... [TRUNCATED]`;
}

/**
 * Builds task-specific prompt with strict anti-hallucination boundaries
 *
 * @param {string} taskType - One of TASK_TYPES
 * @param {object} payload - Task data
 * @returns {{ prompt: string, systemInstruction: string, schema?: object }}
 */
function buildTaskPrompt(taskType, payload = {}) {
  // Sanitize any freeform user input before inserting into prompt
  if (payload.userInput) {
    payload.userInput = guardrails.sanitizeInput(payload.userInput);
  }

  switch (taskType) {
    case TASK_TYPES.JOB_MATCHING: {
      const { candidateProfile, job, structuredScore } = payload;
      const systemInstruction = `You are an expert technical recruiter and objective job fit evaluator.
CRITICAL INTEGRITY RULES:
1. Ground your analysis strictly in the provided candidate data.
2. NEVER invent qualifications, degrees, skills, or experience not present in the candidate profile.
3. If information is missing or ambiguous, explicitly note it as missing or unavailable.
4. Keep score adjustment strictly between -15 and +15.
5. Return ONLY a single JSON object.`;

      const prompt = `
CANDIDATE DATA:
${JSON.stringify({
  skills: candidateProfile?.skills || [],
  experience: (candidateProfile?.experience || []).map(e => ({
    position: e.position,
    company: e.company,
    duration: e.duration || `${e.startDate || ''} – ${e.endDate || 'present'}`
  })),
  education: (candidateProfile?.education || []).map(e => ({
    degree: e.degree,
    institution: e.institution
  })),
  projects: (candidateProfile?.projects || []).map(p => p.name)
}, null, 2)}

JOB DETAILS:
${JSON.stringify({
  title: job?.title || '',
  company: job?.company || '',
  skills: job?.skills || [],
  requirements: (job?.requirements || []).slice(0, 8),
  description: truncateText(job?.description, 800)
}, null, 2)}

STRUCTURED SCORE: ${structuredScore ?? 'N/A'}/100

Analyze compatibility and provide:
- semanticSkillInsights: 1–2 sentences on candidate skill depth relative to the job.
- experienceNarrative: 1–2 sentences on relevance of candidate experience.
- overallExplanation: 2–3 sentences summarizing key strengths and gaps.
- scoreAdjustment: number between -15 and 15 adjusting the baseline structured score.
`;
      return { prompt, systemInstruction };
    }

    case TASK_TYPES.RESUME_TAILORING: {
      const { candidateProfile, job } = payload;
      const systemInstruction = `You are an expert ATS resume optimizer and career strategist.
CRITICAL TRUTHFULNESS & ATS RULES:
1. NEVER invent fake employers, fake degrees, or unearned credentials.
2. Only highlight and rephrase actual candidate experience and documented skills.
3. Use concise, impactful, metric-oriented bullet points (STAR method).
4. Order experience reverse-chronologically.
5. Return ONLY a single JSON object matching the requested resume schema.`;

      const prompt = `
CANDIDATE INFORMATION:
${JSON.stringify({
  skills: candidateProfile?.skills || [],
  experience: candidateProfile?.experience || [],
  education: candidateProfile?.education || [],
  projects: candidateProfile?.projects || []
}, null, 2)}

TARGET JOB:
${JSON.stringify({
  title: job?.title,
  company: job?.company,
  skills: job?.skills || [],
  description: truncateText(job?.description, 1000)
}, null, 2)}
`;
      return { prompt, systemInstruction };
    }

    case TASK_TYPES.CAREER_RECOMMENDATION: {
      const { candidateProfile, targetCategory } = payload;
      const systemInstruction = `You are a professional career advisor.
Recommend specific, realistic next steps and skill development based strictly on the candidate's verified profile.
Do not fabricate accomplishments.`;

      const prompt = `
Candidate Skills: ${(candidateProfile?.skills || []).join(', ')}
Candidate Experience: ${(candidateProfile?.experience || []).map(e => `${e.position} at ${e.company}`).join('; ')}
Target Career Direction: ${targetCategory || 'General'}

Provide:
1. High-value skills to learn next
2. 2–3 recommended job roles matching current abilities
3. Specific resume improvement suggestions
`;
      return { prompt, systemInstruction };
    }

    default:
      return {
        prompt: String(payload.prompt || ''),
        systemInstruction: 'You are an AI assistant for career navigation and job applications. Be truthful, objective, and precise.'
      };
  }
}

/**
 * Validates candidate truthfulness in generated content.
 * Flags or rejects any content that invents employers or credentials.
 *
 * @param {object} generatedOutput
 * @param {object} originalProfile
 * @returns {{ valid: boolean, warnings: string[] }}
 */
function validateCandidateTruthfulness(generatedOutput, originalProfile) {
  const warnings = [];
  if (!generatedOutput || !originalProfile) {
    return { valid: true, warnings };
  }

  // 1. Verify that experiences in generated output correspond to real companies
  const originalCompanies = (originalProfile.experience || [])
    .map(e => (e.company || '').toLowerCase().trim())
    .filter(Boolean);

  if (Array.isArray(generatedOutput.experience)) {
    for (const exp of generatedOutput.experience) {
      const expCo = (exp.company || '').toLowerCase().trim();
      if (expCo && originalCompanies.length > 0) {
        const matchesAny = originalCompanies.some(orig => orig.includes(expCo) || expCo.includes(orig));
        if (!matchesAny) {
          warnings.push(`Potential hallucinated employer detected: "${exp.company}".`);
        }
      }
    }
  }

  // 2. Verify skills if output includes an explicit skills list
  const profileSkills = (originalProfile.skills || []).map(s => s.toLowerCase().trim());
  if (Array.isArray(generatedOutput.matchingSkills)) {
    for (const skill of generatedOutput.matchingSkills) {
      const skillLower = skill.toLowerCase().trim();
      const inProfile = profileSkills.some(ps => ps.includes(skillLower) || skillLower.includes(ps));
      if (!inProfile) {
        warnings.push(`Skill "${skill}" marked as matching is not present in candidate profile.`);
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

module.exports = {
  TASK_TYPES,
  truncateText,
  buildTaskPrompt,
  validateCandidateTruthfulness
};
