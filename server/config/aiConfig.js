/**
 * aiConfig.js — Centralized AI Provider and Service Configuration
 * Phase 7: AI Quality & Response Validation
 */

'use strict';

const aiConfig = {
  // Provider selection: 'ollama' | 'gemini' | 'mock'
  provider: (process.env.AI_PROVIDER || 'ollama').toLowerCase(),

  // Global operational limits
  timeoutMs: Number(process.env.AI_TIMEOUT_MS || 15000),
  maxRetries: Number(process.env.AI_MAX_RETRIES || 2),
  retryDelayMs: Number(process.env.AI_RETRY_DELAY_MS || 500),
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS || 16000),

  // Ollama configuration
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 15000)
  },

  // Gemini configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 15000)
  },

  // Mock provider configuration (for tests & offline environments)
  mock: {
    enabled: process.env.AI_MOCK_ENABLED === 'true' || process.env.NODE_ENV === 'test'
  }
};

module.exports = aiConfig;
