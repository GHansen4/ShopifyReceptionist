import { createClient } from '@supabase/supabase-js';

export function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // NOT anon
  if (!url || !key) {
    throw new Error(
      `[SupabaseSR] Missing envs: SUPABASE_URL=${!!url}, SUPABASE_SERVICE_ROLE_KEY=${!!key}`
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-app': 'shopify-voice' } },
  });
}
