require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Monitoring and observability imports
const logger = require('./config/logger');
const { initSentry } = require('./config/sentry');
const { requestLogger, errorLogger, addRequestId } = require('./middleware/logging');
const performanceMiddleware = require('./middleware/performance');

const securityValidation = require('./middleware/securityValidation');
const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateRequest
} = require('./middleware/security');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const uploadRoutes = require('./routes/upload');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const monitoringRoutes = require('./routes/monitoring');

const { errorHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for correct protocol/header handling behind reverse proxies
app.set('trust proxy', 1);

// Initialize Sentry for error tracking
initSentry(app);

// Security validation middleware
app.use(securityValidation);

// Apply security middleware
app.use(securityHeaders);
app.use(validateRequest);

// CORS configuration for development and production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      // Development origins
      'http://frontend:3000',
      'http://127.0.0.1:3000',
      'http://0.0.0.0:3000',
      'http://frontend:3000'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production' && 
        (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0'))) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Initialize database (automatically selects SQLite or PostgreSQL based on DB_CLIENT)
initializeDatabase().catch(console.error);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// HTTPS redirect for production (skip internal health/metrics and allow proxy header)
if (process.env.NODE_ENV === 'production' && String(process.env.HTTPS_ONLY).toLowerCase() === 'true') {
  app.use((req, res, next) => {
    const isHealth = req.path.startsWith('/api/monitoring/');
    const isHttps = req.secure || req.header('x-forwarded-proto') === 'https';
    if (!isHealth && !isHttps) {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);

// Monitoring and observability middleware
app.use(requestLogger);
app.use(addRequestId);
app.use(performanceMiddleware);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images) with strong caching
// ETag/Last-Modified are enabled by default in Express static
app.use('/uploads', express.static('uploads', {
  maxAge: '365d', // leverage immutable file naming (UUID + timestamp)
  immutable: true,
  setHeaders: (res) => {
    // Ensure public caching; browsers/CDNs can cache aggressively
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Monitoring routes
app.use('/api/monitoring', monitoringRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorLogger);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 API docs available at http://0.0.0.0:${PORT}/api/monitoring/health`);
  logger.info(`📊 Metrics available at http://0.0.0.0:${PORT}/api/monitoring/metrics`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

