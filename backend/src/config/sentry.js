const Sentry = require('@sentry/node');

const initSentry = (app) => {
  // Only initialize if we have a valid DSN and are in production
  if (process.env.NODE_ENV === 'production' && 
      process.env.SENTRY_DSN && 
      process.env.SENTRY_DSN !== 'your_sentry_dsn' &&
      process.env.SENTRY_DSN.trim() !== '') {
    
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: process.env.npm_package_version || '1.0.0',
        // Enable performance monitoring
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        beforeSend(event) {
          // Filter out sensitive data
          if (event.request && event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['x-api-key'];
          }
          
          // Filter out health check and metrics endpoints
          if (event.request && event.request.url) {
            if (event.request.url.includes('/health') || 
                event.request.url.includes('/metrics') ||
                event.request.url.includes('/info')) {
              return null; // Don't send these events to Sentry
            }
          }
          
          return event;
        },
        beforeBreadcrumb(breadcrumb) {
          // Filter out sensitive breadcrumbs
          if (breadcrumb.category === 'http' && breadcrumb.data) {
            if (breadcrumb.data.url && (
              breadcrumb.data.url.includes('/health') ||
              breadcrumb.data.url.includes('/metrics') ||
              breadcrumb.data.url.includes('/info')
            )) {
              return null;
            }
          }
          return breadcrumb;
        }
      });

      // RequestHandler creates a separate execution context
      app.use(Sentry.Handlers.requestHandler());
      
      // TracingHandler creates a trace for every incoming request
      app.use(Sentry.Handlers.tracingHandler());
      
      console.log('Sentry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error.message);
    }
  } else {
    console.log('Sentry not initialized - missing DSN or not in production mode');
  }
};

const captureException = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: context.component || 'unknown',
        user_id: context.userId || 'anonymous'
      }
    });
  }
};

const captureMessage = (message, level = 'info', context = {}) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
      tags: {
        component: context.component || 'unknown',
        user_id: context.userId || 'anonymous'
      }
    });
  }
};

const setUser = (user) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });
  }
};

const addBreadcrumb = (breadcrumb) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  Sentry
}; 