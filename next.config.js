const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
let nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // X-Frame-Options removed to allow Shopify iframe embedding
          // Use Content-Security-Policy frame-ancestors instead
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com 'self'",
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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

  // Redirects
  async redirects() {
    return [];
  },

  // Rewrites
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // Environment variables
  env: {
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Webpack configuration to ensure path aliases work
  webpack: (config, { isServer }) => {
    // Ensure @ alias resolves correctly
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    return config;
  },
};

// Only enable Sentry if credentials are provided
// This prevents build/dev hangs when Sentry is not configured
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

if (sentryAuthToken && sentryOrg && sentryProject) {
  nextConfig = withSentryConfig(nextConfig, {
    org: sentryOrg,
    project: sentryProject,
    authToken: sentryAuthToken,
    silent: true,
  });
} else {
  console.warn('⚠️  Sentry is disabled - missing SENTRY_AUTH_TOKEN, SENTRY_ORG, or SENTRY_PROJECT');
}

module.exports = nextConfig;

