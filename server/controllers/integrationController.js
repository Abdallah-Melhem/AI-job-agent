const integrationService = require('../services/integrationService');
const integrationRegistry = require('../integrations/integrationRegistry');

exports.listProviders = (req, res) => {
  res.json({ providers: integrationRegistry.listProviders() });
};

exports.getIntegrations = async (req, res) => {
  try {
    const integrations = await integrationService.getIntegrations(req.user._id);
    res.json(integrations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAuthUrl = async (req, res) => {
  try {
    const data = await integrationService.getAuthUrl(req.user._id, req.params.provider);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.connect = async (req, res) => {
  try {
    const integration = await integrationService.connectIntegration(req.user._id, req.params.provider, req.body);
    res.json(integration);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const integration = await integrationService.disconnectIntegration(req.user._id, req.params.provider);
    res.json(integration);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.execute = async (req, res) => {
  try {
    const { action, params } = req.body;
    const result = await integrationService.executeAction(req.user._id, req.params.provider, action, params);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
