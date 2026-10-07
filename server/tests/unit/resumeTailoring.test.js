/**
 * resumeTailoring.test.js — Phase 9: Resume Tailoring & Truthfulness Tests
 */

'use strict';

const {
  validateTailoredResume,
  sortReverseChronological,
  isReverseChronological,
  parseDateOrderScore
} = require('../../services/resumeValidator');
const { fallbackTailorResume } = require('../../services/tailoringService');

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const sampleCandidateProfile = {
  title: 'Full Stack Developer',
  summary: 'Passionate developer with 3 years experience building web apps.',
  skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Docker', 'REST APIs'],
  experience: [
    {
      position: 'Senior Frontend Developer',
      company: 'TechWave Solutions',
      startDate: '2023-01',
      endDate: 'Present',
      responsibilities: 'Led React architecture and state management.'
    },
    {
      position: 'Junior Developer',
      company: 'DevForge Inc',
      startDate: '2021-06',
      endDate: '2022-12',
      responsibilities: 'Built Node.js and Express backend microservices.'
    }
  ],
  education: [
    {
      degree: 'B.Sc. in Computer Science',
      institution: 'State University',
      startDate: '2017',
      endDate: '2021'
    }
  ],
  projects: [
    {
      name: 'E-Commerce Platform',
      description: 'Built with React and Node.js',
      technologies: ['React', 'Node.js', 'Stripe']
    }
  ],
  certifications: ['AWS Certified Cloud Practitioner']
};

const targetJob = {
  title: 'Senior React Engineer',
  company: 'CloudScale Corp',
  skills: ['React', 'Docker', 'TypeScript'],
  requirements: ['3+ years React', 'Docker knowledge'],
  description: 'Looking for a Senior React Engineer to scale our CloudScale platform.'
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Phase 9: Reverse Chronological Sorting & Detection', () => {
  test('parseDateOrderScore assigns highest values to Present/Current', () => {
    const presentScore = parseDateOrderScore('Present');
    const currentScore = parseDateOrderScore('Current');
    const pastScore = parseDateOrderScore('2023');

    expect(presentScore).toBeGreaterThan(pastScore);
    expect(currentScore).toBeGreaterThan(pastScore);
  });

  test('sortReverseChronological sorts items newest to oldest', () => {
    const mixedDates = [
      { company: 'Older Co', startDate: '2019', endDate: '2021' },
      { company: 'Current Co', startDate: '2023', endDate: 'Present' },
      { company: 'Mid Co', startDate: '2021', endDate: '2023' }
    ];

    const sorted = sortReverseChronological(mixedDates);
    expect(sorted[0].company).toBe('Current Co');
    expect(sorted[1].company).toBe('Mid Co');
    expect(sorted[2].company).toBe('Older Co');
  });

  test('isReverseChronological detects out-of-order chronology', () => {
    const outOfOrder = [
      { startDate: '2019', endDate: '2021' },
      { startDate: '2023', endDate: 'Present' }
    ];

    const inOrder = [
      { startDate: '2023', endDate: 'Present' },
      { startDate: '2019', endDate: '2021' }
    ];

    expect(isReverseChronological(outOfOrder)).toBe(false);
    expect(isReverseChronological(inOrder)).toBe(true);
  });
});

