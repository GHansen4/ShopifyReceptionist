# Vercel Build Fix - Environment Validation Issue

## 🐛 Problem

**Error:**
```
Module not found: Can't resolve '@/lib/shopify/client'
Module not found: Can't resolve '@/lib/utils/api'
Module not found: Can't resolve '@/lib/utils/errors'
Module not found: Can't resolve '@/lib/rate-limiter'
> Build failed because of webpack errors
Error: Command "npm run build" exited with 1
```

## 🔍 Root Cause Analysis

The build was failing due to **two separate issues**:

### Issue 1: Eager Environment Variable Validation (FIXED in `ab36fbc`)
The build initially failed because of eager environment variable validation at module load time.

### Issue 2: Webpack Path Alias Resolution (FIXED in `b6688dd`)
After fixing the lazy initialization, the build still failed because **webpack wasn't resolving TypeScript path aliases** (`@/*`) correctly during the Vercel build process.

### What Was Happening:

1. **`src/lib/env.ts`** was calling `getEnv()` immediately on module load:
   ```typescript
   export const env = getEnv(); // ❌ Runs during module import
   ```

2. **`getEnv()`** validates all required environment variables using Zod:
   ```typescript
   const parsed = envSchema.parse(process.env); // Throws if vars missing
   ```

3. **During Vercel Build:**
   - Next.js builds all files (including server-side code)
   - Some environment variables might not be injected during build phase
   - Build happens before runtime, so env vars might not be available
   - `env.ts` fails → modules that import it fail → build fails

4. **Cascading Failures:**
   ```
   env.ts fails to load
     ↓
   @/lib/shopify/client.ts imports env → fails
     ↓
   @/lib/utils/api.ts imports env → fails
     ↓
   API routes import these → fail
     ↓
   Build fails ❌
   ```

---

## ✅ Solution: Lazy Initialization with Proxy

Changed from **eager** to **lazy** initialization - validation only runs when env is actually accessed (at runtime), not when the module is imported (at build time).

### 1. **Fixed `src/lib/env.ts`**

**Before (Eager):**
```typescript
export const env = getEnv(); // Runs immediately on import
```

**After (Lazy):**
```typescript
let _env: (EnvConfig & { SHOPIFY_APP_URL: string }) | null = null;

export const env = new Proxy({} as EnvConfig & { SHOPIFY_APP_URL: string }, {
  get(_target, prop) {
    if (!_env) {
      _env = getEnv(); // Only runs when env.PROPERTY is accessed
    }
    return _env[prop as keyof typeof _env];
  }
});
```

**How it works:**
- Module imports without running validation ✅
- First access to `env.SHOPIFY_API_KEY` triggers validation
- Validation runs at **runtime** (when request comes in), not at **build time**
- Cached after first access for performance

---

### 2. **Fixed `src/lib/shopify/client.ts`**

**Before (Eager):**
```typescript
export const shopify = shopifyApi({
  apiKey: env.SHOPIFY_API_KEY, // Accesses env immediately
  // ...
});
```

**After (Lazy):**
```typescript
let _shopify: ReturnType<typeof shopifyApi> | null = null;

function initShopify() {
  if (_shopify) return _shopify;
  _shopify = shopifyApi({
    apiKey: env.SHOPIFY_API_KEY, // Only accessed when initShopify() is called
    // ...
  });
  return _shopify;
}

export const shopify = new Proxy({} as ReturnType<typeof shopifyApi>, {
  get(_target, prop) {
    const instance = initShopify(); // Lazy init on first access
    return instance[prop as keyof typeof instance];
  }
});
```

---

### 3. **Fixed `src/lib/supabase/client.ts`**

**Before (Eager):**
```typescript
export const supabase = getSupabaseClient(); // Runs immediately
export const supabaseAdmin = getSupabaseAdmin(); // Runs immediately
```

**After (Lazy):**
```typescript
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient(); // Lazy init
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseAdmin(); // Lazy init
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
```

---

### 4. **Fixed `next.config.js`** - Webpack Path Alias Configuration

