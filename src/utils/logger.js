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

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0
    ? ' ' + args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ')
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
