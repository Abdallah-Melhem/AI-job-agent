/**
 * matchingService.test.js — Phase 6: Hybrid AI Matching Engine
 *
 * Tests cover:
 *  - Structured scoring internals (skills, experience, work mode, etc.)
 *  - Full matchCandidateWithJob() output shape
 *  - Anti-fabrication: matchingSkills must come from candidate profile only
 *  - Honest handling of sparse / empty profiles
 *  - Score ordering (relevant job > irrelevant job)
 *  - AI enrichment path (mocked AI success)
 *  - Fallback path (AI offline)
 */

'use strict';

const aiService      = require('../../services/aiService');
const matchingService = require('../../services/matchingService');
const {
  _internal: {
    scoreSkills,
    scoreExperience,
    scoreWorkMode,
    scoreJobType,
    scoreSalary,
    scoreExtras,
    computeStructuredMatch
  }
} = matchingService;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fullProfile = {
  skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'REST APIs'],
  experience: [
    {
      company:  'ACME Corp',
      position: 'Junior Developer',
      startDate: '2022-01',
      endDate:   '2024-01',
      responsibilities: 'Built REST APIs with Node.js and Express'
    },
    {
      company:  'Widget Co',
      position: 'Mid-level Developer',
      startDate: '2024-02'
    }
  ],
  education: [{ degree: 'B.Sc Computer Science', institution: 'State University' }],
  projects:       [{ name: 'Personal Portfolio', technologies: ['React'] }],
  certifications: ['AWS Cloud Practitioner'],
  preferences: {
    employmentTypes: ['full-time'],
    locations:       ['remote'],
    salary:          { min: 60000 }
  }
};

const minimalProfile = {
  skills: ['Python'],
  experience:     [],
  education:      [],
  projects:       [],
  certifications: []
};

const emptyProfile = {};

const backendJob = {
  _id:            'job-backend',
  title:          'Backend Engineer',
  company:        'DataFlow Inc.',
  description:    'Node.js, MongoDB, Docker required.',
  skills:         ['Node.js', 'MongoDB', 'Docker', 'Express'],
  requirements:   ['3+ years Node.js', 'MongoDB experience'],
  experienceLevel: 'mid-level',
  remote:         'remote',
  type:           'full-time',
  salary:         { min: 55000, max: 75000, currency: 'USD', period: 'yearly' }
};

const iosJob = {
  _id:            'job-ios',
  title:          'iOS Developer',
  company:        'MobileFirst',
  description:    'Build native iOS apps using Swift and SwiftUI.',
  skills:         ['Swift', 'SwiftUI', 'Xcode', 'Objective-C'],
  requirements:   ['3+ years Swift', 'App Store published apps'],
  experienceLevel: 'senior',
  remote:         'onsite',
  type:           'full-time',
  salary:         { min: 80000, max: 120000, currency: 'USD', period: 'yearly' }
};

const noSkillsJob = {
  _id:            'job-noskills',
  title:          'General Manager',
  company:        'Corp X',
  description:    'Manage operations.',
  skills:         [],
  requirements:   [],
  experienceLevel: 'not-specified',
  remote:         'unknown',
  type:           'full-time'
};

// ─── Unit tests: individual scorers ──────────────────────────────────────────

