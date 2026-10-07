const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// ── Sensitive field sanitizer ──────────────────────────────────────────────
// Strips fields that must NEVER appear in logs, conforming to Phase 21 spec.
const SENSITIVE_FIELDS = [
  'password', 'token', 'authorization', 'apiKey', 'api_key',
  'accessToken', 'refreshToken', 'secret', 'credential', 'cvContent',
  'fullText', 'rawText', 'resumeText', 'cvText', 'cvPayload', 'rawCV',
  'integrationToken', 'composioApiKey', 'jwtSecret',
  'cookie', 'mongodb_uri', 'mongo_uri', 'connectionstring', 'privatekey'
];

const sanitize = (obj, depth = 0) => {
  if (depth > 6 || typeof obj !== 'object' || obj === null) return obj;
  const cleaned = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(f => lower.includes(f.toLowerCase()))) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = typeof value === 'object' ? sanitize(value, depth + 1) : value;
    }
  }
  return cleaned;
};

// ── Custom log format for development (human-readable) ────────────────────
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(sanitize(meta)) : '';
  return `${ts} [${level.toUpperCase()}] ${message}${metaStr}`;
});

// ── Transports ─────────────────────────────────────────────────────────────
const transports = [];

// Console — always on
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      devFormat
    )
  })
);

// File — only in production or if LOG_DIR is set
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  // Error log: errors only
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5
    })
  );
  // Combined log: all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(timestamp(), json()),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10
    })
  );
}

// ── Logger instance ────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
  // Prevent winston from exiting on uncaught exceptions during tests
  exitOnError: false
});

// ── Convenience helpers ────────────────────────────────────────────────────
logger.auth = (event, meta = {}) =>
  logger.info(`[AUTH] ${event}`, sanitize(meta));

logger.api = (method, path, statusCode, ms) =>
  logger.info(`[API] ${method} ${path} ${statusCode} ${ms}ms`);

logger.agent = (taskId, event, meta = {}) =>
  logger.info(`[AGENT] task=${taskId} event="${event}"`, sanitize(meta));

logger.tool = (taskId, toolName, status, meta = {}) =>
  logger.info(`[TOOL] task=${taskId} tool=${toolName} status=${status}`, sanitize(meta));

logger.job = (event, meta = {}) =>
  logger.info(`[JOB] ${event}`, sanitize(meta));

logger.application = (userId, jobId, event, meta = {}) =>
  logger.info(`[APPLICATION] user=${userId} job=${jobId} event="${event}"`, sanitize(meta));

logger.worker = (event, meta = {}) =>
  logger.info(`[WORKER] ${event}`, sanitize(meta));

module.exports = logger;
