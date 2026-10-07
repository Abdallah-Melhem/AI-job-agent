/**
 * GeminiProvider.js — Google Gemini REST API Provider
 * Phase 7: AI Quality & Response Validation
 *
 * Implements the AIProvider contract using the Google Gemini REST API.
 * Supports structured outputs via responseMimeType: 'application/json'
 * and responseSchema if supported, with automatic fallbacks.
 */

'use strict';

const fetch = require('node-fetch');
const AIProvider = require('../aiProvider');
const aiConfig = require('../../config/aiConfig');

class GeminiProvider extends AIProvider {
  constructor(customConfig = {}) {
    super('gemini');
    this.apiKey = customConfig.apiKey || aiConfig.gemini.apiKey;
    this.model = customConfig.model || aiConfig.gemini.model;
    this.baseUrl = customConfig.baseUrl || aiConfig.gemini.baseUrl;
    this.timeoutMs = customConfig.timeoutMs || aiConfig.gemini.timeoutMs;
  }

  /**
   * Checks if Gemini API key is configured
   */
  async isAvailable() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Generates content using the Gemini REST API
   *
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async generate(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable.');
    }

    const modelName = options.model || this.model;
    const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

    const generationConfig = {};
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }

    if (options.schema) {
      generationConfig.responseMimeType = 'application/json';
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig
    };

    if (options.systemInstruction) {
      payload.systemInstruction = {
        role: 'system',
        parts: [{ text: options.systemInstruction }]
      };
    }

    const timeout = options.timeoutMs || this.timeoutMs;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      // Sanitize any key leaking from URL or response body
      const sanitizedMsg = errText.replace(this.apiKey, '[REDACTED_API_KEY]');
      throw new Error(`Gemini request failed with HTTP ${response.status}: ${sanitizedMsg.slice(0, 200)}`);
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];

    if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      if (candidate && candidate.finishReason === 'SAFETY') {
        throw new Error('Gemini generation was blocked by safety filters.');
      }
      throw new Error('Gemini returned an empty response.');
    }

    return (candidate.content.parts[0].text || '').trim();
  }
}

module.exports = GeminiProvider;
