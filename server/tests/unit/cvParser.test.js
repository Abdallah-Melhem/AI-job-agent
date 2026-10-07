const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const {
  extractTextFromFile,
  parseResumeText,
  parseCV,
  extractRtfText,
  COMMON_SKILLS,
  COMMON_LANGUAGES
} = require('../../services/cvParser');

describe('cvParser — Phase 5 Document Parsing Engine', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-parser-tests-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  // Helper to create a test PDF file on disk
  const createPdfFile = (fileName, textContent = '') => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(tempDir, fileName);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      if (textContent) {
        doc.text(textContent);
      }
      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  };

  describe('extractRtfText', () => {
    test('extracts clean text from RTF content', () => {
      const rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Times;}}\\f0\\fs24 \\b Jane Doe\\b0\\par Senior Product Manager\\par Skills: Agile, Scrum, JIRA}';
      const extracted = extractRtfText(rtf);
      expect(extracted).toContain('Jane Doe');
      expect(extracted).toContain('Senior Product Manager');
      expect(extracted).toContain('Agile, Scrum, JIRA');
    });

    test('handles empty or null rtf gracefully', () => {
      expect(extractRtfText('')).toBe('');
      expect(extractRtfText(null)).toBe('');
    });
  });

  describe('extractTextFromFile — Format Handling', () => {
    test('parses text-based PDF correctly', async () => {
      const pdfPath = await createPdfFile('text-cv.pdf', 'Alice Smith\nSoftware Engineer\nEmail: alice@example.com\nSkills: React, Node.js, MongoDB');
      const result = await extractTextFromFile(pdfPath, 'application/pdf');

      expect(result.format).toBe('pdf');
      expect(result.isScanned).toBe(false);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
      expect(result.text).toContain('Alice Smith');
      expect(result.text).toContain('alice@example.com');
      expect(result.text).toContain('Node.js');
    });

    test('detects scanned/image-only PDF with no text layer', async () => {
      // Empty text PDF has pages but < 30 characters of text
      const scannedPdfPath = await createPdfFile('scanned-cv.pdf', '');
      const result = await extractTextFromFile(scannedPdfPath, 'application/pdf');

      expect(result.format).toBe('pdf');
      expect(result.isScanned).toBe(true);
      expect(result.warning).toContain('Scanned or image-only PDF detected');
      expect(result.text).toBe('');
    });

    test('parses TXT files correctly', async () => {
      const txtPath = path.join(tempDir, 'sample-cv.txt');
      fs.writeFileSync(txtPath, 'Bob Johnson\nDevOps Engineer\nEmail: bob@devops.org\nSkills: Docker, Kubernetes, AWS', 'utf8');

      const result = await extractTextFromFile(txtPath, 'text/plain');
      expect(result.format).toBe('txt');
      expect(result.isScanned).toBe(false);
      expect(result.text).toContain('Bob Johnson');
      expect(result.text).toContain('Kubernetes');
    });

    test('parses RTF files correctly', async () => {
      const rtfPath = path.join(tempDir, 'sample-cv.rtf');
      fs.writeFileSync(rtfPath, '{\\rtf1\\ansi \\b Carol White\\b0\\par Data Scientist\\par Email: carol@data.io\\par Skills: Python, SQL, Tableau}', 'utf8');

      const result = await extractTextFromFile(rtfPath, 'application/rtf');
      expect(result.format).toBe('rtf');
      expect(result.isScanned).toBe(false);
      expect(result.text).toContain('Carol White');
      expect(result.text).toContain('Data Scientist');
    });

    test('rejects unsupported file formats safely', async () => {
      const exePath = path.join(tempDir, 'malicious.exe');
      fs.writeFileSync(exePath, 'binary executable content');

      await expect(extractTextFromFile(exePath, 'application/x-msdownload'))
        .rejects.toThrow(/Unsupported file format/);
    });

    test('rejects empty file (0 bytes) safely', async () => {
      const emptyPath = path.join(tempDir, 'empty.txt');
      fs.writeFileSync(emptyPath, '');

      await expect(extractTextFromFile(emptyPath, 'text/plain'))
        .rejects.toThrow(/empty/i);
    });

    test('rejects corrupted PDF with missing header', async () => {
      const corruptPdf = path.join(tempDir, 'corrupt.pdf');
      fs.writeFileSync(corruptPdf, 'Not a valid pdf header');

      await expect(extractTextFromFile(corruptPdf, 'application/pdf'))
        .rejects.toThrow(/Invalid or corrupted PDF file/);
    });
  });

  describe('parseResumeText — Candidate Profile Normalization', () => {
    const sampleResumeText = `
Johnathan Doe
Senior Full-Stack Engineer
Email: john.doe@example.com
Phone: +1 (555) 234-5678
Location: San Francisco, CA
LinkedIn: https://linkedin.com/in/johnathandoe
GitHub: https://github.com/johnathandoe
Portfolio: https://johnathandoe.dev

PROFESSIONAL SUMMARY
Experienced engineering leader with over 8 years of experience designing high-scale cloud platforms and reactive web applications. Passionate about automated testing and mentoring junior developers.

EXPERIENCE
Lead Architect
Acme Global Inc.
Jan 2021 – Present
• Spearheaded migration from monolith to Node.js microservices.
• Reduced infrastructure costs by 35% on AWS.

Senior Software Engineer
Beta Solutions
Jun 2017 – Dec 2020
• Developed customer-facing React SPA used by 2M+ active users.
• Mentored a team of 6 engineers across Agile sprints.

EDUCATION
Master of Science in Computer Science
Stanford University
2015 – 2017
GPA: 3.9

Bachelor of Science in Software Engineering
UC Berkeley
2011 – 2015

SKILLS
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, Docker, Kubernetes, AWS, GraphQL, Agile, Scrum

LANGUAGES
English, Spanish, German

PROJECTS
CloudScaler
Automated Kubernetes cluster optimizer built with Go and React.
Technologies: Go, React, Docker, Kubernetes
https://github.com/johnathandoe/cloudscaler

CERTIFICATIONS
AWS Certified Solutions Architect – Professional
Certified ScrumMaster (CSM)

ACHIEVEMENTS
• Winner, Global Cloud Hackathon 2023
• Innovator of the Year Award 2022 at Acme Global
    `.trim();

    test('maps all sections into normalized candidate profile', () => {
      const profile = parseResumeText(sampleResumeText, { format: 'pdf', pageCount: 2 });

      // 1. Personal Information
      expect(profile.personalInfo.name).toBe('Johnathan Doe');
      expect(profile.personalInfo.email).toBe('john.doe@example.com');
      expect(profile.personalInfo.phone).toBe('+1 (555) 234-5678');
      expect(profile.personalInfo.location).toContain('San Francisco');
      expect(profile.personalInfo.title).toBe('Senior Full-Stack Engineer');
      expect(profile.personalInfo.summary).toContain('Experienced engineering leader');
      expect(profile.personalInfo.links.linkedin).toContain('linkedin.com/in/johnathandoe');
      expect(profile.personalInfo.links.github).toContain('github.com/johnathandoe');
      expect(profile.personalInfo.links.portfolio).toBe('https://johnathandoe.dev');

      // 2. Education
      expect(profile.education.length).toBeGreaterThanOrEqual(1);
      const stanford = profile.education.find(e => e.institution?.includes('Stanford') || e.degree?.includes('Stanford') || e.degree?.includes('Master'));
      expect(stanford).toBeDefined();

      // 3. Experience
      expect(profile.experience.length).toBeGreaterThanOrEqual(2);
      expect(profile.experience[0].position).toBeDefined();

      // 4. Skills
      expect(profile.skills).toContain('React');
      expect(profile.skills).toContain('Node.js');
      expect(profile.skills).toContain('Docker');
      expect(profile.skills).toContain('PostgreSQL');
      expect(profile.skills).toContain('Agile');

      // 5. Projects
      expect(profile.projects.length).toBeGreaterThanOrEqual(1);
      const proj = profile.projects[0];
      expect(proj.name).toBe('CloudScaler');

      // 6. Certifications
      expect(profile.certifications.length).toBeGreaterThanOrEqual(1);
      expect(profile.certifications.some(c => c.includes('AWS Certified'))).toBe(true);

      // 7. Languages
      expect(profile.languages).toContain('English');
      expect(profile.languages).toContain('Spanish');

      // 8. Achievements
      expect(profile.achievements.length).toBeGreaterThanOrEqual(1);
      expect(profile.achievements.some(a => a.includes('Hackathon'))).toBe(true);

      // 9. Backward compatibility top-level aliases
      expect(profile.name).toBe('Johnathan Doe');
      expect(profile.contact.email).toBe('john.doe@example.com');
      expect(profile.contact.phone).toBe('+1 (555) 234-5678');
      expect(profile.summary).toContain('Experienced engineering leader');
      expect(profile.metadata.format).toBe('pdf');
      expect(profile.metadata.pageCount).toBe(2);
      expect(profile.metadata.isScanned).toBe(false);
    });

    test('handles empty text and scanned flag gracefully', () => {
      const profile = parseResumeText('', { isScanned: true, format: 'pdf', warning: 'Scanned document' });

      expect(profile.personalInfo.name).toBe('');
      expect(profile.skills).toEqual([]);
      expect(profile.education).toEqual([]);
      expect(profile.experience).toEqual([]);
      expect(profile.metadata.isScanned).toBe(true);
      expect(profile.metadata.warning).toBe('Scanned document');
    });

    test('parses non-tech CVs with business/marketing skills', () => {
      const nonTechResume = `
Maria Garcia
Marketing Director
Email: maria.g@business.com
Phone: +49 170 1234567
Location: Berlin, Germany

SUMMARY
Dynamic Marketing Director with 10 years of experience leading international campaigns, SEO, and Brand Strategy.

SKILLS
Digital Marketing, SEO, Content Strategy, Copywriting, Public Relations, Strategic Planning, CRM, Salesforce

LANGUAGES
German, English, Spanish
      `.trim();

      const profile = parseResumeText(nonTechResume, { format: 'docx' });

      expect(profile.personalInfo.name).toBe('Maria Garcia');
      expect(profile.personalInfo.title).toBe('Marketing Director');
      expect(profile.skills).toContain('Digital Marketing');
      expect(profile.skills).toContain('SEO');
      expect(profile.skills).toContain('Salesforce');
      expect(profile.languages).toContain('German');
      expect(profile.languages).toContain('English');
    });
  });

  describe('parseCV helper', () => {
    test('extracts and parses end-to-end from file path', async () => {
      const testPath = path.join(tempDir, 'e2e-cv.txt');
      fs.writeFileSync(testPath, 'David Kim\nProduct Designer\nEmail: david@design.co\nSkills: Figma, UI/UX Design, Agile');

      const result = await parseCV(testPath, 'text/plain');
      expect(result.personalInfo.name).toBe('David Kim');
      expect(result.personalInfo.email).toBe('david@design.co');
      expect(result.skills).toContain('Figma');
      expect(result.skills).toContain('UI/UX Design');
    });
  });
});
