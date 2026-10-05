const IntegrationProvider = require('./IntegrationProvider');
const logger = require('../../utils/logger');

let ComposioSDK = null;
let composioClient = null;

/**
 * Lazily initialise the Composio SDK so the server starts even when the key
 * is not yet present, and logs a clear message if it is missing.
 */
function getClient() {
  if (composioClient) return composioClient;

  if (!process.env.COMPOSIO_API_KEY) {
    throw new Error(
      'COMPOSIO_API_KEY is not set. Add it to your .env file and restart the server.'
    );
  }

  try {
    if (!ComposioSDK) {
      const { Composio } = require('@composio/core');
      ComposioSDK = Composio;
    }
    composioClient = new ComposioSDK({ apiKey: process.env.COMPOSIO_API_KEY });
    logger.info('[Composio] SDK client initialised');
  } catch (err) {
    throw new Error(`Failed to initialise Composio SDK: ${err.message}`);
  }

  return composioClient;
}

class ComposioProvider extends IntegrationProvider {
  constructor() {
    super('composio');
  }

  /**
   * Returns a Composio Connect Link for the given user and toolkit.
   * e.g. GET /api/integrations/composio/auth?toolkit=github
   */
  async getAuthUrl(user, options = {}) {
    const client = getClient();
    const toolkit = options.toolkit || 'github';
    const userId = String(user._id);

    logger.info(`[Composio] Creating session + connect link for user=${userId} toolkit=${toolkit}`);

    const session = await client.create(userId);

    const result = await session.execute('COMPOSIO_MANAGE_CONNECTIONS', {
      toolkits: [toolkit]
    });

    const connInfo = result?.data?.results?.[toolkit];
    const redirectUrl = connInfo?.redirect_url || 'https://dashboard.composio.dev';

    return {
      url: redirectUrl,
      sessionId: session.sessionId,
      toolkit,
      status: connInfo?.status || 'initiated',
      instructions: `Open the link to connect your ${toolkit} account to Composio. Once authorized, confirm connection.`
    };
  }

  /**
   * After the user completes OAuth or requests connection verification.
   * Body: { sessionId, toolkit }
   */
  async handleCallback(user, body = {}) {
    const { sessionId, toolkit = 'github' } = body;
    const client = getClient();
    const userId = String(user._id);

    logger.info(`[Composio] Verifying connection for user=${userId} toolkit=${toolkit}`);

    let session;
    if (sessionId) {
      try {
        session = await client.use(sessionId);
      } catch (err) {
        session = await client.create(userId);
      }
    } else {
      session = await client.create(userId);
    }

    // Verify connection status with Composio
    const check = await session.execute('COMPOSIO_MANAGE_CONNECTIONS', {
      toolkits: [toolkit]
    });

    const connInfo = check?.data?.results?.[toolkit];
    const isConnected = connInfo?.status === 'active';

    return {
      accountId: session.sessionId,
      accessToken: null,
      metadata: {
        toolkit,
        status: connInfo?.status || 'unknown',
        connectedAt: new Date().toISOString(),
        details: connInfo
      }
    };
  }

  /**
   * Execute a real Composio tool call on behalf of the user.
   *
   * @param {object} userIntegration  – UserIntegration document from MongoDB
   * @param {string} toolName         – e.g. "COMPOSIO_SEARCH_TOOLS", "GITHUB_STAR_A_REPOSITORY"
   * @param {object} params           – tool input params
   */
  async executeAction(userIntegration, toolName, params = {}) {
    const client = getClient();
    const userId = String(userIntegration.user);
    const sessionId = userIntegration.accountId;

    logger.info(`[Composio] Executing tool=${toolName} user=${userId} session=${sessionId}`);

    let session;
    try {
      if (sessionId) {
        session = await client.use(sessionId);
      } else {
        session = await client.create(userId);
      }
    } catch (err) {
      session = await client.create(userId);
    }

    const result = await session.execute(toolName, params);
    logger.info(`[Composio] Tool=${toolName} executed successfully logId=${result?.logId}`);

    return {
      success: !result?.error,
      action: toolName,
      logId: result?.logId,
      data: result?.data || result
    };
  }

  /**
   * Directly search or list available tools for a user session
   */
  async searchTools(userId, query = 'github') {
    const client = getClient();
    const session = await client.create(String(userId));
    return session.execute('COMPOSIO_SEARCH_TOOLS', { query });
  }
}

module.exports = new ComposioProvider();
