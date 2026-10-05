const fetch = require('node-fetch');
const AIProvider = require('./aiProvider');
const Ajv = require('ajv');

/**
 * Ollama Provider – communicates with a local Ollama server.
 * Sends a prompt and returns either raw text or parsed + validated JSON
 * when a schema is supplied.
 */
class OllamaProvider extends AIProvider {
  constructor() {
    super();
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  /**
   * Generate a response from Ollama.
   * @param {string} prompt - The user prompt.
   * @param {object} [options] - Optional { schema: object } describing expected JSON shape.
   * @returns {Promise<any>} - Parsed JSON if schema provided, otherwise raw text.
   */
  async generate(prompt, options = {}) {
    const body = {
      model: this.model,
      prompt,
      stream: false          // ← CRITICAL: return a single JSON object, not NDJSON stream
    };

    // When the caller needs structured output, tell the model to produce JSON
    if (options.schema) {
      body.format = 'json';
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: Number(process.env.OLLAMA_TIMEOUT || 10000)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = (data.response || '').trim();

    // ------------------------------------------------------------------
    // If no schema requested → return raw text
    // ------------------------------------------------------------------
    if (!options.schema) {
      return raw;
    }

    // ------------------------------------------------------------------
    // Schema requested → parse JSON and validate
    // ------------------------------------------------------------------
    let jsonStr = raw;

    // Some models wrap JSON in Markdown code fences; strip them.
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr
        .replace(/^```\s*json?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        'Ollama returned text that is not valid JSON. Raw response:\n' +
        raw.slice(0, 300)
      );
    }

    const validate = this.ajv.compile(options.schema);
    if (!validate(parsed)) {
      const errors = validate.errors
        .map(err => `${err.instancePath || '/'} ${err.message}`)
        .join('; ');
      throw new Error(`AI response validation failed: ${errors}`);
    }

    return parsed;
  }
}

module.exports = OllamaProvider;
