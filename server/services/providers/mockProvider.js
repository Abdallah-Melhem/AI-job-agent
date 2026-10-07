/**
 * MockProvider.js — Deterministic Mock AI Provider
 * Phase 7: AI Quality & Response Validation
 *
 * Provides predictable, deterministic responses for tests, offline development,
 * and staging environments without requiring network access or external credentials.
 */

'use strict';

const AIProvider = require('../aiProvider');

class MockProvider extends AIProvider {
  constructor(customMocks = {}) {
    super('mock');
    this.customMocks = customMocks;
  }

  async isAvailable() {
    return true;
  }

  /**
   * Set custom mock handler or mock map
   */
  setMockResponse(keyOrHandler, response) {
    if (typeof keyOrHandler === 'function') {
      this.customHandler = keyOrHandler;
    } else {
      this.customMocks[keyOrHandler] = response;
    }
  }

  async generate(prompt, options = {}) {
    if (this.customHandler) {
      return this.customHandler(prompt, options);
    }

    // Check custom mock map
    for (const [key, val] of Object.entries(this.customMocks)) {
      if (prompt.includes(key)) {
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
    }

    // Check if JSON schema was requested
    if (options.schema) {
      // Return a valid mock object conforming to common schemas in the app
      if (prompt.includes('scoreAdjustment') || prompt.includes('semanticSkillInsights')) {
        return JSON.stringify({
          semanticSkillInsights: 'Candidate possesses directly transferable technical capabilities.',
          experienceNarrative: 'Previous professional background aligns with target job duties.',
          overallExplanation: 'Strong candidate profile match based on core competencies and experience.',
          scoreAdjustment: 5
        });
      }

      if (prompt.includes('targetTitle') && prompt.includes('highlights')) {
        return JSON.stringify({
          targetTitle: 'Software Engineer',
          summary: 'Motivated software professional with extensive development background and strong technical problem-solving capabilities.',
          skills: ['JavaScript', 'React', 'Node.js'],
          experience: [{
            position: 'Software Developer',
            company: 'Tech Solutions',
            startDate: '2022',
            endDate: 'Present',
            highlights: ['Designed and maintained scalable web features.']
          }],
          education: [{
            degree: 'B.Sc. Computer Science',
            institution: 'University'
          }],
          projects: [{
            name: 'Web Application',
            description: 'Full stack development project.'
          }]
        });
      }

      if (prompt.includes('searchCriteria') && prompt.includes('steps')) {
        return JSON.stringify({
          searchCriteria: { keyword: 'developer', type: 'full-time', remote: 'remote' },
          steps: [
            { step: 1, action: 'Search matching jobs', tool: 'searchJobs' },
            { step: 2, action: 'Match against profile', tool: 'matchCandidateJob' }
          ]
        });
      }

      // Generic fallback object for arbitrary schema
      return JSON.stringify({ success: true, message: 'Mock structured output' });
    }

    return 'Mock AI completed response successfully.';
  }
}

module.exports = MockProvider;
