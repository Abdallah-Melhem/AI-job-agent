const aiService = require('../services/aiService');

const planSchema = {
  type: 'object',
  properties: {
    searchCriteria: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        type: { type: 'string' },
        remote: { type: 'string' },
        minSalary: { type: 'number' }
      }
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'number' },
          action: { type: 'string' },
          tool: { type: 'string' }
        },
        required: ['step', 'action', 'tool']
      }
    }
  },
  required: ['searchCriteria', 'steps']
};

/**
 * Robust rule-based planner fallback
 */
function fallbackPlanner(goal) {
  const lower = goal.toLowerCase();
  
  // Extract keywords
  let keyword = '';
  if (lower.includes('react')) keyword = 'React';
  else if (lower.includes('node')) keyword = 'Node.js';
  else if (lower.includes('javascript') || lower.includes('js')) keyword = 'JavaScript';
  else if (lower.includes('python')) keyword = 'Python';

  // Extract type
  let type = '';
  if (lower.includes('internship') || lower.includes('intern')) type = 'internship';
  else if (lower.includes('contract')) type = 'contract';
  else if (lower.includes('part-time')) type = 'part-time';
  else if (lower.includes('full-time')) type = 'full-time';

  // Extract remote
  let remote = '';
  if (lower.includes('remote')) remote = 'remote';
  else if (lower.includes('hybrid')) remote = 'hybrid';
  else if (lower.includes('onsite')) remote = 'onsite';

  // Extract salary
  let minSalary = 0;
  const salaryMatch = lower.match(/(?:\$|salary\s*)(\d+)/);
  if (salaryMatch) {
    minSalary = parseInt(salaryMatch[1], 10);
  }

  return {
    searchCriteria: {
      keyword,
      type,
      remote,
      minSalary
    },
    steps: [
      { step: 1, action: 'Read candidate profile & preferences', tool: 'getCandidateProfile' },
      { step: 2, action: 'Search and discover matching jobs', tool: 'searchJobs' },
      { step: 3, action: 'Analyze job fit and match candidate', tool: 'matchCandidateJob' },
      { step: 4, action: 'Select top jobs and tailor ATS resume', tool: 'tailorResume' },
      { step: 5, action: 'Prepare and summarize applications', tool: 'prepareApplication' }
    ]
  };
}

class Planner {
  async createPlan(goal) {
    const prompt = `
You are an AI Job Search Agent Planner.
Given the user goal, generate a structured search and application plan.

USER GOAL: "${goal}"

Return a JSON object with:
- "searchCriteria": { "keyword": string, "type": string, "remote": string, "minSalary": number }
- "steps": array of { "step": number, "action": string, "tool": string }
Tools available: getCandidateProfile, searchJobs, matchCandidateJob, tailorResume, prepareApplication.
`;

    try {
      const plan = await aiService.generate(prompt, planSchema);
      return plan;
    } catch (error) {
      console.warn('AI Planner error/timeout, using structured rule planner:', error.message);
      return fallbackPlanner(goal);
    }
  }
}

module.exports = new Planner();