describe('scoreSkills()', () => {
  test('returns matching and missing lists from job skills only', () => {
    const result = scoreSkills(fullProfile, backendJob);
    expect(result.matchingSkills).toContain('Node.js');
    expect(result.matchingSkills).toContain('MongoDB');
    expect(result.missingSkills).toContain('Docker');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('matchingSkills never includes skills not in the candidate profile', () => {
    const profile = { skills: ['Python', 'Django'] };
    const job     = { skills: ['Node.js', 'Django', 'React'] };
    const result  = scoreSkills(profile, job);
    result.matchingSkills.forEach(skill => {
      const inProfile = profile.skills.some(ps =>
        ps.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(ps.toLowerCase())
      );
      expect(inProfile).toBe(true);
    });
  });

  test('returns neutral score when job has no skills listed', () => {
    const result = scoreSkills(fullProfile, noSkillsJob);
    expect(result.score).toBe(50);
    expect(result.matchingSkills).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(0);
  });

  test('returns 0 score when no skills match', () => {
    const profile = { skills: ['COBOL'] };
    const job     = { skills: ['React', 'GraphQL', 'TypeScript'] };
    const result  = scoreSkills(profile, job);
    expect(result.score).toBe(0);
    expect(result.missingSkills).toHaveLength(3);
  });
});

describe('scoreExperience()', () => {
  test('full score when candidate level meets job requirement', () => {
    const profile = { experience: [{ position: 'Mid-level Developer' }] };
    const job     = { experienceLevel: 'mid-level' };
    const result  = scoreExperience(profile, job);
    expect(result.score).toBe(100);
  });

  test('partial score when candidate is one tier below', () => {
    const profile = { experience: [{ position: 'Junior Developer' }] };
    const job     = { experienceLevel: 'senior' };
    const result  = scoreExperience(profile, job);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('assessment text is always a non-empty string', () => {
    const result = scoreExperience({}, backendJob);
    expect(typeof result.assessment).toBe('string');
    expect(result.assessment.length).toBeGreaterThan(0);
  });

  test('returns 70 when job does not specify experience level', () => {
    const result = scoreExperience(fullProfile, noSkillsJob);
    expect(result.score).toBe(70);
  });
});

describe('scoreWorkMode()', () => {
  test('perfect score when both candidate and job are remote', () => {
    const profile = { preferences: { locations: ['remote'] } };
    const job     = { remote: 'remote' };
    expect(scoreWorkMode(profile, job).score).toBe(100);
  });

  test('neutral score when no candidate preference set', () => {
    const result = scoreWorkMode({}, backendJob);
    expect(result.score).toBe(70);
  });
});

describe('scoreJobType()', () => {
  test('full score when type matches preference', () => {
    const profile = { preferences: { employmentTypes: ['full-time'] } };
    const job     = { type: 'full-time' };
    expect(scoreJobType(profile, job).score).toBe(100);
  });

  test('reduced score and note when type mismatches', () => {
    const profile = { preferences: { employmentTypes: ['full-time'] } };
    const job     = { type: 'contract' };
    const result  = scoreJobType(profile, job);
    expect(result.score).toBeLessThan(100);
    expect(result.note).toBeTruthy();
  });
});

describe('scoreSalary()', () => {
  test('full score when job max meets candidate min', () => {
    const profile = { preferences: { salary: { min: 50000 } } };
    const job     = { salary: { max: 70000 } };
    expect(scoreSalary(profile, job).score).toBe(100);
  });

  test('reduced score and note when salary gap exists', () => {
    const profile = { preferences: { salary: { min: 100000 } } };
    const job     = { salary: { max: 50000 } };
    const result  = scoreSalary(profile, job);
    expect(result.score).toBeLessThan(60);
    expect(result.note).toBeTruthy();
  });

  test('neutral score when either salary is missing', () => {
    expect(scoreSalary({}, backendJob).score).toBe(70);
    expect(scoreSalary(fullProfile, noSkillsJob).score).toBe(70);
  });
});

describe('scoreExtras()', () => {
  test('high score when projects and certifications are present', () => {
    const result = scoreExtras(fullProfile);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('low score with note when nothing is listed', () => {
    const result = scoreExtras(minimalProfile);
    expect(result.score).toBeLessThan(70);
  });
});

describe('computeStructuredMatch()', () => {
  test('returns complete structured result shape', () => {
    const result = computeStructuredMatch(fullProfile, backendJob);
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.matchingSkills)).toBe(true);
    expect(Array.isArray(result.missingSkills)).toBe(true);
    expect(typeof result.experienceAssessment).toBe('string');
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.breakdown).toHaveProperty('skills');
    expect(result.breakdown).toHaveProperty('experience');
    expect(result.breakdown).toHaveProperty('workMode');
    expect(result.breakdown).toHaveProperty('jobType');
    expect(result.breakdown).toHaveProperty('salary');
    expect(result.breakdown).toHaveProperty('extras');
  });
});

// ─── Integration tests: matchCandidateWithJob() ───────────────────────────────

describe('matchCandidateWithJob() — fallback (AI offline)', () => {
  beforeEach(() => {
    jest.spyOn(aiService, 'generate').mockRejectedValue(new Error('AI offline'));
  });
  afterEach(() => jest.restoreAllMocks());

  test('returns valid result shape', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.matchingSkills)).toBe(true);
    expect(Array.isArray(result.missingSkills)).toBe(true);
    expect(typeof result.explanation).toBe('string');
    expect(typeof result.confidence).toBe('string');
    expect(typeof result.aiEnhanced).toBe('boolean');
    expect(result.aiEnhanced).toBe(false);
    expect(result.breakdown).toBeDefined();
  });

  test('relevant job scores higher than irrelevant job', async () => {
    const backendScore = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    const iosScore     = await matchingService.matchCandidateWithJob(fullProfile, iosJob);
    expect(backendScore.score).toBeGreaterThan(iosScore.score);
  });

  test('matchingSkills only contain real profile skills (anti-fabrication)', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    const profileNorm = fullProfile.skills.map(s => s.toLowerCase());
    result.matchingSkills.forEach(skill => {
      const inProfile = profileNorm.some(ps =>
        ps.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ps)
      );
      expect(inProfile).toBe(true);
    });
  });

  test('does not throw with empty profile', async () => {
    await expect(
      matchingService.matchCandidateWithJob(emptyProfile, backendJob)
    ).resolves.toBeDefined();
  });

  test('does not throw with minimal profile', async () => {
    await expect(
      matchingService.matchCandidateWithJob(minimalProfile, backendJob)
    ).resolves.toBeDefined();
  });

  test('confidence is lower for sparse profiles', async () => {
    const richResult  = await matchingService.matchCandidateWithJob(fullProfile,    backendJob);
    const sparseResult = await matchingService.matchCandidateWithJob(minimalProfile, backendJob);
    expect(richResult.confidence).toBe('High');
    expect(sparseResult.confidence).not.toBe('High');
  });

  test('experienceAssessment is a non-empty string', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    expect(typeof result.experienceAssessment).toBe('string');
    expect(result.experienceAssessment.length).toBeGreaterThan(0);
  });

  test('missingSkills only contains job skills not in profile', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    result.missingSkills.forEach(skill => {
      const inJobSkills = backendJob.skills.some(js =>
        js.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(js.toLowerCase())
      );
      expect(inJobSkills).toBe(true);
    });
  });
});

