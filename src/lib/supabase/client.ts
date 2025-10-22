import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * Supabase Admin Client (uses service role key to bypass RLS)
 * ⚠️ WARNING: This client has full database access. Only use in server-side code.
 * Use this for:
 * - Admin operations
 * - Database migrations/seeding
 * - Background jobs
 * - Testing (bypassing RLS policies)
 */
export function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY not found. Admin client unavailable.');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }
    
    supabaseAdminClient = createClient(env.SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    console.log('[Supabase Admin] Admin client initialized successfully');
  }
  return supabaseAdminClient;
}

// Use Proxy for lazy initialization to avoid build-time errors
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
