const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const initSentry = (app) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version || '1.0.0',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
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