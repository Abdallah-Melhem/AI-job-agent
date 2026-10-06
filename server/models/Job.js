const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // ── Source & Deduplication ─────────────────────────────────────────
  source: {
    type: String,
    required: true,
    index: true        // e.g. 'arbeitnow', 'remoteok', 'manual'
  },
  externalId: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  importedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived', 'draft'],
    default: 'active',
    index: true
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
  country: {
    type: String,
    default: ''
  },
  experienceLevel: {
    type: String,
    enum: ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'executive', 'not-specified'],
    default: 'not-specified',
    index: true
  },
  category: {
    type: String,
    default: 'Other',
    index: true
  },
  subcategory: {
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

// Pre-save hook to synchronize url / sourceUrl and ensure importedAt
jobSchema.pre('save', function () {
  if (this.url && !this.sourceUrl) {
    this.sourceUrl = this.url;
  }
  if (this.sourceUrl && !this.url) {
    this.url = this.sourceUrl;
  }
  if (!this.importedAt) {
    this.importedAt = this.createdAt || new Date();
  }
});

// Compound unique index to prevent duplicates from the same source
jobSchema.index({ source: 1, externalId: 1 }, { unique: true });

// Text index for full-text search
jobSchema.index({ title: 'text', company: 'text', description: 'text' });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
