/**
 * aiService.js — Centralized AI Service Orchestrator
 * Phase 7: AI Quality & Response Validation
 *
 * Coordinates:
 *  - Provider abstraction (Ollama, Gemini, Mock)
 *  - Automated retries with backoff
 *  - Safe JSON extraction & repair (handles markdown code fences & preambles)
 *  - Schema validation with Ajv
 *  - Input sanitization & token budgeting
 *  - Masking of private AI infrastructure & credentials
 */

'use strict';

const Ajv = require('ajv');
const aiConfig = require('../config/aiConfig');
const logger = require('../utils/logger');
const guardrails = require('../agent/guardrails');
const { extractAndRepairJson } = require('./aiResponseRepair');
const { buildTaskPrompt, truncateText, validateCandidateTruthfulness } = require('./promptTemplates');

// Providers
const OllamaProvider = require('./providers/ollamaProvider');
const GeminiProvider = require('./providers/geminiProvider');
const MockProvider = require('./providers/mockProvider');

class AIService {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.providers = new Map();
    this.activeProviderName = aiConfig.provider;

    // Register built-in providers
    this.registerProvider('ollama', new OllamaProvider());
    this.registerProvider('gemini', new GeminiProvider());
    this.registerProvider('mock', new MockProvider());

    // Initialize active provider
    this.initProvider();
  }

  /**
   * Registers a provider instance
   */
  registerProvider(name, instance) {
    this.providers.set(name.toLowerCase(), instance);
  }

  /**
   * Selects active provider based on config or falls back safely
   */
  initProvider() {
    const configured = (aiConfig.provider || 'ollama').toLowerCase();
    if (this.providers.has(configured)) {
      this.activeProvider = this.providers.get(configured);
      this.activeProviderName = configured;
    } else {
      logger.warn(`[AI] Unknown provider "${configured}". Defaulting to "ollama".`);
      this.activeProvider = this.providers.get('ollama');
      this.activeProviderName = 'ollama';
    }
  }

  /**
   * Set active provider dynamically (useful for tests or runtime switching)
   */
  setProvider(providerOrName) {
    if (typeof providerOrName === 'string') {
      const name = providerOrName.toLowerCase();
      if (!this.providers.has(name)) {
        throw new Error(`Provider "${providerOrName}" is not registered.`);
      }
      this.activeProvider = this.providers.get(name);
      this.activeProviderName = name;
    } else if (providerOrName && typeof providerOrName.generate === 'function') {
      const name = providerOrName.getName ? providerOrName.getName() : 'custom';
      this.registerProvider(name, providerOrName);
      this.activeProvider = providerOrName;
      this.activeProviderName = name;
    } else {
      throw new Error('Invalid provider specified.');
    }
  }

  /**
   * Get active provider name
   */
  getProviderName() {
    return this.activeProviderName;
  }

  /**
   * Check if current provider is available
   */
  async isAvailable() {
    try {
      return await this.activeProvider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Mask private infrastructure, keys, and internal endpoints in error messages.
   * Ensures private AI infrastructure is not exposed to callers or frontend.
   */
  sanitizeError(err) {
    let msg = (err && err.message) || 'Unknown AI error';
    // Mask potential API keys
    msg = msg.replace(/[a-zA-Z0-9_-]{24,}/g, (match) => {
      // If it looks like a long hex/alphanumeric key, mask it
      if (match.length >= 32) return '[REDACTED_SECRET]';
      return match;
    });
    // Mask private IPs / localhost ports
    msg = msg.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, '[LOCAL_AI_HOST]');
    msg = msg.replace(/https?:\/\/[^\s/$.?#].[^\s]*/gi, '[AI_ENDPOINT]');
    return msg;
  }

  /**
   * Sleep helper for backoff
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Core generation method with retry, repair, validation, and security guardrails.
   * Backward-compatible with generate(prompt, schema).
   *
   * @param {string} prompt - Prompt or instruction
   * @param {object|undefined} schemaOrOptions - JSON schema object or options object
   * @returns {Promise<any>}
   */
  async generate(prompt, schemaOrOptions = {}) {
    // Normalize options for backward compatibility:
    // If schemaOrOptions has a 'type' property (JSON schema), wrap it as { schema: schemaOrOptions }
    let options = {};
    if (schemaOrOptions && schemaOrOptions.type) {
      options = { schema: schemaOrOptions };
    } else if (typeof schemaOrOptions === 'object') {
      options = { ...schemaOrOptions };
    }

    // 1. Guardrails: sanitize prompt for injection
    const sanitizedPrompt = guardrails.sanitizeInput(prompt);

    // 2. Budget / truncate input if overly large
    const truncatedPrompt = truncateText(sanitizedPrompt, aiConfig.maxInputChars);

    const maxRetries = options.maxRetries ?? aiConfig.maxRetries;
    const retryDelay = options.retryDelayMs ?? aiConfig.retryDelayMs;

    let lastError = null;

    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[AI] Retrying generation (attempt ${attempt}/${maxRetries})...`);
          await this.sleep(retryDelay * Math.pow(2, attempt - 1));
        }

        // Call active provider
        const rawResponse = await this.activeProvider.generate(truncatedPrompt, options);

        // If no schema requested, return raw text directly
        if (!options.schema) {
          return typeof rawResponse === 'string' ? rawResponse.trim() : rawResponse;
        }

        // Schema requested: repair and parse JSON
        const parsedJson = extractAndRepairJson(rawResponse);

        // Validate with Ajv
        const validate = this.ajv.compile(options.schema);
        const valid = validate(parsedJson);

        if (!valid) {
          const schemaErrors = (validate.errors || [])
            .map(err => `${err.instancePath || '/'} ${err.message}`)
            .join('; ');
          throw new Error(`AI response validation failed: ${schemaErrors}`);
        }

        // Validated successfully
        return parsedJson;

      } catch (err) {
        lastError = err;
        logger.warn(`[AI] Attempt ${attempt} failed: ${this.sanitizeError(err)}`);

        // If error is prompt injection rejection from guardrails, do not retry
        if (err.message && err.message.includes('prompt injection')) {
          throw err;
        }
      }
    }

    // If all retries exhausted, throw sanitized controlled error
    const cleanMessage = this.sanitizeError(lastError);
    throw new Error(`AI generation service error: ${cleanMessage}`);
  }

  /**
   * High-level task generator with prompt templates and optional anti-hallucination validation.
   *
   * @param {string} taskType - One of TASK_TYPES
   * @param {object} payload - Task inputs
   * @param {object} [options] - Options (schema, candidateProfile for truthfulness validation, etc.)
   */
  async generateTask(taskType, payload = {}, options = {}) {
    const { prompt, systemInstruction } = buildTaskPrompt(taskType, payload);
    const mergedOptions = {
      ...options,
      systemInstruction
    };

    const result = await this.generate(prompt, mergedOptions);

    // If profile was provided, check anti-hallucination
    if (options.candidateProfile && typeof result === 'object') {
      const truthCheck = validateCandidateTruthfulness(result, options.candidateProfile);
      if (!truthCheck.valid) {
        logger.warn(`[AI] Anti-hallucination warnings for task ${taskType}: ${truthCheck.warnings.join(', ')}`);
      }
    }

    return result;
  }
}

module.exports = new AIService();
