const aiService = require('./aiService');

const matchResultSchema = {
  type: 'object',
  properties: {
    score: { type: 'number', minimum: 0, maximum: 100 },
    matchingSkills: { type: 'array', items: { type: 'string' } },
    missingSkills: { type: 'array', items: { type: 'string' } },
    relevantExperience: { type: 'string' },
    concerns: { type: 'array', items: { type: 'string' } },
    explanation: { type: 'string' }
  },
  required: ['score', 'matchingSkills', 'missingSkills', 'relevantExperience', 'concerns', 'explanation']
};

/**
 * Deterministic fallback matching in case AI service / Ollama is offline
 */
function fallbackMatch(candidateProfile, job) {
  const candidateSkills = (candidateProfile?.skills || []).map(s => s.toLowerCase());
  const jobSkills = (job?.skills || []).map(s => s.toLowerCase());
  const jobReqs = (job?.requirements || []).join(' ').toLowerCase();

  const matchingSkills = [];
  const missingSkills = [];

  for (const s of (job.skills || [])) {
    if (candidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs))) {
      matchingSkills.push(s);
    } else {
      missingSkills.push(s);
    }
  }

  // Calculate score based on skills match ratio and experience
  const totalSkillsCount = Math.max(1, (job.skills || []).length);
  let baseScore = Math.round((matchingSkills.length / totalSkillsCount) * 70);

  // Bonus for experience / education presence
  const expCount = (candidateProfile?.experience || []).length;
  if (expCount > 0) baseScore += Math.min(20, expCount * 10);
  if ((candidateProfile?.education || []).length > 0) baseScore += 10;

  const finalScore = Math.min(100, Math.max(10, baseScore));

  const concerns = [];
  if (missingSkills.length > 0) {
    concerns.push(`Candidate lacks direct experience with: ${missingSkills.slice(0, 3).join(', ')}`);
  }
  if (expCount === 0 && job.type !== 'internship') {
    concerns.push('Candidate profile has limited recorded formal work experience');
  }

  const explanation = `Matched based on candidate skills and job requirements. Identified ${matchingSkills.length} matching skills and ${missingSkills.length} potential skill gaps.`;

  return {
    score: finalScore,
    matchingSkills,
    missingSkills,
    relevantExperience: expCount > 0 
      ? `Candidate has ${expCount} experience role(s) relevant to software development.` 
      : 'Candidate has educational or foundational project experience.',
    concerns,
    explanation
  };
}

/**
 * Match a candidate profile against a job description using AI Analysis
 */
async function matchCandidateWithJob(candidateProfile, job) {
  // Construct clear prompt separating System instructions, candidate profile, and job details
  const prompt = `
You are an expert technical recruiter and job matching analyzer.
Analyze the fit between the candidate and the job.

RULES:
1. Do not fabricate or invent candidate qualifications or experience.
2. Be objective, accurate, and realistic.
3. Return a JSON object with:
   - "score": number between 0 and 100
   - "matchingSkills": list of strings that the candidate has and the job requires
   - "missingSkills": list of strings required or desired by the job that the candidate lacks
   - "relevantExperience": concise summary of how candidate's experience relates
   - "concerns": list of strings highlighting gaps, concerns, or potential mismatches
   - "explanation": concise overall explanation of why the candidate does or does not match this job

CANDIDATE PROFILE:
${JSON.stringify({
  skills: candidateProfile.skills || [],
  languages: candidateProfile.languages || [],
  education: candidateProfile.education || [],
  experience: candidateProfile.experience || [],
  projects: candidateProfile.projects || []
}, null, 2)}

JOB DETAILS:
${JSON.stringify({
  title: job.title,
  company: job.company,
  location: job.location,
  type: job.type,
  remote: job.remote,
  skills: job.skills || [],
  requirements: job.requirements || [],
  description: job.description
}, null, 2)}
`;

  try {
    const result = await aiService.generate(prompt, matchResultSchema);
    return result;
  } catch (error) {
    console.warn('AI matching failed or timed out, using fallback matching logic:', error.message);
    return fallbackMatch(candidateProfile, job);
  }
}

module.exports = {
  matchCandidateWithJob,
  matchResultSchema
};
