/**
 * aiController.js — Private AI API Controller
 * Phase 7: AI Quality & Response Validation
 */

'use strict';

const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const guardrails = require('../agent/guardrails');

/**
 * @desc    Generate AI response (raw or validated JSON)
 * @route   POST /api/ai/generate
 * @access  Private (requires authentication)
 */
async function generateAI(req, res) {
  try {
    const { prompt, schema } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Apply guardrails
    let sanitized;
    try {
      sanitized = guardrails.sanitizeInput(prompt);
    } catch (guardErr) {
      return res.status(400).json({ message: guardErr.message });
    }

    const result = await aiService.generate(sanitized, schema);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[AI] Generation error: ${aiService.sanitizeError(error)}`);
    // Safe response: Never leak internal endpoint URLs or credentials
    res.status(500).json({ 
      message: 'AI generation service is currently unavailable or returned invalid output. Please try again later.' 
    });
  }
}

module.exports = { generateAI };
