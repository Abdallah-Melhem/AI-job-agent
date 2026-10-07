/**
 * aiResponseRepair.js — Safe JSON Repair & Text Extraction Utility
 * Phase 7: AI Quality & Response Validation
 *
 * LLM responses frequently contain:
 *  - Markdown code fences (```json ... ```)
 *  - Conversational preambles or postambles ("Here is the requested JSON:")
 *  - Trailing commas before closing braces/brackets
 *  - Unescaped newlines inside strings
 *
 * This module extracts and safely repairs such payloads without crashing.
 */

'use strict';

/**
 * Extracts and repairs JSON string from raw LLM output, then parses it.
 *
 * @param {string} raw - The raw text from the AI model
 * @returns {any} Parsed JSON object/array
 * @throws {Error} Controlled error if string cannot be safely parsed as JSON
 */
function extractAndRepairJson(raw) {
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && raw !== null) return raw;
    throw new Error('Malformed AI response: expected text content to parse JSON.');
  }

  let text = raw.trim();

  // 1. Remove markdown code fences if present
  if (text.includes('```')) {
    // Match content between ```json and ``` or between ``` and ```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      text = fenceMatch[1].trim();
    } else {
      // Strip any standalone ```
      text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    }
  }

  // 2. Locate outermost JSON object {...} or array [...]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = text.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = text.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx + 1);
  }

  // 3. Attempt direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to repair logic
  }

  // 4. Safe repairs for common LLM syntax defects:
  let repaired = text;

  // 4a. Strip trailing commas: ,} -> } and ,] -> ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // 4b. Remove single-line comments // ...
  repaired = repaired.replace(/\/\/.*$/gm, '');

  // 4c. Fix single quotes to double quotes around property names: {'key': -> {"key":
  repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '"$1":');

  try {
    return JSON.parse(repaired);
  } catch {
    // 4d. Fix unescaped control chars (e.g. raw tabs or carriage returns inside strings)
    try {
      const sanitized = repaired
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
          if (c === '\n') return '\\n';
          if (c === '\r') return '\\r';
          if (c === '\t') return '\\t';
          return '';
        });
      return JSON.parse(sanitized);
    } catch {
      // Controlled error, never exposing full sensitive payload or crashing
      const preview = raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
      throw new Error(`AI returned malformed or unparseable JSON: ${preview}`);
    }
  }
}

module.exports = {
  extractAndRepairJson
};
