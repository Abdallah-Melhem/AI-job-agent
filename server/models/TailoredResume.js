const mongoose = require('mongoose');

const tailoredResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  targetTitle: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  skills: [{
    type: String
  }],
  experience: [{
    position: String,
    company: String,
    startDate: String,
    endDate: String,
    highlights: [String]
  }],
  education: [{
    degree: String,
    institution: String,
    startDate: String,
    endDate: String
  }],
  projects: [{
    name: String,
    description: String
  }],
  pdfPath: {
    type: String,
    default: ''
  },
  docxPath: {
    type: String,
    default: ''
  },
  // Phase 9: Resume Truthfulness & ATS Quality
  isTruthful: {
    type: Boolean,
    default: true
  },
  isAtsCompliant: {
    type: Boolean,
    default: true
  },
  unsupportedClaims: [{
    type: String
  }],
  validationReport: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Ensure unique tailored resume per user + job combination
tailoredResumeSchema.index({ user: 1, job: 1 }, { unique: true });

const TailoredResume = mongoose.model('TailoredResume', tailoredResumeSchema);
module.exports = TailoredResume;
