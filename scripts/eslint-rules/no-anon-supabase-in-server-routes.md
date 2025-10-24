# No Anon Supabase in Server Routes

## Team Convention

Any `/api/**` server route must import `getServerSupabase` not an anon `supabase`.

## Why?

- Server routes need full database access to bypass RLS (Row Level Security)
- Anon client is restricted by RLS policies and may fail on database operations
- Service role client has full database access required for server operations

## Correct Pattern

```typescript
// ✅ CORRECT: Use service role client
export const runtime = 'nodejs';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  
  const { data, error } = await supabase
    .from('shops')
    .select('*');
}
```

## Incorrect Pattern

```typescript
// ❌ INCORRECT: Using anon client in server routes
import { supabase } from '@/lib/supabase/client';

export async function POST(req: Request) {
  const { data, error } = await supabase
    .from('shops')
    .select('*'); // May fail due to RLS
}
```

## Enforcement

This is a team convention to prevent RLS-related database failures in server routes.

## Files That Must Use Service Role

- `/api/auth/callback` - OAuth token storage
- `/api/vapi/functions` - Product lookups
- `/api/vapi/provision` - Assistant creation
- `/api/webhooks` - Shopify webhooks
- All `/api/test/*` routes - Database testing
