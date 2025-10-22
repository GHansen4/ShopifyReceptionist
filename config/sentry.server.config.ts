import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  });
} else {
  // Sentry is disabled - no DSN provided
  if (process.env.NODE_ENV === 'development') {
    console.info('ℹ️  Sentry server is disabled - no DSN provided');
  }
}
