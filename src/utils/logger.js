const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4
};

const currentLevel = (() => {
  const envLevel = process.env.LOG_LEVEL ? String(process.env.LOG_LEVEL).toUpperCase() : 'INFO';
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.INFO;
})();

// Keys whose values must never reach logs/responses (invariant C).
// Compared case-insensitively against object keys. `x-llm-endpoint` is NOT secret.
const SECRET_KEYS = new Set([
  'authorization',
  'apikey',
  'api_key',
  'x-llm-api-key',
  'password',
  'bearer',
  'token'
]);

const REDACTED = '[REDACTED]';
// Mask a raw "Bearer <token>" appearing inside a string (e.g. logged message text).
const BEARER_PATTERN = /Bearer\s+\S+/gi;

function isSecretKey(key) {
  return typeof key === 'string' && SECRET_KEYS.has(key.toLowerCase());
}

/**
 * Recursively redact secret values from objects/arrays before serialization.
 * - Object values under a secret key → '[REDACTED]'.
 * - Strings under a secret key → '[REDACTED]'.
 * - Strings elsewhere containing "Bearer <token>" → "Bearer [REDACTED]".
 * - Circular references handled via the `seen` WeakSet.
 * Returns a new structure; does not mutate the input.
 */
function redactSecrets(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return BEARER_PATTERN.test(value) ? value.replace(BEARER_PATTERN, 'Bearer [REDACTED]') : value;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Circular reference guard — return a placeholder rather than recursing forever.
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, seen));
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (isSecretKey(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = redactSecrets(val, seen);
    }
  }
  return result;
}

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0
    ? ' ' + args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(redactSecrets(arg));
      }
      if (typeof arg === 'string') {
        return redactSecrets(arg);
      }
      return arg;
    }).join(' ')
    : '';
  return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
}

const logger = {
  trace(message, ...args) {
    if (currentLevel <= LOG_LEVELS.TRACE) {
      console.trace(formatMessage('TRACE', message, ...args));
    }
  },

  debug(message, ...args) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, ...args));
    }
  },

  info(message, ...args) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, ...args));
    }
  },

  warn(message, ...args) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, ...args));
    }
  },

  error(message, ...args) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, ...args));
    }
  }
};

module.exports = logger;