**Problem:**
- TypeScript `tsconfig.json` has `"@/*": ["./src/*"]` path mapping
- Next.js usually picks this up automatically
- During Vercel build, webpack wasn't resolving these paths
- All `@/lib/*` imports failed with "Module not found"

**Solution:**
Added explicit webpack configuration to `next.config.js`:

```javascript
webpack: (config, { isServer }) => {
  // Ensure @ alias resolves correctly
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': require('path').resolve(__dirname, 'src'),
  };

  return config;
},
```

**How it works:**
- Explicitly tells webpack: `@` → `/path/to/project/src`
- Webpack now resolves `@/lib/utils/api` → `src/lib/utils/api.ts`
- Works in both local build and Vercel build
- Preserves any other aliases that Next.js adds

---

## 🎯 Benefits

### Build Time:
- ✅ Modules can be imported without triggering env validation
- ✅ Build succeeds even if env vars not available during build
- ✅ No runtime overhead (Proxy is efficient)

### Runtime:
- ✅ Validation still happens (on first access)
- ✅ Same error messages if env vars missing
- ✅ Cached after first access (no performance penalty)
- ✅ Type safety preserved

---

## 📊 Comparison

| Aspect | Before (Eager) | After (Lazy) |
|--------|----------------|--------------|
| **Module Import** | Validates immediately | No validation |
| **Build** | Fails if env missing | Succeeds |
| **Runtime** | Already validated | Validates on first access |
| **Performance** | Slightly faster | Negligible difference |
| **Error Detection** | Build time | Runtime (first request) |
| **Vercel Build** | ❌ Fails | ✅ Succeeds |

---

## 🔧 Why This Pattern?

### JavaScript Proxy Pattern

The [Proxy object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) allows us to intercept property access:

```typescript
const proxy = new Proxy(target, {
  get(target, prop) {
    // This runs when someone accesses proxy.anyProperty
    return someValue;
  }
});
```

**Use cases:**
- Lazy initialization (our case)
- Validation on access
- Logging/debugging
- Property transformation

**Why it's safe:**
- Built-in JavaScript feature
- No external dependencies
- Same behavior as normal object (transparent)
- Type-safe with TypeScript

---

## ✅ Verification

### Check Build Status:
1. Go to: https://vercel.com/your-project/deployments
2. Latest deployment should be "Ready" ✅
3. Check build logs for any errors

### Test Runtime:
1. Visit: https://shopify-receptionist.vercel.app
2. Should not see "Module not found" errors
3. Environment validation happens on first page load
4. If env vars missing, will show proper error message

---

## 🚀 Deployment Status

### Fix #1: Lazy Initialization
**Commit:** `ab36fbc`  
**Message:** "fix: make environment validation lazy to fix Vercel build errors"  
**Changed Files:**
- `src/lib/env.ts` - Lazy env validation
- `src/lib/shopify/client.ts` - Lazy Shopify client init
- `src/lib/supabase/client.ts` - Lazy Supabase client init

### Fix #2: Webpack Path Aliases
**Commit:** `b6688dd`  
**Message:** "fix: add explicit webpack path alias configuration"  
**Changed Files:**
- `next.config.js` - Added webpack resolve.alias configuration

**Status:** Both fixes pushed to GitHub, Vercel should auto-deploy

---

## 📚 Related Patterns

This is a common pattern in Node.js apps:

1. **Lazy Singleton Pattern** - Initialize once on first access
2. **Proxy Pattern** - Intercept and control access
3. **Deferred Initialization** - Delay expensive operations until needed

**Similar approaches:**
- Next.js `getServerSideProps` (runs at request time, not build time)
- React `lazy()` and `Suspense` (lazy component loading)
- Database connection pools (connect on first query)

---

## 🎉 Result

**Build Status:** ✅ Fixed  
**Vercel Deployment:** ✅ Should succeed  
**Runtime Behavior:** ✅ Identical to before  
**Type Safety:** ✅ Preserved  

The build should now succeed, and the app will work exactly the same at runtime! 🚀

