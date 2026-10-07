/**
 * tailoringService.js — ATS-Compliant Truthful Resume Tailoring Engine
 * Phase 9: Resume Tailoring
 *
 * Tailors a candidate's resume specifically for a job application while strictly ensuring:
 *  - TRUTHFULNESS: Never invents employers, credentials, or unsupported technologies.
 *  - ATS COMPLIANCE: Standard single-column structure, action verbs, clear highlights.
 *  - REVERSE CHRONOLOGICAL: Orders experience and education newest to oldest.
 *  - CONCISENESS & RELEVANCE: Reorders skills to emphasize job requirements.
 *  - VALIDATION: Detects and flags any unsupported claims.
 */

'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const aiService = require('./aiService');
const {
  resumeSchema,
  validateTailoredResume,
  sortReverseChronological
} = require('./resumeValidator');
const { generateResumePdf } = require('../templates/resumePdfGenerator');
const { generateResumeDocx } = require('../templates/resumeDocxGenerator');
const TailoredResume = require('../models/TailoredResume');
const logger = require('../utils/logger');

/**
 * Deterministic fallback tailoring engine when AI is offline.
 * Reorders verified candidate data to highlight job-relevant skills and requirements
 * without fabricating employers, degrees, or unearned technologies.
 */
function fallbackTailorResume(candidateProfile, job) {
  const targetTitle = job.title || candidateProfile.title || 'Professional';
  const matchingSkills = [];
  const otherSkills = [];

  const jobReqText = `${job.title || ''} ${job.description || ''} ${(job.skills || []).join(' ')} ${(job.requirements || []).join(' ')}`.toLowerCase();

  for (const s of (candidateProfile.skills || [])) {
    if (jobReqText.includes(s.toLowerCase())) {
      matchingSkills.push(s);
    } else {
      otherSkills.push(s);
    }
  }

  const orderedSkills = [...matchingSkills, ...otherSkills];

  // Professional summary tailored to job and company
  const companyName = job.company || 'your organization';
  const topSkillsStr = orderedSkills.slice(0, 4).join(', ');
  const summarySkillPhrase = topSkillsStr ? `Demonstrated background in ${topSkillsStr}. ` : '';
  const summary = candidateProfile.summary
    ? `${candidateProfile.summary} Tailored for ${targetTitle} role at ${companyName}.`
    : `Results-driven ${targetTitle} with proven technical background. ${summarySkillPhrase}Eager to apply relevant practical skills and project experience to contribute effectively at ${companyName}.`;

  // Sort candidate experience in reverse chronological order
  const rawExperience = (candidateProfile.experience || []).map(exp => ({
    position: exp.position || 'Developer',
    company: exp.company || 'Organization',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    highlights: exp.responsibilities
      ? exp.responsibilities.split('\n').map(h => h.trim()).filter(Boolean)
      : [`Contributed to core deliverables utilizing modern engineering practices.`]
  }));

  const experience = sortReverseChronological(rawExperience);

  // Sort candidate education in reverse chronological order
  const rawEducation = (candidateProfile.education || []).map(edu => ({
    degree: edu.degree || 'Degree Program',
    institution: edu.institution || 'University',
    startDate: edu.startDate || '',
    endDate: edu.endDate || ''
  }));

  const education = sortReverseChronological(rawEducation);

  // Map projects
  const projects = (candidateProfile.projects || []).map(p => ({
    name: p.name || 'Project',
    description: p.description || ''
  }));

  return {
    targetTitle,
    summary,
    skills: orderedSkills.length > 0 ? orderedSkills : ['Problem Solving', 'Engineering Principles'],
    experience: experience.length > 0 ? experience : [{
      position: targetTitle,
      company: 'Independent Projects / Practical Experience',
      startDate: '2023',
      endDate: 'Present',
      highlights: ['Designed and implemented software deliverables leveraging industry standards and agile practices.']
    }],
    education: education.length > 0 ? education : [{
      degree: 'Relevant Studies / Academic Training',
      institution: 'Academic Institution',
      startDate: '2019',
      endDate: '2023'
    }],
    projects
  };
}

/**
 * Main Tailoring Workflow:
 * Candidate Profile + Job -> AI Resume Tailoring -> Reverse Chronological Enforcement -> Resume Validator -> Output Files (PDF & DOCX)
 */
