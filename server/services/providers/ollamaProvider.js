/**
 * OllamaProvider.js — Local Ollama LLM Provider
 * Phase 7: AI Quality & Response Validation
 */

'use strict';

const fetch = require('node-fetch');
const AIProvider = require('../aiProvider');
const aiConfig = require('../../config/aiConfig');

class OllamaProvider extends AIProvider {
  constructor(customConfig = {}) {
    super('ollama');
    this.baseUrl = customConfig.baseUrl || aiConfig.ollama.baseUrl;
    this.model = customConfig.model || aiConfig.ollama.model;
    this.timeoutMs = customConfig.timeoutMs || aiConfig.ollama.timeoutMs;
  }

  /**
   * Checks if Ollama server is responding
   */
  async isAvailable() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 3000
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generates completion from Ollama
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>} Raw text or JSON string from Ollama
   */
  async generate(prompt, options = {}) {
    const body = {
      model: options.model || this.model,
      prompt,
      stream: false
    };

    if (options.schema) {
      body.format = 'json';
    }

    const timeout = options.timeoutMs || this.timeoutMs;
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ollama request failed with HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    return (data.response || '').trim();
  }
}

module.exports = OllamaProvider;
