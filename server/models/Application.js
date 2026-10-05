const mongoose = require('mongoose');

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
  adapterName: {
    type: String,
    required: true
  },
  externalId: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'prepared', 'filling', 'ready_to_submit', 'submitted', 'failed', 'unknown'],
    default: 'draft'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    level: { type: String, default: 'info' }
  }],
  appliedAt: Date
}, { timestamps: true });

applicationSchema.index({ user: 1, job: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
