const mongoose = require('mongoose');

const userIntegrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String, // e.g., 'composio', 'google', 'github'
    required: true
  },
  accountId: {
    type: String, // External account ID or entity ID
  },
  accessToken: {
    type: String
  },
  refreshToken: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'error', 'disconnected'],
    default: 'active'
  }
}, { timestamps: true });

// A user should only have one active integration per provider, or multiple?
// Usually one per provider, but we'll index user + provider.
userIntegrationSchema.index({ user: 1, provider: 1 });

const UserIntegration = mongoose.model('UserIntegration', userIntegrationSchema);
module.exports = UserIntegration;
