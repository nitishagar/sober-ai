const logger = require('../../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error:', err);

  // Default error response
  const response = {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Determine status code
  let statusCode = 500;

  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.name === 'TimeoutError') {
    statusCode = 504;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
