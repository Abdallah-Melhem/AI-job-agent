/**
 * AI Provider Interface
 * Phase 7: AI Quality & Response Validation
 *
 * Base abstract class defining the contract for AI providers (Ollama, Gemini, Mock, etc.).
 * Allows swapping AI models and providers without modifying business logic.
 */

'use strict';

class AIProvider {
  constructor(name = 'generic') {
    this.name = name;
  }

  /**
   * Provider identifier name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Health / availability check
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return true;
  }

  /**
   * Generate completion from AI provider
   * @param {string} prompt - Prompt or instruction string
   * @param {object} [options] - Options (e.g. { schema, timeout, systemInstruction })
   * @returns {Promise<any>} Raw text or parsed JSON
   */
  async generate(prompt, options = {}) { // eslint-disable-line no-unused-vars
    throw new Error(`generate() not implemented for provider "${this.name}". Subclass must override.`);
  }
}

module.exports = AIProvider;
