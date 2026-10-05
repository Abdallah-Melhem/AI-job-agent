/**
 * AI Evaluation tests
 * Validates that matching produces structurally valid output
 * and does not fabricate experience.
 */

// We test the deterministic fallback path (no Ollama required)
// by forcing aiService to always fail, then checking fallback output

const aiService = require('../../services/aiService');
const matchingService = require('../../services/matchingService');

// Predefined test fixtures
const testProfile = {
  skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
  experience: [
    {
      company: 'ACME Corp',
      position: 'Junior Developer',
      duration: '2 years',
      description: 'Built REST APIs with Node.js and Express'
    }
  ],
  education: [
    {
      degree: 'B.Sc Computer Science',
      institution: 'State University'
    }
  ]
};

const testJob = {
  _id: 'test-job-001',
  title: 'Backend Engineer',
  company: 'DataFlow Inc.',
  description: 'Join our backend team. Node.js, MongoDB, Docker required.',
  skills: ['Node.js', 'MongoDB', 'Docker', 'Express'],
  requirements: ['3+ years Node.js', 'MongoDB experience', 'Docker basics']
};

const testJobNoSkillMatch = {
  _id: 'test-job-002',
  title: 'iOS Developer',
  company: 'MobileFirst',
  description: 'Build native iOS apps using Swift and SwiftUI.',
  skills: ['Swift', 'SwiftUI', 'Xcode', 'Objective-C'],
  requirements: ['3+ years Swift', 'App Store published apps']
};

describe('matchingService — AI Evaluation', () => {
  beforeEach(() => {
    // In unit tests, simulate AI offline to test deterministic fallback reliably and instantly
    jest.spyOn(aiService, 'generate').mockRejectedValue(new Error('AI offline'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns valid match result structure for a matching profile/job', async () => {
    const result = await matchingService.matchCandidateWithJob(testProfile, testJob);

    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    expect(result).toHaveProperty('matchingSkills');
    expect(Array.isArray(result.matchingSkills)).toBe(true);

    expect(result).toHaveProperty('missingSkills');
    expect(Array.isArray(result.missingSkills)).toBe(true);

    expect(result).toHaveProperty('explanation');
    expect(typeof result.explanation).toBe('string');
  });

  test('matching skills only include real profile skills (no fabrication)', async () => {
    const result = await matchingService.matchCandidateWithJob(testProfile, testJob);
    const profileSkillsLower = testProfile.skills.map(s => s.toLowerCase());

    // Every matching skill must be in the profile
    result.matchingSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      const isInProfile = profileSkillsLower.some(ps => ps.includes(skillLower) || skillLower.includes(ps));
      expect(isInProfile).toBe(true);
    });
  });

  test('returns lower score for no-match job', async () => {
    const resultMatch = await matchingService.matchCandidateWithJob(testProfile, testJob);
    const resultNoMatch = await matchingService.matchCandidateWithJob(testProfile, testJobNoSkillMatch);

    // The backend job should score higher than the iOS job
    expect(resultMatch.score).toBeGreaterThan(resultNoMatch.score);
  });

  test('does not throw when profile or job is missing optional fields', async () => {
    const minimalProfile = { skills: ['Python'] };
    const minimalJob = { _id: 'j1', title: 'Python Dev', company: 'X', description: 'Python', skills: ['Python'], requirements: [] };

    await expect(matchingService.matchCandidateWithJob(minimalProfile, minimalJob)).resolves.toBeDefined();
  });
});
