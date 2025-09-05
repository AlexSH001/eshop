const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limiting
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

// Auth rate limiting (stricter in production, more lenient in development)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 5 : 50, // 5 in production, 50 in development
  'Too many authentication attempts, please try again later.'
);

// Upload rate limiting
const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  'Upload limit exceeded, please try again later.'
);

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add request ID for tracking
  req.requestId = req.headers['x-request-id'] || 
                  req.headers['x-correlation-id'] || 
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];
  
  const requestBody = JSON.stringify(req.body);
  const requestQuery = JSON.stringify(req.query);
  const requestParams = JSON.stringify(req.params);
  
  const allRequestData = `${requestBody} ${requestQuery} ${requestParams}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allRequestData)) {
      return res.status(400).json({
        error: 'Invalid request content detected'
      });
    }
  }
  
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateRequest
}; 