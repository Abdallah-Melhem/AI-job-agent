/**
 * Base Integration Provider Interface
 * Defines the contract for all external integration providers.
 */
class IntegrationProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Get authentication URL or instructions to connect
   */
  async getAuthUrl(user) {
    throw new Error('getAuthUrl() must be implemented');
  }

  /**
   * Handle OAuth callback or connection verification
   */
  async handleCallback(user, queryOrBody) {
    throw new Error('handleCallback() must be implemented');
  }

  /**
   * Execute an action via this integration provider
   */
  async executeAction(userIntegration, actionName, params) {
    throw new Error('executeAction() must be implemented');
  }
}

module.exports = IntegrationProvider;
