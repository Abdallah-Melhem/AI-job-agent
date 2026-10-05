const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Common technology keywords to match in skills section or full text
 */
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'R', 'Scala',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Tailwind', 'Bootstrap',
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
  'Node.js', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Oracle', 'Cassandra', 'DynamoDB',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Docker', 'Kubernetes', 'Linux', 'Bash',
  'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP', 'Firebase', 'Vercel', 'Heroku',
  'REST', 'RESTful API', 'GraphQL', 'gRPC', 'WebSockets', 'Microservices',
  'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'CI/CD', 'GitHub Actions',
  'Agile', 'Scrum', 'Jira'
];

const COMMON_LANGUAGES = [
  'English', 'Arabic', 'Spanish', 'French', 'German', 'Italian', 'Russian', 'Chinese', 'Japanese', 'Portuguese', 'Turkish'
];

/**
 * Extract raw text from file buffer
 */
async function extractTextFromFile(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text || '';
  }

  if (ext === '.docx' || ext === '.doc' || mimetype?.includes('word')) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  // Fallback to text file read
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Parse structured information from extracted raw text
 */
function parseResumeText(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Contact Information
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i;
  const portfolioRegex = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9_-]+\.(?:com|org|io|dev|me|net)\b(?:\/[^\s]*)?/i;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const linkedinMatch = text.match(linkedinRegex);
  const githubMatch = text.match(githubRegex);
  
  // Find portfolio excluding linkedin/github
  let portfolio = '';
  const allUrls = text.match(new RegExp(portfolioRegex.source, 'gi')) || [];
  for (const url of allUrls) {
    if (!url.toLowerCase().includes('linkedin.com') && !url.toLowerCase().includes('github.com')) {
      portfolio = url;
      break;
    }
  }

  // 2. Candidate Name (Heuristic: usually first non-empty line with 2-4 words, no email/phone)
  let name = '';
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (
      !emailRegex.test(line) &&
      !phoneRegex.test(line) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('cv') &&
      line.length < 50 &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 5
    ) {
      name = line.replace(/[^a-zA-Z\s'-]/g, '').trim();
      if (name) break;
    }
  }

  // 3. Extract Section Blocks
  const sectionHeaders = [
    { key: 'education', regex: /^(?:education|academic background|academics|qualifications)\b/i },
    { key: 'experience', regex: /^(?:work experience|experience|employment history|professional experience|internships?)\b/i },
    { key: 'skills', regex: /^(?:technical skills|skills|technologies|core competencies|competencies)\b/i },
    { key: 'projects', regex: /^(?:projects|personal projects|academic projects|key projects)\b/i },
    { key: 'certifications', regex: /^(?:certifications|certificates|licenses)\b/i },
    { key: 'languages', regex: /^(?:languages|language proficiencies)\b/i }
  ];

  const sections = {};
  let currentSection = 'header';
  sections[currentSection] = [];

  for (const line of lines) {
    let matchedKey = null;
    for (const h of sectionHeaders) {
      if (h.regex.test(line.toLowerCase().trim())) {
        matchedKey = h.key;
        break;
      }
    }

    if (matchedKey) {
      currentSection = matchedKey;
      if (!sections[currentSection]) sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  // 4. Extract Skills
  const skillsSet = new Set();
  // Check predefined skills in text
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
    if (skillRegex.test(text)) {
      skillsSet.add(skill);
    }
  }
  // Check skills section lines
  if (sections.skills && sections.skills.length > 0) {
    for (const line of sections.skills) {
      const parts = line.split(/[,|•·\t;/]/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.length > 1 && part.length < 35 && !part.toLowerCase().includes('skills:')) {
          skillsSet.add(part);
        }
      }
    }
  }

  // 5. Extract Languages
  const languagesSet = new Set();
  for (const lang of COMMON_LANGUAGES) {
    const langRegex = new RegExp(`\\b${lang}\\b`, 'i');
    if (langRegex.test(text)) {
      languagesSet.add(lang);
    }
  }
  if (sections.languages && sections.languages.length > 0) {
    for (const line of sections.languages) {
      const parts = line.split(/[,|•·\t;/]/).map(p => p.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.length > 2 && p.length < 25) languagesSet.add(p);
      }
    }
  }

  // 6. Extract Education Entries
  const education = [];
  if (sections.education && sections.education.length > 0) {
    let currentEdu = null;
    for (const line of sections.education) {
      const dateMatch = line.match(/(?:19|20)\d{2}\s*(?:-|–|to)\s*(?:(?:19|20)\d{2}|present|current)/i);
      const degreeMatch = line.match(/\b(bachelor|master|phd|b\.?s\.?c?|m\.?s\.?c?|b\.?a\.?|associate|diploma)\b/i);

      if (degreeMatch || dateMatch) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = {
          degree: line,
          institution: '',
          startDate: '',
          endDate: '',
          gpa: ''
        };
        if (dateMatch) {
          const parts = dateMatch[0].split(/-|–|to/i).map(s => s.trim());
          currentEdu.startDate = parts[0] || '';
          currentEdu.endDate = parts[1] || '';
        }
      } else if (currentEdu && !currentEdu.institution) {
        currentEdu.institution = line;
      }
    }
    if (currentEdu) education.push(currentEdu);
  }

  // 7. Extract Experience Entries
  const experience = [];
  if (sections.experience && sections.experience.length > 0) {
    let currentExp = null;
    for (const line of sections.experience) {
      const dateMatch = line.match(/(?:19|20)\d{2}\s*(?:-|–|to)\s*(?:(?:19|20)\d{2}|present|current)/i);
      
      if (dateMatch) {
        if (currentExp) experience.push(currentExp);
        const parts = dateMatch[0].split(/-|–|to/i).map(s => s.trim());
        currentExp = {
          position: line.replace(dateMatch[0], '').trim(),
          company: '',
          startDate: parts[0] || '',
          endDate: parts[1] || '',
          responsibilities: ''
        };
      } else if (currentExp) {
        if (!currentExp.company) {
          currentExp.company = line;
        } else {
          currentExp.responsibilities = currentExp.responsibilities 
            ? `${currentExp.responsibilities}\n${line}` 
            : line;
        }
      }
    }
    if (currentExp) experience.push(currentExp);
  }

  // 8. Extract Projects
  const projects = [];
  if (sections.projects && sections.projects.length > 0) {
    let currentProj = null;
    for (const line of sections.projects) {
      if (line.length < 50 && !line.startsWith('-') && !line.startsWith('•')) {
        if (currentProj) projects.push(currentProj);
        currentProj = {
          name: line,
          description: '',
          technologies: []
        };
      } else if (currentProj) {
        currentProj.description = currentProj.description
          ? `${currentProj.description} ${line}`
          : line;
      }
    }
    if (currentProj) projects.push(currentProj);
  }

  // 9. Extract Certifications
  const certifications = [];
  if (sections.certifications && sections.certifications.length > 0) {
    for (const line of sections.certifications) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanLine.length > 3) {
        certifications.push(cleanLine);
      }
    }
  }

  return {
    name: name || '',
    contact: {
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: '',
      links: {
        linkedin: linkedinMatch ? linkedinMatch[0] : '',
        github: githubMatch ? githubMatch[0] : '',
        portfolio: portfolio || ''
      }
    },
    skills: Array.from(skillsSet),
    languages: Array.from(languagesSet),
    education,
    experience,
    projects,
    certifications,
    rawTextSnippet: text.slice(0, 300)
  };
}

module.exports = {
  extractTextFromFile,
  parseResumeText
};
