const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] || uuidv4();
  
  // Log request
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous',
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method !== 'GET' && Object.keys(req.body).length > 0 ? req.body : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info(`Response ${res.statusCode} for ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous',
      contentLength: res.get('Content-Length') || 'unknown'
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous',
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
    }
  });

  next(err);
};

// Middleware to add request ID to response headers
const addRequestId = (req, res, next) => {
  if (req.requestId) {
    res.setHeader('X-Request-ID', req.requestId);
  }
  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  addRequestId
}; 