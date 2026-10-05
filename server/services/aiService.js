const OllamaProvider = require('../services/ollamaProvider');

// Currently only OllamaProvider is supported. Future providers can be added here.
class AIService {
  constructor() {
    this.provider = new OllamaProvider();
  }

  /**
   * Generate a response from the configured AI provider.
   * @param {string} prompt - The prompt to send.
   * @param {object} [schema] - Optional JSON schema for structured output validation.
   * @returns {Promise<any>} - The AI's response (raw text or validated JSON).
   */
  async generate(prompt, schema) {
    const options = {};
    if (schema) options.schema = schema;
    return await this.provider.generate(prompt, options);
  }
}

module.exports = new AIService();
