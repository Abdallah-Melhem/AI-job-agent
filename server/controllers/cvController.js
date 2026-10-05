const fs = require('fs');
const path = require('path');
const CV = require('../models/CV');

// @desc    Upload a CV
// @route   POST /api/cv/upload
// @access  Private
const uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Save metadata to database
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
    res.status(500).json({ message: error.message });
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

    // Remove file from filesystem
    const filePath = path.join(__dirname, '..', '..', cv.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await CV.findByIdAndDelete(req.params.id);

    res.json({ message: 'CV removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const { extractTextFromFile, parseResumeText } = require('../services/cvParser');

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

    const filePath = path.join(__dirname, '..', '..', cv.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'CV file missing on disk' });
    }

    const rawText = await extractTextFromFile(filePath, cv.mimetype);
    const parsedData = parseResumeText(rawText);

    res.json({
      success: true,
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
  deleteCV,
  parseCV
};
