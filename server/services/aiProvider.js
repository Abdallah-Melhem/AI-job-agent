/**
 * AI Provider Interface
 * All providers must implement a `generate` method that accepts a prompt string
 * and an optional options object (e.g. { schema: {...} }).
 *
 * This abstraction allows swapping providers (Ollama, OpenAI, etc.) without
 * changing the rest of the application.
 */
class AIProvider {
  /**
   * @param {string} prompt - The user prompt or system instruction.
   * @param {object} [options] - Optional configuration, e.g. { schema: {...} }
   * @returns {Promise<any>} - The provider's response (raw text or parsed object).
   */
  async generate(prompt, options) {
    throw new Error('generate() not implemented – subclass must override');
  }
}

module.exports = AIProvider;
