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