describe('matchCandidateWithJob() — AI enrichment path', () => {
  const mockAIResult = {
    semanticSkillInsights:  'Candidate has strong Node.js and MongoDB foundation.',
    experienceNarrative:    'Two years as a mid-level developer aligns well.',
    overallExplanation:     'Strong backend fit with minor gap in containerization.',
    scoreAdjustment:        5
  };

  beforeEach(() => {
    jest.spyOn(aiService, 'generate').mockResolvedValue(mockAIResult);
  });
  afterEach(() => jest.restoreAllMocks());

  test('aiEnhanced is true when AI returns valid result', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    expect(result.aiEnhanced).toBe(true);
  });

  test('explanation comes from AI overallExplanation', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    expect(result.explanation).toBe(mockAIResult.overallExplanation);
  });

  test('score is adjusted by AI scoreAdjustment within bounds', async () => {
    const structured = computeStructuredMatch(fullProfile, backendJob);
    const result     = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    const expected   = Math.min(100, Math.max(0, structured.score + 5));
    expect(result.score).toBe(expected);
  });

  test('semanticInsights is populated when AI returns it', async () => {
    const result = await matchingService.matchCandidateWithJob(fullProfile, backendJob);
    expect(result.semanticInsights).toBe(mockAIResult.semanticSkillInsights);
  });
});
