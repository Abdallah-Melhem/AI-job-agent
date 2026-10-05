const aiService = require('../services/aiService');
const logger = require('../utils/logger');

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
    const result = await aiService.generate(prompt, schema);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[AI] generation error: ${error.message}`);
    res.status(500).json({ message: error.message || 'AI generation failed' });
  }
}

module.exports = { generateAI };
