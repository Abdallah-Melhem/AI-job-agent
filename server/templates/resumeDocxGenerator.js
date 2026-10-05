const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

/**
 * Generates an ATS-friendly, clean DOCX resume.
 */
async function generateResumeDocx(resumeData, candidateInfo, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sections = [];
  const candidateName = candidateInfo.name || 'Candidate';

  const children = [
    // Name Header
    new Paragraph({
      text: candidateName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: resumeData.targetTitle,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: [
        candidateInfo.email,
        candidateInfo.phone,
        candidateInfo.location,
        candidateInfo.links?.linkedin
      ].filter(Boolean).join('  |  '),
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }), // blank spacer

    // Professional Summary Header
    new Paragraph({
      text: 'PROFESSIONAL SUMMARY',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({
      text: resumeData.summary || ''
    }),
    new Paragraph({ text: '' }),

    // Skills
    new Paragraph({
      text: 'CORE TECHNICAL SKILLS',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({
      text: (resumeData.skills || []).join(', ')
    }),
    new Paragraph({ text: '' })
  ];

  // Experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    children.push(
      new Paragraph({
        text: 'PROFESSIONAL EXPERIENCE',
        heading: HeadingLevel.HEADING_2
      })
    );

    for (const exp of resumeData.experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.position || ''} `, bold: true }),
            new TextRun({ text: exp.company ? `— ${exp.company} ` : '' }),
            new TextRun({ text: dates ? `(${dates})` : '', italics: true })
          ]
        })
      );

      if (exp.highlights && exp.highlights.length > 0) {
        for (const pt of exp.highlights) {
          children.push(
            new Paragraph({
              text: `• ${pt}`,
              indent: { left: 360 }
            })
          );
        }
      }
      children.push(new Paragraph({ text: '' }));
    }
  }

  // Education
  if (resumeData.education && resumeData.education.length > 0) {
    children.push(
      new Paragraph({
        text: 'EDUCATION',
        heading: HeadingLevel.HEADING_2
      })
    );
    for (const edu of resumeData.education) {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${edu.degree || ''} `, bold: true }),
            new TextRun({ text: edu.institution ? `— ${edu.institution} ` : '' }),
            new TextRun({ text: dates ? `(${dates})` : '', italics: true })
          ]
        })
      );
    }
    children.push(new Paragraph({ text: '' }));
  }

  // Projects
  if (resumeData.projects && resumeData.projects.length > 0) {
    children.push(
      new Paragraph({
        text: 'KEY PROJECTS',
        heading: HeadingLevel.HEADING_2
      })
    );
    for (const proj of resumeData.projects) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${proj.name || ''}: `, bold: true }),
            new TextRun({ text: proj.description || '' })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { generateResumeDocx };
