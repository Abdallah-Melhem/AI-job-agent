const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Support both pdf-parse v2 (class export) and v1 (function export)
let PDFParseClass = null;
try {
  const pdfModule = require('pdf-parse');
  PDFParseClass = pdfModule.PDFParse || (typeof pdfModule === 'function' ? pdfModule : null);
} catch (err) {
  PDFParseClass = null;
}

/**
 * Common technical and business skills to detect
 */
const COMMON_SKILLS = [
  // Programming & Scripting
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'R', 'Scala', 'Dart', 'SQL', 'Bash', 'PowerShell',
  // Frontend
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Tailwind', 'Bootstrap', 'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Redux', 'Webpack', 'Vite',
  // Backend & APIs
  'Node.js', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Ruby on Rails', 'Laravel', 'ASP.NET', 'GraphQL', 'REST', 'RESTful API', 'gRPC', 'WebSockets', 'Microservices',
  // Databases
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Oracle', 'Cassandra', 'DynamoDB', 'Elasticsearch',
  // Cloud & DevOps
  'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP', 'Firebase', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'Terraform', 'Linux',
  // Testing & Tools
  'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Git', 'GitHub', 'GitLab', 'Postman', 'Jira', 'Confluence',
  // Business, Management & Non-Tech
  'Agile', 'Scrum', 'Kanban', 'Project Management', 'Product Management', 'Product Design', 'UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
  'Data Analysis', 'Machine Learning', 'Deep Learning', 'Business Intelligence', 'Tableau', 'Power BI', 'Excel',
  'Marketing', 'Digital Marketing', 'SEO', 'Content Strategy', 'Copywriting', 'Sales', 'Customer Success', 'CRM', 'Salesforce', 'HubSpot',
  'Human Resources', 'Recruitment', 'Talent Acquisition', 'Financial Analysis', 'Accounting', 'Strategic Planning', 'Public Relations'
];

/**
 * Common languages to detect
 */
const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch', 'Swedish', 'Polish', 'Turkish', 'Vietnamese'
];

/**
 * Clean and extract plain text from RTF content
 */
function extractRtfText(rtfString) {
  if (!rtfString) return '';
  let text = rtfString.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^}]*\}/gi, '');
  text = text.replace(/\\(par|line)\b/gi, '\n');
  text = text.replace(/\\tab\b/gi, '\t');
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  text = text.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  text = text.replace(/[{}]/g, '');
  return text.trim();
}

/**
 * Extract raw text and metadata from file (PDF, DOCX, TXT, RTF)
 * Distinguishes text-based vs scanned/image PDFs.
 */
async function extractTextFromFile(filePath, mimetype) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('File not found on disk');
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error('The file is empty (0 bytes).');
  }

  const ext = path.extname(filePath).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];

  if (!allowedExtensions.includes(ext) && !mimetype?.includes('pdf') && !mimetype?.includes('word') && !mimetype?.includes('text') && !mimetype?.includes('rtf')) {
    throw new Error(`Unsupported file format "${ext || mimetype}". Supported formats are: PDF, DOCX, TXT, RTF.`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  // 1. PDF Handling
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    // Basic magic bytes check: %PDF
    const header = dataBuffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid or corrupted PDF file: missing PDF header signature.');
    }

    let extractedText = '';
    let totalPages = 1;

    try {
      if (PDFParseClass && typeof PDFParseClass === 'function' && PDFParseClass.prototype?.getText) {
        // pdf-parse v2 class
        const parser = new PDFParseClass({ data: dataBuffer });
        const result = await parser.getText();
        totalPages = result.total || (result.pages ? result.pages.length : 1);
        extractedText = result.text || '';
        await parser.destroy();
      } else if (typeof PDFParseClass === 'function') {
        // pdf-parse v1 function
        const result = await PDFParseClass(dataBuffer);
        totalPages = result.numpages || 1;
        extractedText = result.text || '';
      } else {
        throw new Error('PDF parsing library is not properly configured.');
      }
    } catch (parseErr) {
      throw new Error(`Failed to read PDF document: ${parseErr.message}`);
    }

    // Clean page artifacts
    const cleanText = extractedText
      .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
      .replace(/\f/g, '\n')
      .trim();

    // Check if scanned / image-only PDF: pages exist but extractable text is fewer than 30 characters
    const nonWhitespaceCount = cleanText.replace(/\s+/g, '').length;
    const isScanned = totalPages > 0 && nonWhitespaceCount < 30;

    return {
      text: isScanned ? '' : cleanText,
      format: 'pdf',
      pageCount: totalPages,
      isScanned,
      warning: isScanned
        ? 'Scanned or image-only PDF detected (no text layer). OCR is not enabled. Please upload a text-based PDF, DOCX, or TXT file.'
        : null
    };
  }

  // 2. DOCX / DOC Handling
  if (ext === '.docx' || ext === '.doc' || mimetype?.includes('word')) {
    try {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      const cleanText = (result.value || '').trim();
      return {
        text: cleanText,
        format: 'docx',
        pageCount: 1,
        isScanned: false,
        warning: cleanText.length === 0 ? 'DOCX document contains no readable text.' : null
      };
    } catch (err) {
      throw new Error(`Failed to read DOCX document: ${err.message}`);
    }
  }

  // 3. RTF Handling
  if (ext === '.rtf' || mimetype === 'application/rtf' || mimetype === 'text/rtf') {
    const rawRtf = dataBuffer.toString('utf8');
    const cleanText = extractRtfText(rawRtf);
    return {
      text: cleanText,
      format: 'rtf',
      pageCount: 1,
      isScanned: false,
      warning: cleanText.length === 0 ? 'RTF document contains no readable text.' : null
    };
  }

  // 4. TXT Handling
  if (ext === '.txt' || mimetype === 'text/plain') {
    const cleanText = dataBuffer.toString('utf8').trim();
    return {
      text: cleanText,
      format: 'txt',
      pageCount: 1,
      isScanned: false,
      warning: cleanText.length === 0 ? 'TXT document is empty.' : null
    };
  }

  throw new Error(`Unsupported file format "${ext}". Supported formats: PDF, DOCX, TXT, RTF.`);
}

