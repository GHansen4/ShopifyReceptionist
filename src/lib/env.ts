import { z, ZodError } from 'zod';

const envSchema = z.object({
  // Shopify
  SHOPIFY_API_KEY: z.string().min(1, 'SHOPIFY_API_KEY is required'),
  SHOPIFY_API_SECRET: z.string().min(1, 'SHOPIFY_API_SECRET is required'),
  SHOPIFY_SCOPES: z.string().min(1, 'SHOPIFY_SCOPES is required'),

  // Vapi
  VAPI_API_KEY: z.string().min(1, 'VAPI_API_KEY is required'),
  VAPI_PUBLIC_KEY: z.string().min(1, 'VAPI_PUBLIC_KEY is required'),
  VAPI_TEST_PHONE_NUMBER: z.string().optional(), // Phone number bought from Vapi dashboard (for testing)

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Sentry (optional - only required for production)
  SENTRY_DSN: z
    .union([
      z.string().url('SENTRY_DSN must be a valid URL if provided'),
      z.literal(''),
      z.undefined(),
    ])
    .optional(),

  // App URL - From Shopify CLI (SHOPIFY_APP_URL) or manual configuration (NEXT_PUBLIC_APP_URL)
  // Shopify CLI automatically sets SHOPIFY_APP_URL during development
  SHOPIFY_APP_URL: z.string().url('SHOPIFY_APP_URL must be a valid URL').optional(),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
}).refine(
  (data) => data.SHOPIFY_APP_URL || data.NEXT_PUBLIC_APP_URL,
  {
    message: 'Either SHOPIFY_APP_URL (from Shopify CLI) or NEXT_PUBLIC_APP_URL must be set',
  }
);

type EnvConfig = z.infer<typeof envSchema>;

// Helper to get the app URL with proper priority
function getAppUrl(env: Record<string, string | undefined>): string {
  // Priority 1: Shopify CLI sets SHOPIFY_APP_URL (recommended)
  if (env.SHOPIFY_APP_URL) {
    return env.SHOPIFY_APP_URL;
  }
  
  // Priority 2: Manual configuration via NEXT_PUBLIC_APP_URL (fallback)
  if (env.NEXT_PUBLIC_APP_URL) {
    return env.NEXT_PUBLIC_APP_URL;
  }
  
  throw new Error('Neither SHOPIFY_APP_URL nor NEXT_PUBLIC_APP_URL is set');
}

let validatedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig & { SHOPIFY_APP_URL: string } {
  if (validatedEnv) {
    return {
      ...validatedEnv,
      SHOPIFY_APP_URL: getAppUrl(process.env),
    };
  }

  try {
    const parsed = envSchema.parse(process.env);
    validatedEnv = parsed;
    return {
      ...parsed,
      SHOPIFY_APP_URL: getAppUrl(process.env),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${errors}`);
    }
    throw error;
  }
}

// Use a getter to allow env validation to be lazy (deferred until runtime)
// This prevents build failures when env vars aren't available during build
let _env: (EnvConfig & { SHOPIFY_APP_URL: string }) | null = null;

export const env = new Proxy({} as EnvConfig & { SHOPIFY_APP_URL: string }, {
  get(_target, prop) {
    if (!_env) {
      _env = getEnv();
    }
    return _env[prop as keyof typeof _env];
  }
});
