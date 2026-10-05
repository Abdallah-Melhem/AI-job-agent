const path = require('path');
const { v4: uuidv4 } = require('uuid');
const aiService = require('./aiService');
const { resumeSchema, validateTailoredResume } = require('./resumeValidator');
const { generateResumePdf } = require('../templates/resumePdfGenerator');
const { generateResumeDocx } = require('../templates/resumeDocxGenerator');
const TailoredResume = require('../models/TailoredResume');

/**
 * Deterministic fallback tailoring engine when AI is offline
 */
function fallbackTailorResume(candidateProfile, job) {
  const targetTitle = job.title || 'Software Professional';
  const matchingSkills = [];
  const otherSkills = [];

  const jobReqText = `${job.title} ${job.description} ${(job.skills || []).join(' ')}`.toLowerCase();
  for (const s of (candidateProfile.skills || [])) {
    if (jobReqText.includes(s.toLowerCase())) {
      matchingSkills.push(s);
    } else {
      otherSkills.push(s);
    }
  }
  const orderedSkills = [...matchingSkills, ...otherSkills];

  const summary = `Results-driven ${targetTitle} with proven technical background. Demonstrated proficiency in ${orderedSkills.slice(0, 4).join(', ')}. Eager to leverage software engineering skills and practical project experience to drive impact at ${job.company}.`;

  const experience = (candidateProfile.experience || []).map(exp => ({
    position: exp.position || 'Developer',
    company: exp.company || 'Organization',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    highlights: exp.responsibilities 
      ? exp.responsibilities.split('\n').filter(Boolean)
      : [`Contributed to key software engineering deliverables utilizing modern development practices.`]
  }));

  const education = (candidateProfile.education || []).map(edu => ({
    degree: edu.degree || 'Degree Program',
    institution: edu.institution || 'University',
    startDate: edu.startDate || '',
    endDate: edu.endDate || ''
  }));

  const projects = (candidateProfile.projects || []).map(p => ({
    name: p.name || 'Project',
    description: p.description || ''
  }));

  return {
    targetTitle,
    summary,
    skills: orderedSkills.length > 0 ? orderedSkills : ['Problem Solving', 'Software Engineering'],
    experience: experience.length > 0 ? experience : [{
      position: targetTitle,
      company: 'Independent Projects / Freelance',
      startDate: '2023',
      endDate: 'Present',
      highlights: ['Designed and implemented software applications leveraging best design principles and agile practices.']
    }],
    education: education.length > 0 ? education : [{
      degree: 'Computer Science / Engineering Studies',
      institution: 'Academic Institution',
      startDate: '2019',
      endDate: '2023'
    }],
    projects
  };
}

/**
 * Main Tailoring Workflow:
 * Candidate Profile + Job -> AI Resume Tailoring -> Structured Resume -> Resume Validator -> Resume Generator (PDF & DOCX)
 */
async function tailorResumeForJob(user, candidateProfile, job) {
  const prompt = `
You are an expert ATS resume optimizer and career coach.
Tailor the candidate's resume specifically for this job application.

CRITICAL ATS REQUIREMENTS:
1. TRUTHFUL: Do NOT invent fake previous employers, fake degrees, or unearned credentials.
2. RELEVANT: Highlight and prioritize skills that match the target job description.
3. CONCISE: Write impactful, action-oriented bullet points (STAR method).
4. REVERSE CHRONOLOGICAL: Order experience and education from newest to oldest.
5. ATS FRIENDLY: Single column, clear professional summary tailored to "${job.title}" at "${job.company}".

CANDIDATE DATA:
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
  skills: job.skills || [],
  requirements: job.requirements || [],
  description: job.description
}, null, 2)}
`;

  let structuredResume;
  try {
    structuredResume = await aiService.generate(prompt, resumeSchema);
  } catch (error) {
    console.warn('AI tailoring prompt failed or timed out, generating via ATS fallback engine:', error.message);
    structuredResume = fallbackTailorResume(candidateProfile, job);
  }

  // Validate with Resume Validator
  const validation = validateTailoredResume(structuredResume, candidateProfile);
  if (!validation.isValid) {
    console.warn('Resume validation warnings/errors:', validation.errors);
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

  // Upsert TailoredResume document in MongoDB
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
      docxPath: docxRelativePath
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    tailoredResume: savedRecord,
    validation
  };
}

module.exports = {
  tailorResumeForJob
};
