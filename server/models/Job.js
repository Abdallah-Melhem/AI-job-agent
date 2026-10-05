const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // ── Source & Deduplication ─────────────────────────────────────────
  source: {
    type: String,
    required: true,
    index: true        // e.g. 'mock', 'linkedin', 'indeed', 'remoteok'
  },
  externalId: {
    type: String,
    required: true
  },

  // ── Core Fields (normalised) ──────────────────────────────────────
  title: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'other'],
    default: 'full-time'
  },
  remote: {
    type: String,
    enum: ['remote', 'hybrid', 'onsite', 'unknown'],
    default: 'unknown'
  },
  description: {
    type: String,
    default: ''
  },
  requirements: [{
    type: String
  }],
  skills: [{
    type: String
  }],
  salary: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' },
    period: { type: String, enum: ['hourly', 'monthly', 'yearly', ''], default: '' }
  },
  url: {
    type: String,
    default: ''
  },
  postedAt: {
    type: Date
  },

  // ── User-specific ────────────────────────────────────────────────
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ── Raw data preserved for debugging / re-normalisation ──────────
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicates from the same source
jobSchema.index({ source: 1, externalId: 1 }, { unique: true });

// Text index for full-text search
jobSchema.index({ title: 'text', company: 'text', description: 'text' });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
