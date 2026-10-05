const UserIntegration = require('../models/UserIntegration');
const integrationRegistry = require('../integrations/integrationRegistry');

const getIntegrations = async (userId) => {
  return UserIntegration.find({ user: userId }).select('-accessToken -refreshToken');
};

const getAuthUrl = async (userId, providerName) => {
  const provider = integrationRegistry.get(providerName);
  if (!provider) throw new Error(`Provider ${providerName} not found`);

  return provider.getAuthUrl({ _id: userId });
};

const connectIntegration = async (userId, providerName, queryOrBody) => {
  const provider = integrationRegistry.get(providerName);
  if (!provider) throw new Error(`Provider ${providerName} not found`);

  const connectionDetails = await provider.handleCallback({ _id: userId }, queryOrBody);

  let integration = await UserIntegration.findOne({ user: userId, provider: providerName });
  
  if (integration) {
    integration.accountId = connectionDetails.accountId;
    integration.accessToken = connectionDetails.accessToken;
    integration.refreshToken = connectionDetails.refreshToken;
    integration.metadata = connectionDetails.metadata;
    integration.status = 'active';
  } else {
    integration = new UserIntegration({
      user: userId,
      provider: providerName,
      ...connectionDetails,
      status: 'active'
    });
  }

  await integration.save();
  const safeIntegration = integration.toObject();
  delete safeIntegration.accessToken;
  delete safeIntegration.refreshToken;
  return safeIntegration;
};

const disconnectIntegration = async (userId, providerName) => {
  const integration = await UserIntegration.findOne({ user: userId, provider: providerName });
  if (!integration) throw new Error(`Integration ${providerName} not found`);

  integration.status = 'disconnected';
  integration.accessToken = null;
  integration.refreshToken = null;
  await integration.save();
  return integration;
};

const executeAction = async (userId, providerName, actionName, params) => {
  const integration = await UserIntegration.findOne({ user: userId, provider: providerName });
  if (!integration || integration.status !== 'active') {
    throw new Error(`Active integration for ${providerName} not found`);
  }

  const provider = integrationRegistry.get(providerName);
  if (!provider) throw new Error(`Provider ${providerName} not found`);

  return provider.executeAction(integration, actionName, params);
};

module.exports = {
  getIntegrations,
  getAuthUrl,
  connectIntegration,
  disconnectIntegration,
  executeAction
};
