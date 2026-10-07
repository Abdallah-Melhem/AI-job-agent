const mongoose = require('mongoose');

/**
 * Application Workflow States:
 * Discovered → Saved → Preparing → Ready for Review → Applied → Interview → Rejected → Offer → Withdrawn
 */
const APPLICATION_STATES = [
  'discovered',
  'saved',
  'preparing',
  'ready_for_review',
  'applied',
  'interview',
  'rejected',
  'offer',
  'withdrawn'
];

/**
 * Valid state transitions map — explicit user control required for external submission
 */
const STATE_TRANSITIONS = {
  discovered:       ['saved', 'withdrawn'],
  saved:            ['preparing', 'withdrawn'],
  preparing:        ['ready_for_review', 'saved', 'withdrawn'],
  ready_for_review: ['applied', 'preparing', 'withdrawn'],
  applied:          ['interview', 'rejected', 'offer', 'withdrawn'],
  interview:        ['offer', 'rejected', 'withdrawn'],
  rejected:         ['withdrawn'],
  offer:            ['withdrawn'],
  withdrawn:        []
};

const logEntrySchema = new mongoose.Schema({
  timestamp:  { type: Date, default: Date.now },
  message:    { type: String, required: true },
  level:      { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  fromStatus: { type: String },
  toStatus:   { type: String }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },

  // --- Status tracking ---
  status: {
    type: String,
    enum: APPLICATION_STATES,
    default: 'discovered'
  },

  // --- Linking ---
  tailoredResume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TailoredResume',
    default: null
  },

  // --- Application metadata ---
  source: {
    type: String,        // e.g. 'linkedin', 'company-site', 'referral', 'job-board'
    default: null
  },
  applicationUrl: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },

  // --- Dates ---
  savedAt:          { type: Date, default: null },
  preparingAt:      { type: Date, default: null },
  readyForReviewAt: { type: Date, default: null },
  appliedAt:        { type: Date, default: null },
  interviewAt:      { type: Date, default: null },
  rejectedAt:       { type: Date, default: null },
  offerAt:          { type: Date, default: null },
  withdrawnAt:      { type: Date, default: null },

  // --- Preparation data (from fill workflow) ---
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // --- Audit log ---
  logs: [logEntrySchema],

  // --- Legacy fields kept for backward compat ---
  adapterName: { type: String, default: null },
  externalId:  { type: String, default: null }

}, { timestamps: true });

applicationSchema.index({ user: 1, job: 1 }, { unique: true });
applicationSchema.index({ user: 1, status: 1 });

/**
 * Instance method: transition to a new status with validation
 * Returns { ok, error } — does NOT save automatically
 */
applicationSchema.methods.transitionTo = function (newStatus, message) {
  const current = this.status;
  const allowed = STATE_TRANSITIONS[current] || [];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition from '${current}' to '${newStatus}'` };
  }

  const now = new Date();
  const dateField = `${newStatus.replace(/_/g, '')}At`;
  // Map status to date field names
  const dateFieldMap = {
    discovered:       'discoveredAt',
    saved:            'savedAt',
    preparing:        'preparingAt',
    ready_for_review: 'readyForReviewAt',
    applied:          'appliedAt',
    interview:        'interviewAt',
    rejected:         'rejectedAt',
    offer:            'offerAt',
    withdrawn:        'withdrawnAt'
  };
  const field = dateFieldMap[newStatus];
  if (field && !this[field]) this[field] = now;

  this.logs.push({
    timestamp: now,
    message: message || `Status changed from ${current} to ${newStatus}`,
    level: 'info',
    fromStatus: current,
    toStatus: newStatus
  });
  this.status = newStatus;
  return { ok: true };
};

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
module.exports.APPLICATION_STATES = APPLICATION_STATES;
module.exports.STATE_TRANSITIONS = STATE_TRANSITIONS;
