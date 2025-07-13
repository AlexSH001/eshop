const metrics = require('../services/metrics');

const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to record metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    metrics.recordRequestMetrics(req, res, duration);

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = performanceMiddleware; 