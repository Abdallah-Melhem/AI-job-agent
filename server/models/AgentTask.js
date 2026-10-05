const mongoose = require('mongoose');

const agentTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  goal: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'planning', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  plan: [{
    step: Number,
    action: String,
    tool: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending'
    },
    resultSummary: String
  }],
  currentStep: {
    type: Number,
    default: 0
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, default: 'info' },
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],
  results: {
    matchedJobs: [{
      jobId: String,
      title: String,
      company: String,
      score: Number,
      tailoredResumeId: String,
      pdfPath: String,
      docxPath: String
    }],
    summary: String
  },
  error: {
    type: String,
    default: null
  }
}, { timestamps: true });

const AgentTask = mongoose.model('AgentTask', agentTaskSchema);
module.exports = AgentTask;