/**
 * Parse structured information from extracted raw text into a normalized candidate profile.
 */
function parseResumeText(rawText, metadata = {}) {
  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // If scanned or empty text, return normalized empty profile with warning
  if (metadata.isScanned || lines.length === 0) {
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        title: '',
        summary: '',
        links: { linkedin: '', github: '', portfolio: '', website: '', other: [] }
      },
      education: [],
      experience: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      achievements: [],
      // Backward-compatible root properties
      name: '',
      contact: {
        email: '',
        phone: '',
        location: '',
        links: { linkedin: '', github: '', portfolio: '', website: '' }
      },
      summary: '',
      rawTextSnippet: '',
      metadata: {
        format: metadata.format || 'unknown',
        isScanned: Boolean(metadata.isScanned),
        pageCount: metadata.pageCount || 1,
        characterCount: 0,
        extractedAt: new Date().toISOString(),
        warning: metadata.warning || null
      }
    };
  }

  // 1. Contact Information Regexes
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i;
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const linkedinMatch = text.match(linkedinRegex);
  const githubMatch = text.match(githubRegex);

  // Extract all URLs and classify portfolio/website/other
  const allUrls = text.match(urlRegex) || [];
  let portfolio = '';
  let website = '';
  const otherLinks = [];

  for (const url of allUrls) {
    const lower = url.toLowerCase();
    if (lower.includes('linkedin.com')) continue;
    if (lower.includes('github.com')) continue;
    if (!portfolio && (lower.includes('portfolio') || lower.includes('.dev') || lower.includes('.io') || lower.includes('.me'))) {
      portfolio = url;
    } else if (!website && (lower.includes('.com') || lower.includes('.org') || lower.includes('.net'))) {
      website = url;
    } else {
      otherLinks.push(url);
    }
  }

  // 2. Candidate Name & Target Title Heuristic
  let name = '';
  let candidateTitle = '';
  const ignoreNameKeywords = [
    'resume', 'curriculum', 'vitae', 'cv', 'contact', 'email', 'phone', 'profile', 'summary',
    'experience', 'education', 'skills', 'projects', 'page', 'portfolio'
  ];

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const hasIgnoreWord = ignoreNameKeywords.some(kw => lower === kw || lower.startsWith(kw + ':') || lower.startsWith(kw + ' -'));
    const isContactLine = emailRegex.test(line) || phoneRegex.test(line) || line.includes('http') || line.includes('@');

    if (!name && !hasIgnoreWord && !isContactLine && line.length < 50) {
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && !/^\d/.test(line)) {
        name = line.replace(/[^a-zA-Z\s'-]/g, '').trim();
        continue;
      }
    }

    // Line right after name might be a title / headline
    if (name && !candidateTitle && !hasIgnoreWord && !isContactLine && line.length < 60) {
      if (/developer|engineer|manager|director|lead|head|designer|analyst|consultant|architect|specialist|officer|scientist|administrator|coordinator|strategist|recruiter|accountant|writer|producer|advisor|executive/i.test(line)) {
        candidateTitle = line.trim();
      }
    }
  }

  // 3. Location Detection Heuristic
  let location = '';
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (line.match(/\b([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]+)\b/) || line.match(/\b(Remote|Worldwide|Germany|United States|USA|UK|Canada|France|Spain|Netherlands|Berlin|London|Munich|New York|San Francisco)\b/i)) {
      if (!emailRegex.test(line) && line.length < 60 && !line.toLowerCase().includes('university') && !line.toLowerCase().includes('company')) {
        location = line.replace(/(?:phone|email|location|address):?/gi, '').trim();
        break;
      }
    }
  }

  // 4. Section Block Splitting
  const sectionHeaders = [
    { key: 'summary', regex: /^(?:professional summary|summary|profile|about me|executive summary|career summary|career objective|objective)\b/i },
    { key: 'education', regex: /^(?:education|academic background|academics|qualifications|academic history)\b/i },
    { key: 'experience', regex: /^(?:work experience|experience|employment history|professional experience|internships?|career history)\b/i },
    { key: 'skills', regex: /^(?:technical skills|skills|technologies|core competencies|competencies|tools & technologies|expertise)\b/i },
    { key: 'projects', regex: /^(?:projects|personal projects|key projects|selected projects|open source projects)\b/i },
    { key: 'certifications', regex: /^(?:certifications|certificates|licenses|credentials|courses & certifications)\b/i },
    { key: 'languages', regex: /^(?:languages|language proficiencies|spoken languages)\b/i },
    { key: 'achievements', regex: /^(?:achievements|awards|honors|key achievements|accomplishments|awards & honors)\b/i }
  ];

  const sections = {};
  let currentSection = 'header';
  sections[currentSection] = [];

  for (const line of lines) {
    let matchedKey = null;
    const cleanHeaderLine = line.replace(/[:\-–—#*]/g, '').trim();
    for (const h of sectionHeaders) {
      if (h.regex.test(cleanHeaderLine)) {
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

  // 5. Professional Summary
  let summary = '';
  if (sections.summary && sections.summary.length > 0) {
    summary = sections.summary.join(' ').trim();
  }

  // 6. Skills Extraction
  const skillsSet = new Set();
  // Match common skills from full text
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
    if (skillRegex.test(text)) {
      skillsSet.add(skill);
    }
  }
  // Extract items from skills section
  if (sections.skills && sections.skills.length > 0) {
    for (const line of sections.skills) {
      const parts = line.split(/[,|•·\t;/]/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.length > 1 && part.length < 40 && !part.toLowerCase().includes('skills:') && !part.toLowerCase().includes('competencies:')) {
          skillsSet.add(part);
        }
      }
    }
  }

  // 7. Languages Extraction
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
        if (p.length > 2 && p.length < 35) languagesSet.add(p);
      }
    }
  }

  // 8. Education Extraction
  const education = [];
  if (sections.education && sections.education.length > 0) {
    let currentEdu = null;
    for (const line of sections.education) {
      const dateMatch = line.match(/(?:19|20)\d{2}\s*(?:-|–|to)\s*(?:(?:19|20)\d{2}|present|current)/i) || line.match(/\b(19|20)\d{2}\b/);
      const degreeMatch = line.match(/\b(bachelor|master|phd|b\.?s\.?c?|m\.?s\.?c?|b\.?a\.?|associate|diploma|doctorate|b\.?tech|m\.?tech)\b/i);

      if (degreeMatch || (dateMatch && !currentEdu)) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = {
          degree: line,
          institution: '',
          startDate: '',
          endDate: '',
          gpa: '',
          fieldOfStudy: ''
        };
        if (dateMatch) {
          const parts = dateMatch[0].split(/-|–|to/i).map(s => s.trim());
          currentEdu.startDate = parts[0] || '';
          currentEdu.endDate = parts[1] || parts[0] || '';
        }
      } else if (currentEdu) {
        if (!currentEdu.institution) {
          currentEdu.institution = line;
        } else if (/gpa|grade|honors/i.test(line)) {
          currentEdu.gpa = line.replace(/gpa:?/i, '').trim();
        } else if (!currentEdu.fieldOfStudy && /science|engineering|business|arts|studies|informatics/i.test(line)) {
          currentEdu.fieldOfStudy = line;
        }
      }
    }
    if (currentEdu) education.push(currentEdu);
  }

  // 9. Experience Extraction
  const experience = [];
  if (sections.experience && sections.experience.length > 0) {
    let currentExp = null;
    for (const line of sections.experience) {
      const dateMatch = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}\s*(?:-|–|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:(?:19|20)\d{2}|present|current)/i);

      if (dateMatch) {
        if (currentExp) experience.push(currentExp);
        const parts = dateMatch[0].split(/-|–|to/i).map(s => s.trim());
        const posText = line.replace(dateMatch[0], '').replace(/^[-–|,]\s*/, '').replace(/\s*[-–|,]$/, '').trim();
        currentExp = {
          position: posText || 'Position',
          company: '',
          startDate: parts[0] || '',
          endDate: parts[1] || 'Present',
          responsibilities: '',
          location: ''
        };
      } else if (currentExp) {
        if (!currentExp.company && !line.startsWith('•') && !line.startsWith('-')) {
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

  // 10. Projects Extraction
  const projects = [];
  if (sections.projects && sections.projects.length > 0) {
    let currentProj = null;
    for (const line of sections.projects) {
      if (line.length < 60 && !line.startsWith('-') && !line.startsWith('•') && !line.includes('http')) {
        if (currentProj) projects.push(currentProj);
        currentProj = {
          name: line.replace(/^#+\s*/, '').trim(),
          description: '',
          technologies: [],
          link: ''
        };
      } else if (currentProj) {
        if (line.includes('http')) {
          currentProj.link = line.match(urlRegex)?.[0] || '';
        } else if (/tech|technologies|built with|stack:/i.test(line)) {
          const techList = line.replace(/^(?:tech|technologies|built with|stack):?/i, '').split(/[,|/]/).map(t => t.trim()).filter(Boolean);
          currentProj.technologies = techList;
        } else {
          currentProj.description = currentProj.description
            ? `${currentProj.description} ${line}`
            : line;
        }
      }
    }
    if (currentProj) projects.push(currentProj);
  }

  // 11. Certifications Extraction
  const certifications = [];
  if (sections.certifications && sections.certifications.length > 0) {
    for (const line of sections.certifications) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanLine.length > 3) {
        certifications.push(cleanLine);
      }
    }
  }

  // 12. Achievements Extraction
  const achievements = [];
  if (sections.achievements && sections.achievements.length > 0) {
    for (const line of sections.achievements) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanLine.length > 3) {
        achievements.push(cleanLine);
      }
    }
  }

  const finalSkills = Array.from(skillsSet);
  const finalLanguages = Array.from(languagesSet);

  return {
    // Section 1: Personal Information
    personalInfo: {
      name: name || '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: location || '',
      title: candidateTitle || '',
      summary: summary || '',
      links: {
        linkedin: linkedinMatch ? linkedinMatch[0] : '',
        github: githubMatch ? githubMatch[0] : '',
        portfolio: portfolio || '',
        website: website || '',
        other: otherLinks
      }
    },
    // Section 2: Education
    education,
    // Section 3: Experience
    experience,
    // Section 4: Skills
    skills: finalSkills,
    // Section 5: Projects
    projects,
    // Section 6: Certifications
    certifications,
    // Section 7: Languages
    languages: finalLanguages,
    // Section 8: Achievements
    achievements,
    // Section 9: Links summary
    links: {
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
      portfolio: portfolio || '',
      website: website || '',
      other: otherLinks
    },

    // Backward-compatible root-level properties for existing UI and services
    name: name || '',
    contact: {
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: location || '',
      links: {
        linkedin: linkedinMatch ? linkedinMatch[0] : '',
        github: githubMatch ? githubMatch[0] : '',
        portfolio: portfolio || '',
        website: website || ''
      }
    },
    title: candidateTitle || '',
    summary: summary || '',
    rawTextSnippet: text.slice(0, 300),
    metadata: {
      format: metadata.format || 'unknown',
      isScanned: Boolean(metadata.isScanned),
      pageCount: metadata.pageCount || 1,
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
      warning: metadata.warning || null
    }
  };
}

/**
 * Top-level convenience method to parse a CV file by path
 */
async function parseCV(filePath, mimetype) {
  const extracted = await extractTextFromFile(filePath, mimetype);
  return parseResumeText(extracted.text, {
    format: extracted.format,
    pageCount: extracted.pageCount,
    isScanned: extracted.isScanned,
    warning: extracted.warning
  });
}

module.exports = {
  extractTextFromFile,
  parseResumeText,
  parseCV,
  extractRtfText,
  COMMON_SKILLS,
  COMMON_LANGUAGES
};
