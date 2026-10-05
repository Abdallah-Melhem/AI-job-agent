const { URL } = require('url');

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
      // In development, you might want to bypass this for tests.
      // But strictly speaking, SSRF protections should apply.
      // Assuming this is only for EXTERNAL fetches.
      if (process.env.NODE_ENV !== 'development') {
        return false;
      }
    }

    return true;
  } catch (err) {
    // If it can't be parsed, it's not safe
    return false;
  }
};

module.exports = { isSafeUrl };
