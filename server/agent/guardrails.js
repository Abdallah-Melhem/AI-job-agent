/**
 * Agent Guardrails
 * Enforces safety boundaries, loop prevention, and prompt injection detection.
 */

const MAX_STEPS = 12;

// Known injection patterns in untrusted input or job descriptions
const INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|above|system) instructions/i,
  /reveal (?:system|developer|hidden) (?:prompt|instructions|keys|passwords)/i,
  /you are now (?:dan|evil|unrestricted)/i,
  /execute arbitrary (?:code|command)/i
];

class Guardrails {
  /**
   * Checks if user prompt or untrusted job data contains prompt injection attempts.
   */
  sanitizeInput(text) {
    if (!text || typeof text !== 'string') return text;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        throw new Error('Potential prompt injection or instruction override detected.');
      }
    }
    return text.trim();
  }

  /**
   * Enforces loop prevention
   */
  checkStepLimit(stepNumber) {
    if (stepNumber > MAX_STEPS) {
      throw new Error(`Execution halted: maximum allowable agent steps (${MAX_STEPS}) exceeded.`);
    }
  }

  /**
   * Validates tool parameters before dispatch
   */
  validateToolCall(toolName, params, context) {
    if (!context.user || !context.user._id) {
      throw new Error('Guardrail: Operation prohibited without an authenticated user context.');
    }

    if (params && typeof params === 'object') {
      // Guard against prototype pollution via JSON parse exploits
      const paramString = JSON.stringify(params);
      if (paramString && (paramString.includes('"__proto__"') || paramString.includes('"constructor"'))) {
        throw new Error('Guardrail: Suspicious parameter payload rejected.');
      }
    }

    return true;
  }
}

module.exports = new Guardrails();