describe('Phase 9: Truthfulness & Unsupported Claims Detection', () => {
  test('passes validation when resume is truthful and supported by candidate profile', () => {
    const validResume = {
      targetTitle: 'Senior React Engineer',
      summary: 'Experienced Full Stack Developer with background in React and Node.js. Tailored for CloudScale Corp.',
      skills: ['React', 'Docker', 'JavaScript', 'Node.js'],
      experience: [
        {
          position: 'Senior Frontend Developer',
          company: 'TechWave Solutions',
          startDate: '2023',
          endDate: 'Present',
          highlights: ['Led React architecture and scalable UI development.']
        },
        {
          position: 'Junior Developer',
          company: 'DevForge Inc',
          startDate: '2021',
          endDate: '2022',
          highlights: ['Built backend microservices.']
        }
      ],
      education: [
        {
          degree: 'B.Sc. in Computer Science',
          institution: 'State University',
          startDate: '2017',
          endDate: '2021'
        }
      ],
      projects: [
        {
          name: 'E-Commerce Platform',
          description: 'Built with React and Node.js.'
        }
      ]
    };

    const report = validateTailoredResume(validResume, sampleCandidateProfile);
    expect(report.isValid).toBe(true);
    expect(report.isTruthful).toBe(true);
    expect(report.isReverseChronological).toBe(true);
    expect(report.unsupportedClaims).toHaveLength(0);
  });

  test('flags invented employers not in candidate profile', () => {
    const hallucinatedEmployerResume = {
      targetTitle: 'React Engineer',
      summary: 'Professional developer with extensive experience across modern web systems.',
      skills: ['React', 'JavaScript'],
      experience: [
        {
          position: 'Lead Architect',
          company: 'Google Silicon Valley', // Invented employer!
          startDate: '2023',
          endDate: 'Present',
          highlights: ['Architected core Google services.']
        }
      ],
      education: [
        {
          degree: 'B.Sc.',
          institution: 'State University'
        }
      ]
    };

    const report = validateTailoredResume(hallucinatedEmployerResume, sampleCandidateProfile);
    expect(report.isTruthful).toBe(false);
    expect(report.unsupportedClaims.some(c => c.includes('Google Silicon Valley'))).toBe(true);
  });

  test('flags unearned skills/technologies the candidate never provided', () => {
    const hallucinatedSkillResume = {
      targetTitle: 'React Engineer',
      summary: 'Professional developer with deep expertise in web and enterprise tech.',
      skills: ['React', 'Solidity Blockchain Expert', 'Rust Embedded Systems'], // Unprovided skills!
      experience: [
        {
          position: 'Senior Frontend Developer',
          company: 'TechWave Solutions',
          startDate: '2023',
          endDate: 'Present',
          highlights: ['Led React architecture.']
        }
      ],
      education: [
        {
          degree: 'B.Sc.',
          institution: 'State University'
        }
      ]
    };

    const report = validateTailoredResume(hallucinatedSkillResume, sampleCandidateProfile);
    expect(report.isTruthful).toBe(false);
    expect(report.unsupportedClaims.some(c => c.includes('Solidity'))).toBe(true);
  });

  test('flags invented projects', () => {
    const hallucinatedProjectResume = {
      targetTitle: 'React Engineer',
      summary: 'Professional developer with deep expertise in web apps.',
      skills: ['React', 'Node.js'],
      experience: [
        {
          position: 'Senior Frontend Developer',
          company: 'TechWave Solutions',
          startDate: '2023',
          endDate: 'Present',
          highlights: ['Built web apps.']
        }
      ],
      education: [
        {
          degree: 'B.Sc.',
          institution: 'State University'
        }
      ],
      projects: [
        {
          name: 'Autonomous AI Rocket Guidance System', // Invented project!
          description: 'Invented rocket navigation.'
        }
      ]
    };

    const report = validateTailoredResume(hallucinatedProjectResume, sampleCandidateProfile);
    expect(report.isTruthful).toBe(false);
    expect(report.unsupportedClaims.some(c => c.includes('Autonomous AI Rocket'))).toBe(true);
  });
});

describe('Phase 9: Fallback Tailoring Engine', () => {
  test('tailors resume to target job title and company while preserving truthfulness', () => {
    const result = fallbackTailorResume(sampleCandidateProfile, targetJob);

    expect(result.targetTitle).toBe(targetJob.title);
    expect(result.summary).toContain(targetJob.company);

    // Job requires React & Docker -> React & Docker must be prioritized at the front of skills
    expect(result.skills[0]).toBe('React');
    expect(result.skills[1]).toBe('Docker');

    // Experience must be reverse chronological
    expect(result.experience[0].company).toBe('TechWave Solutions');
    expect(result.experience[1].company).toBe('DevForge Inc');

    // Validate truthfulness
    const validation = validateTailoredResume(result, sampleCandidateProfile);
    expect(validation.isTruthful).toBe(true);
    expect(validation.isReverseChronological).toBe(true);
  });
});
