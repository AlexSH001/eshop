# HTTPS and Security Headers Migration Plan

## Overview
Implement HTTPS enforcement and comprehensive security headers for production deployment.

## Current Issues
- No HTTPS enforcement
- Basic security headers only
- No Content Security Policy
- No HSTS implementation
- CORS configuration not production-ready

## Migration Steps

### Step 1: Update Express Security Configuration
File: `backend/src/index.js`

**Before:**
```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

**After:**
```javascript
// Enhanced security headers
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

// HTTPS redirect for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### Step 2: Update CORS Configuration
File: `backend/src/index.js`

**Before:**
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

**After:**
```javascript
// Production CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://yourdomain.com',
      'https://www.yourdomain.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
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
```

### Step 3: Add Security Middleware
Create: `backend/src/middleware/security.js`
```javascript
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

// Auth rate limiting (stricter)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
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
```

### Step 4: Update Main Application
File: `backend/src/index.js`

Add the new security middleware:
```javascript
const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateRequest
} = require('./middleware/security');

// Apply security middleware
app.use(securityHeaders);
app.use(validateRequest);

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);
```

### Step 5: SSL/TLS Configuration
Create: `backend/src/config/ssl.js`
```javascript
const fs = require('fs');
const https = require('https');

const createSSLServer = (app) => {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
    secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
    ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384'
    ].join(':'),
    honorCipherOrder: true
  };

  return https.createServer(sslOptions, app);
};

module.exports = { createSSLServer };
```

### Step 6: Update Environment Configuration
Add to `backend/.env.production`:
```env
# SSL Configuration
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
SSL_CA_PATH=/path/to/ca_bundle.crt

# Security Configuration
SECURE_COOKIES=true
HTTPS_ONLY=true
STRICT_TRANSPORT_SECURITY=true
CONTENT_SECURITY_POLICY=true

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 7: Update Frontend Configuration
File: `frontend/next.config.js`

**Before:**
```javascript
const nextConfig = {
  // ... existing config
};
```

**After:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // HTTPS redirect in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },
  
  // ... existing config
};
```

## Testing Plan
1. Test HTTPS redirect functionality
2. Verify security headers are present
3. Test CORS with allowed/disallowed origins
4. Test rate limiting functionality
5. Validate CSP headers
6. Test SSL/TLS configuration

## Rollback Plan
1. Keep old CORS configuration as fallback
2. Monitor for blocked requests
3. Have quick toggle for HTTPS redirect
4. Maintain backward compatibility for 24 hours

## Timeline
- **Day 1**: Implement security headers and CORS
- **Day 2**: Deploy and test in staging
- **Day 3**: Configure SSL certificates
- **Day 4**: Enable HTTPS redirect
- **Day 5**: Monitor and optimize

## Success Criteria
- [ ] HTTPS redirect working in production
- [ ] All security headers present
- [ ] CORS properly configured
- [ ] Rate limiting functional
- [ ] SSL/TLS properly configured
- [ ] No mixed content warnings
- [ ] Security scan passes 