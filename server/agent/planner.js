/**
 * planner.js — Agent Plan Generator
 * Phase 8: AI Agent and Controlled Tools
 *
 * Generates structured, deterministic or AI-planned execution steps
 * for job discovery, matching, and preparation.
 */

'use strict';

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
        location: { type: 'string' },
        experienceLevel: { type: 'string' },
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
  const knownKeywords = [
    'react', 'node.js', 'node', 'javascript', 'typescript', 'python', 'java', 'golang', 'c#',
    'full stack', 'frontend', 'backend', 'devops', 'data', 'marketing', 'sales', 'design', 'finance'
  ];
  for (const kw of knownKeywords) {
    if (lower.includes(kw)) {
      keyword = kw === 'node' ? 'Node.js' : kw.charAt(0).toUpperCase() + kw.slice(1);
      break;
    }
  }

  // Extract type
  let type = '';
  if (lower.includes('internship') || lower.includes('intern')) type = 'internship';
  else if (lower.includes('contract')) type = 'contract';
  else if (lower.includes('part-time')) type = 'part-time';
  else if (lower.includes('full-time')) type = 'full-time';

  // Extract remote / work mode
  let remote = '';
  if (lower.includes('remote')) remote = 'remote';
  else if (lower.includes('hybrid')) remote = 'hybrid';
  else if (lower.includes('onsite')) remote = 'onsite';

  // Extract location (e.g. "in amman", "in berlin", "in germany", "in london")
  let location = '';
  const locMatch = lower.match(/\bin\s+([a-zA-Z\s]{3,20})(?:\s+that|\s+with|\s*$|\.)/);
  if (locMatch) {
    location = locMatch[1].trim();
  }

  // Extract seniority / experience level
  let experienceLevel = '';
  if (type === 'internship' || lower.includes('entry level') || lower.includes('entry-level')) {
    experienceLevel = 'entry-level';
  } else if (lower.includes('junior')) {
    experienceLevel = 'junior';
  } else if (lower.includes('senior')) {
    experienceLevel = 'senior';
  } else if (lower.includes('mid level') || lower.includes('mid-level')) {
    experienceLevel = 'mid-level';
  }

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
      location,
      experienceLevel,
      minSalary
    },
    steps: [
      { step: 1, action: 'Read candidate profile and verified skills', tool: 'getCandidateProfile' },
      { step: 2, action: 'Read candidate job search preferences', tool: 'getCandidatePreferences' },
      { step: 3, action: 'Search available job sources matching criteria', tool: 'searchJobs' },
      { step: 4, action: 'Calculate compatibility and rank matches', tool: 'calculateMatch' },
      { step: 5, action: 'Explain top recommendations and highlight strengths/gaps', tool: 'explainMatch' },
      { step: 6, action: 'Tailor resume for top matched opportunity', tool: 'tailorResume' }
    ]
  };
}

class Planner {
  async createPlan(goal) {
    const prompt = `
You are an AI Job Search Agent Planner.
Given the user goal, generate a structured, deterministic multi-step search and application plan.

USER GOAL: "${goal}"

CONTROLLED TOOLS AVAILABLE:
- Candidate: getCandidateProfile, getCandidateSkills, getCandidatePreferences
- Job: searchJobs, filterJobs, getJobDetails, compareJobs
- Matching: calculateMatch, explainMatch
- Resume: analyzeCV, tailorResume, validateResume
- Applications: prepareApplication, createApplicationDraft, updateApplicationStatus

RULES:
1. Choose an optimal multi-step flow (e.g. read preferences -> search -> match -> explain -> prepare).
2. Extract accurate searchCriteria (keyword, type, remote, location, experienceLevel, minSalary).
3. Return ONLY a single JSON object matching the requested schema.
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
