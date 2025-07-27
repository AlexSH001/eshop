# JWT Security Hardening Migration Plan

## Overview
Migrate from hardcoded JWT secrets to secure environment-based secret management.

## Current Issues
- Hardcoded secrets in startup scripts
- Weak default secrets
- No secret rotation mechanism
- Secrets potentially exposed in logs

## Migration Steps

### Step 1: Generate Strong Secrets
```bash
# Generate 64-character random secrets
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
```

### Step 2: Update Environment Configuration
Create production environment file: `backend/.env.production`
```env
# JWT Configuration
JWT_SECRET=<generated-64-char-secret>
JWT_REFRESH_SECRET=<generated-64-char-secret>
JWT_ACCESS_EXPIRES_IN=900  # 15 minutes
JWT_REFRESH_EXPIRES_IN=604800  # 7 days

# Security Headers
SECURE_COOKIES=true
HTTPS_ONLY=true
```

### Step 3: Update Auth Middleware
File: `backend/src/middleware/auth.js`

**Before:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
```

**After:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate secrets are set
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be configured in production');
}

if (process.env.NODE_ENV === 'production' && 
    (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32)) {
  throw new Error('JWT secrets must be at least 32 characters in production');
}
```

### Step 4: Implement Secret Rotation
Create: `backend/src/utils/secretRotation.js`
```javascript
const crypto = require('crypto');

class SecretManager {
  constructor() {
    this.currentSecret = process.env.JWT_SECRET;
    this.currentRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.secretHistory = new Map();
  }

  rotateSecrets() {
    const newSecret = crypto.randomBytes(32).toString('base64');
    const newRefreshSecret = crypto.randomBytes(32).toString('base64');
    
    // Store old secrets for token validation during transition
    this.secretHistory.set(this.currentSecret, Date.now());
    this.secretHistory.set(this.currentRefreshSecret, Date.now());
    
    this.currentSecret = newSecret;
    this.currentRefreshSecret = newRefreshSecret;
    
    // Clean up old secrets after 24 hours
    setTimeout(() => {
      this.secretHistory.delete(this.currentSecret);
      this.secretHistory.delete(this.currentRefreshSecret);
    }, 24 * 60 * 60 * 1000);
    
    return { newSecret, newRefreshSecret };
  }

  validateToken(token, isRefresh = false) {
    const secret = isRefresh ? this.currentRefreshSecret : this.currentSecret;
    
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      // Try with historical secrets
      for (const [oldSecret, timestamp] of this.secretHistory) {
        try {
          return jwt.verify(token, oldSecret);
        } catch (e) {
          continue;
        }
      }
      throw error;
    }
  }
}

module.exports = new SecretManager();
```

### Step 5: Update Startup Scripts
Remove hardcoded secrets from `backend/start.sh` and `frontend/start.sh`

**Before:**
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

**After:**
```bash
# JWT secrets must be set via environment variables
if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
    echo "❌ JWT_SECRET and JWT_REFRESH_SECRET must be set"
    exit 1
fi
```

### Step 6: Add Security Validation
Create: `backend/src/middleware/securityValidation.js`
```javascript
const securityValidation = (req, res, next) => {
  // Validate required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NODE_ENV'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    return res.status(500).json({ 
      error: 'Server configuration error' 
    });
  }

  // Validate secret strength in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (jwtSecret.length < 32 || refreshSecret.length < 32) {
      console.error('JWT secrets too weak for production');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }
  }

  next();
};

module.exports = securityValidation;
```

## Testing Plan
1. Test with weak secrets (should fail)
2. Test with strong secrets (should pass)
3. Test secret rotation mechanism
4. Test token validation with old/new secrets
5. Verify no secrets in logs

## Rollback Plan
1. Keep old secrets in environment variables
2. Maintain backward compatibility for 24 hours
3. Monitor for authentication failures
4. Revert to old secrets if issues arise

## Timeline
- **Day 1**: Generate secrets and update configuration
- **Day 2**: Deploy with new secrets and monitoring
- **Day 3**: Verify no authentication issues
- **Day 4**: Remove old secret references
- **Day 5**: Implement secret rotation schedule

## Success Criteria
- [ ] No hardcoded secrets in codebase
- [ ] Strong secrets (64+ characters) in production
- [ ] Secret rotation mechanism working
- [ ] No secrets exposed in logs
- [ ] All authentication tests passing 