import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
} else {
  // Sentry is disabled - no DSN provided
  if (process.env.NODE_ENV === 'development') {
    console.info('ℹ️  Sentry client is disabled - no DSN provided');
  }
}