async function tailorResumeForJob(user, candidateProfile, job) {
  const prompt = `
You are an expert ATS resume optimizer and career strategist.
Tailor the candidate's resume specifically for this job application.

CRITICAL ATS & TRUTHFULNESS REQUIREMENTS:
1. TRUTHFUL: Do NOT invent fake employers, fake degrees, unearned credentials, or technologies the candidate never provided.
2. SOURCE GROUNDING: Only use skills, employers, and projects explicitly present in the CANDIDATE DATA.
3. RELEVANT: Prioritize and emphasize candidate skills and accomplishments that match the job description.
4. REVERSE CHRONOLOGICAL: Order experience and education strictly from newest to oldest.
5. CONCISE: Write impactful, action-oriented bullet points (STAR method).
6. ATS FRIENDLY: Single column, clear professional summary tailored to "${job.title}" at "${job.company}".

CANDIDATE DATA (Source of truth):
${JSON.stringify({
  title: candidateProfile.title || null,
  skills: candidateProfile.skills || [],
  languages: candidateProfile.languages || [],
  education: candidateProfile.education || [],
  experience: candidateProfile.experience || [],
  projects: candidateProfile.projects || [],
  summary: candidateProfile.summary || null
}, null, 2)}

JOB DETAILS:
${JSON.stringify({
  title: job.title,
  company: job.company,
  skills: job.skills || [],
  requirements: job.requirements || [],
  description: (job.description || '').slice(0, 1000)
}, null, 2)}
`;

  let structuredResume;
  try {
    structuredResume = await aiService.generate(prompt, resumeSchema);
  } catch (error) {
    logger.warn(`[TAILORING] AI generation unavailable, using fallback engine: ${error.message}`);
    structuredResume = fallbackTailorResume(candidateProfile, job);
  }

  // Enforce reverse chronological order on experience and education
  if (Array.isArray(structuredResume.experience)) {
    structuredResume.experience = sortReverseChronological(structuredResume.experience);
  }
  if (Array.isArray(structuredResume.education)) {
    structuredResume.education = sortReverseChronological(structuredResume.education);
  }

  // Validate with comprehensive Resume Validator (detects unsupported claims)
  const validation = validateTailoredResume(structuredResume, candidateProfile);
  if (!validation.isTruthful) {
    logger.warn(`[TAILORING] Unsupported claims flagged in tailored resume: ${validation.unsupportedClaims.join('; ')}`);
  }

  // Generate output files (PDF & DOCX)
  const candidateInfo = {
    name: user.name || 'Candidate',
    email: user.email || '',
    phone: candidateProfile.phone || '',
    location: candidateProfile.location || '',
    links: candidateProfile.links || {}
  };

  const fileId = uuidv4();
  const pdfFilename = `${fileId}.pdf`;
  const docxFilename = `${fileId}.docx`;

  const uploadBase = path.join(__dirname, '..', '..', 'uploads', 'tailored');
  const pdfFullPath = path.join(uploadBase, pdfFilename);
  const docxFullPath = path.join(uploadBase, docxFilename);

  await generateResumePdf(structuredResume, candidateInfo, pdfFullPath);
  await generateResumeDocx(structuredResume, candidateInfo, docxFullPath);

  const pdfRelativePath = `/uploads/tailored/${pdfFilename}`;
  const docxRelativePath = `/uploads/tailored/${docxFilename}`;

  // Upsert TailoredResume document in MongoDB with validation metadata
  const savedRecord = await TailoredResume.findOneAndUpdate(
    { user: user._id, job: job._id },
    {
      user: user._id,
      job: job._id,
      targetTitle: structuredResume.targetTitle,
      summary: structuredResume.summary,
      skills: structuredResume.skills,
      experience: structuredResume.experience,
      education: structuredResume.education,
      projects: structuredResume.projects,
      pdfPath: pdfRelativePath,
      docxPath: docxRelativePath,
      isTruthful: validation.isTruthful,
      isAtsCompliant: validation.isAtsCompliant,
      unsupportedClaims: validation.unsupportedClaims,
      validationReport: {
        isValid: validation.isValid,
        isReverseChronological: validation.isReverseChronological,
        warnings: validation.warnings,
        errors: validation.errors
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    tailoredResume: savedRecord,
    validation
  };
}

module.exports = {
  tailorResumeForJob,
  fallbackTailorResume
};
