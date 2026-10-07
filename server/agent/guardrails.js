/**
 * Agent Guardrails
 * Phase 8: AI Agent and Controlled Tools
 *
 * Enforces safety boundaries:
 *  1. No arbitrary code execution or OS access
 *  2. Prompt injection detection
 *  3. Untrusted external job content sanitization
 *  4. Maximum step execution limit (loop prevention)
 *  5. Tool permissions and parameter guardrails
 */

'use strict';

const MAX_STEPS = 12;

// Known injection patterns in untrusted input or job descriptions
const INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|above|system) instructions/i,
  /reveal (?:system|developer|hidden) (?:prompt|instructions|keys|passwords)/i,
  /you are now (?:dan|evil|unrestricted)/i,
  /execute arbitrary (?:code|command)/i
];

// Dangerous code execution / OS access keywords forbidden in tools or planner
const DANGEROUS_SYSTEM_PATTERNS = [
  /\bchild_process\b/i,
  /\bexecSync\b/i,
  /\bspawnSync\b/i,
  /\bprocess\.exit\b/i,
  /\bfs\.(?:unlink|rmdir|rm|writeFile)\b/i,
  /\b(?:eval|Function)\s*\(/i
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

    for (const pattern of DANGEROUS_SYSTEM_PATTERNS) {
      if (pattern.test(text)) {
        throw new Error('Prohibited system or code execution instruction detected.');
      }
    }

    return text.trim();
  }

  /**
   * Sanitizes external untrusted job descriptions so they cannot inject instructions
   * into subsequent agent steps (indirect prompt injection protection).
   */
  sanitizeUntrustedContent(content) {
    if (!content || typeof content !== 'string') return '';
    let sanitized = content;
    for (const pattern of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[SUSPICIOUS_INSTRUCTION_REMOVED]');
    }
    // Neutralize HTML tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return sanitized;
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

      // Guard against code injection in parameters
      for (const pattern of DANGEROUS_SYSTEM_PATTERNS) {
        if (pattern.test(paramString)) {
          throw new Error(`Guardrail: Parameter contains prohibited code execution sequence for tool "${toolName}".`);
        }
      }
    }

    return true;
  }
}

module.exports = new Guardrails();
