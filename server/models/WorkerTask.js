const mongoose = require('mongoose');

const workerTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'job_discovery',
      'job_sync',
      'cv_parse',
      'ai_match',
      'resume_generation',
      'application_prep',
      'application_status_check'
    ]
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

const WorkerTask = mongoose.model('WorkerTask', workerTaskSchema);
module.exports = WorkerTask;
