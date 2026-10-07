const { URL } = require('url');
const path = require('path');

/**
 * Validates URLs to prevent SSRF (Server-Side Request Forgery).
 * Rejects localhost, 127.0.0.1, internal IPs, and non-HTTP(S) protocols.
 * 
 * @param {string} urlString - URL to validate
 * @returns {boolean} - true if valid and safe, false otherwise
 */
const isSafeUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname;

    // Block local / private networks
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.match(/^127\.\d+\.\d+\.\d+$/) ||
      hostname.match(/^10\.\d+\.\d+\.\d+$/) ||
      hostname.match(/^192\.168\.\d+\.\d+$/) ||
      hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/) ||
      hostname === '::1'
    ) {
      if (process.env.NODE_ENV !== 'development') {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Validates file path to prevent directory traversal attacks (LFI/path traversal).
 * Ensures resolved path remains strictly within the intended base directory.
 * 
 * @param {string} baseDir - Allowed base directory (must be absolute)
 * @param {string} targetPath - Relative or untrusted filename/path
 * @returns {string|null} - Canonical absolute path if safe, or null if traversal detected
 */
const sanitizeFilePath = (baseDir, targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') return null;

  // Reject explicit traversal attempts
  if (targetPath.includes('..') || targetPath.includes('\0')) {
    return null;
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, targetPath);

  // Must start with the base directory
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    return null;
  }

  return resolvedTarget;
};

/**
 * Sanitizes external untrusted job descriptions so they are treated as pure data,
 * not executable instructions or prompt injection vectors.
 * 
 * @param {string} text - Raw external job text
 * @returns {string} - Sanitized text safe for prompts and storage
 */
const sanitizeExternalData = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Strip script tags and HTML event handlers
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // 2. Neutralize instruction override keywords that attempt to subvert AI agents
  const PROMPT_OVERRIDE_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above|system)\s+instructions/gi,
    /reveal\s+(system|developer|hidden)\s+(prompt|instructions|keys|passwords)/gi,
    /you\s+are\s+now\s+(dan|evil|unrestricted)/gi,
    /execute\s+arbitrary\s+(code|command)/gi,
    /disregard\s+(prior|previous)\s+directives/gi
  ];

  for (const pattern of PROMPT_OVERRIDE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[EXTERNAL_DATA_OVERRIDE_FLAGGED]');
  }

  return cleaned.trim();
};

module.exports = {
  isSafeUrl,
  sanitizeFilePath,
  sanitizeExternalData
};
