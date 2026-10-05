const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Generates an ATS-friendly, clean, single/multi-page PDF resume.
 * ATS rules: Standard single-column layout, clear standard headings, clean typography.
 */
function generateResumePdf(resumeData, candidateInfo, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 45, right: 45 }
    });

    // Ensure parent directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Header: Name & Target Title ──
    const candidateName = candidateInfo.name || 'Candidate';
    doc.fontSize(22).font('Helvetica-Bold').text(candidateName, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica').fillColor('#2B6CB0').text(resumeData.targetTitle, { align: 'center' });
    doc.moveDown(0.2);

    // Contact line
    const contacts = [
      candidateInfo.email,
      candidateInfo.phone,
      candidateInfo.location,
      candidateInfo.links?.linkedin
    ].filter(Boolean);

    doc.fontSize(9).font('Helvetica').fillColor('#555555').text(contacts.join('  •  '), { align: 'center' });
    doc.moveDown(0.8);

    // Divider line
    doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.8);

    // Helper for Section Headers
    const addSectionHeader = (title) => {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A202C').text(title.toUpperCase());
      doc.strokeColor('#2B6CB0').lineWidth(1.2).moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).stroke();
      doc.moveDown(0.4);
    };

    // ── Professional Summary ──
    if (resumeData.summary) {
      addSectionHeader('Professional Summary');
      doc.fontSize(10).font('Helvetica').fillColor('#2D3748').text(resumeData.summary, {
        align: 'justify',
        lineGap: 2
      });
      doc.moveDown(0.5);
    }

    // ── Core Technical Skills ──
    if (resumeData.skills && resumeData.skills.length > 0) {
      addSectionHeader('Technical Skills & Proficiencies');
      doc.fontSize(9.5).font('Helvetica').fillColor('#2D3748').text(resumeData.skills.join('  |  '), {
        lineGap: 2
      });
      doc.moveDown(0.5);
    }

    // ── Professional Experience ──
    if (resumeData.experience && resumeData.experience.length > 0) {
      addSectionHeader('Professional Experience');
      for (const exp of resumeData.experience) {
        // Job Title and Dates
        const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
        doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#1A202C').text(exp.position || '', { continued: !!dateRange });
        if (dateRange) {
          doc.fontSize(9).font('Helvetica-Oblique').fillColor('#718096').text(`   (${dateRange})`);
        }
        
        // Company
        if (exp.company) {
          doc.fontSize(9.5).font('Helvetica').fillColor('#4A5568').text(exp.company);
        }

        // Highlights / Bullet points
        if (exp.highlights && exp.highlights.length > 0) {
          doc.moveDown(0.2);
          for (const point of exp.highlights) {
            doc.fontSize(9).font('Helvetica').fillColor('#2D3748').text(`•  ${point}`, {
              indent: 10,
              lineGap: 1.5
            });
          }
        }
        doc.moveDown(0.4);
      }
    }

    // ── Education ──
    if (resumeData.education && resumeData.education.length > 0) {
      addSectionHeader('Education');
      for (const edu of resumeData.education) {
        const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A202C').text(edu.degree || '', { continued: !!dateRange });
        if (dateRange) {
          doc.fontSize(9).font('Helvetica-Oblique').fillColor('#718096').text(`   (${dateRange})`);
        }
        if (edu.institution) {
          doc.fontSize(9.5).font('Helvetica').fillColor('#4A5568').text(edu.institution);
        }
        doc.moveDown(0.3);
      }
    }

    // ── Projects ──
    if (resumeData.projects && resumeData.projects.length > 0) {
      addSectionHeader('Key Projects');
      for (const proj of resumeData.projects) {
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1A202C').text(proj.name || '');
        if (proj.description) {
          doc.fontSize(9).font('Helvetica').fillColor('#4A5568').text(proj.description, { indent: 10, lineGap: 1.5 });
        }
        doc.moveDown(0.2);
      }
    }

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
}

module.exports = { generateResumePdf };
