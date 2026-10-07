const fs = require('fs');
const path = require('path');
const CV = require('../models/CV');
const { extractTextFromFile, parseResumeText } = require('../services/cvParser');
const { sanitizeFilePath } = require('../utils/security');
const logger = require('../utils/logger');

// @desc    Upload a CV
// @route   POST /api/cv/upload
// @access  Private
const uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', req.file.filename);

    // Validate uploaded file is not empty
    if (req.file.size === 0) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'Uploaded file is empty (0 bytes).' });
    }

    // Save metadata to database (never store real CV content in logs)
    const cv = await CV.create({
      user: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`
    });

    res.status(201).json(cv);
  } catch (error) {
    // Cleanup file if DB save fails
    if (req.file) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
    res.status(500).json({ message: error.message || 'File upload failed' });
  }
};

// @desc    Get user's CVs
// @route   GET /api/cv
// @access  Private
const getCVs = async (req, res) => {
  try {
    const cvs = await CV.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(cvs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download / view a CV securely (authenticated, not publicly exposed)
// @route   GET /api/cv/:id/download
// @access  Private
const downloadCV = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);

    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    // Check if the CV belongs to the requesting user
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to access this CV' });
    }

    const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads');
    const relativeName = path.basename(cv.path);
    const filePath = sanitizeFilePath(uploadBaseDir, relativeName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'CV file missing or invalid on disk' });
    }

    res.setHeader('Content-Type', cv.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(cv.originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a CV
// @route   DELETE /api/cv/:id
// @access  Private
const deleteCV = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);

    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    // Check if the CV belongs to the user
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Remove file safely from filesystem
    const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads');
    const relativeName = path.basename(cv.path);
    const filePath = sanitizeFilePath(uploadBaseDir, relativeName);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // Non-fatal if already removed
      }
    }

    await CV.findByIdAndDelete(req.params.id);

    res.json({ message: 'CV removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Parse an uploaded CV
// @route   POST /api/cv/:id/parse
// @access  Private
const parseCV = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);

    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    // Check if the CV belongs to the user
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads');
    const relativeName = path.basename(cv.path);
    const filePath = sanitizeFilePath(uploadBaseDir, relativeName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'CV file missing or invalid on disk' });
    }

    // Extract text with format detection and scanned PDF check
    const extraction = await extractTextFromFile(filePath, cv.mimetype);
    const parsedData = parseResumeText(extraction.text, {
      format: extraction.format,
      pageCount: extraction.pageCount,
      isScanned: extraction.isScanned,
      warning: extraction.warning
    });

    // Update CV document metadata
    cv.isScanned = Boolean(extraction.isScanned);
    cv.parsedData = parsedData;
    await cv.save();

    if (extraction.isScanned) {
      return res.json({
        success: true,
        isScanned: true,
        warning: extraction.warning,
        message: 'Scanned or image-only PDF detected (no text layer). OCR is not enabled. Please upload a text-based PDF, DOCX, or TXT file.',
        cvId: cv._id,
        originalName: cv.originalName,
        data: parsedData
      });
    }

    res.json({
      success: true,
      isScanned: false,
      message: 'CV parsed successfully',
      cvId: cv._id,
      originalName: cv.originalName,
      data: parsedData
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to parse CV' });
  }
};

module.exports = {
  uploadCV,
  getCVs,
  downloadCV,
  deleteCV,
  parseCV
};
