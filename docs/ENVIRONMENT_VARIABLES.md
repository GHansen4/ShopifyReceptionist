# Environment Variables Reference

This document lists all required and optional environment variables for the Shopify Voice Receptionist app.

---

## 📋 Required Variables

### Shopify Configuration

```bash
# Shopify API Key (Client ID)
# Get from: https://partners.shopify.com → Your App → Configuration
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5

# Shopify API Secret (Client Secret)
# Get from: https://partners.shopify.com → Your App → Configuration
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE

# Shopify API Scopes
# Define what data your app can access
SHOPIFY_SCOPES=read_customers,read_orders,read_products

# ⚠️ IMPORTANT: Client-side API Key for App Bridge
# This MUST be the same value as SHOPIFY_API_KEY
# The NEXT_PUBLIC_ prefix makes it available in the browser
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
```

**Why you need both:**
- `SHOPIFY_API_KEY` - Used server-side for OAuth and API calls
- `NEXT_PUBLIC_SHOPIFY_API_KEY` - Used client-side for App Bridge initialization

---

### App URLs

```bash
# Production URL (Vercel deployment)
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app

# Development URL (automatically set by Shopify CLI)
# Don't set this manually - Shopify CLI provides it
# SHOPIFY_APP_URL=https://[random].trycloudflare.com
```

**How it works:**
- **Production:** Uses `NEXT_PUBLIC_APP_URL`
- **Development:** Shopify CLI automatically sets `SHOPIFY_APP_URL` with tunnel URL
- **Priority:** `SHOPIFY_APP_URL` (if present) > `NEXT_PUBLIC_APP_URL`

---

### Vapi Configuration

```bash
# Vapi API Key (for server-side Vapi SDK)
# Get from: https://dashboard.vapi.ai → Settings → API Keys
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8

# Vapi Public Key (for client-side Vapi Web SDK - if needed)
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Your purchased Vapi phone number (for testing)
# Format: E.164 (+1234567890)
VAPI_TEST_PHONE_NUMBER=+18312002458
```

---

### Supabase Configuration

```bash
# Supabase Project URL
# Get from: https://supabase.com/dashboard → Your Project → Settings → API
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co

# Supabase Anonymous Key (public, safe to expose)
# Get from: https://supabase.com/dashboard → Your Project → Settings → API
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (private, never expose!)
# Get from: https://supabase.com/dashboard → Your Project → Settings → API
# ⚠️ This key bypasses RLS - keep it secret!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Security Notes:**
- `SUPABASE_ANON_KEY` - Safe to use client-side (respects RLS)
- `SUPABASE_SERVICE_ROLE_KEY` - NEVER expose client-side (bypasses RLS)

---

## 📝 Optional Variables

### Node Environment

```bash
# Environment mode
# Options: development | production
NODE_ENV=production
```

**Automatically set by:**
- **Vercel:** Sets to `production` automatically
- **Local dev:** `next dev` sets to `development`
- **Shopify CLI:** Inherits from your terminal

---

### Sentry (Error Tracking)

```bash
# Sentry DSN (for error reporting)
# Get from: https://sentry.io → Your Project → Settings → Client Keys
SENTRY_DSN=https://your-hash@o-org.ingest.sentry.io/project-id

# Sentry Organization Slug
SENTRY_ORG=your-org

# Sentry Project Slug
SENTRY_PROJECT=shopify-receptionist

# Sentry Auth Token (for source map uploads)
SENTRY_AUTH_TOKEN=your-auth-token
```

**Note:** Sentry is optional. The app will run without it, but you won't have error tracking.

---

## 🔐 Security Best Practices

### Never Commit Secrets

**Always keep these secret:**
- ❌ `SHOPIFY_API_SECRET`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `SENTRY_AUTH_TOKEN`
- ❌ `VAPI_API_KEY`

**Safe to expose (but still don't commit):**
- ✅ `NEXT_PUBLIC_SHOPIFY_API_KEY` (client-side, not sensitive)
- ✅ `SUPABASE_ANON_KEY` (client-side, protected by RLS)
- ✅ `VAPI_PUBLIC_KEY` (designed for client-side)

### Environment-Specific Values

| Variable | Local Development | Vercel Production |
|----------|------------------|-------------------|
| `SHOPIFY_API_KEY` | Same | Same |
| `SHOPIFY_API_SECRET` | Same | Same |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | Same | Same |
| `NEXT_PUBLIC_APP_URL` | `https://localhost:3000` | `https://shopify-receptionist.vercel.app` |
| `SHOPIFY_APP_URL` | Auto (CLI tunnel) | Not set |
| `NODE_ENV` | `development` | `production` |

---

## 🎯 Quick Setup for Vercel

### Step 1: Go to Vercel Dashboard

1. Navigate to: https://vercel.com
2. Select your project
3. Go to: **Settings** → **Environment Variables**

### Step 2: Add Variables

For each variable below, click **Add New** and set:
- **Key:** Variable name (e.g., `SHOPIFY_API_KEY`)
- **Value:** Your actual value
- **Environment:** Select **Production** (and optionally Preview/Development)

### Step 3: Required Variables for Production

```bash
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
SHOPIFY_SCOPES=read_customers,read_orders,read_products
NEXT_PUBLIC_SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
NODE_ENV=production
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880
VAPI_TEST_PHONE_NUMBER=+18312002458
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Redeploy

After adding all variables:
1. Go to: **Deployments** tab
2. Find latest deployment
3. Click **⋯** → **Redeploy**
4. Choose **Use existing Build Cache**
5. Wait ~1-2 minutes

---

## ✅ Verification

### Check if Variables are Set

**In Vercel:**
- Dashboard → Settings → Environment Variables
- Should see all variables listed

**At Runtime:**
```typescript
// Server-side (API routes, middleware)
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY);
console.log('VAPI_API_KEY:', process.env.VAPI_API_KEY);

// Client-side (components, pages)
console.log('NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
```

**Check Logs:**
- Vercel → Functions/Logs
- Look for environment-related errors
- App Bridge should initialize without errors

---

## 🐛 Troubleshooting

### Issue: "NEXT_PUBLIC_SHOPIFY_API_KEY is not defined"

**Symptom:** App Bridge fails to initialize, console shows missing API key

**Fix:**
1. Add `NEXT_PUBLIC_SHOPIFY_API_KEY` to Vercel environment variables
2. **Value must match** `SHOPIFY_API_KEY` exactly
3. Redeploy after adding

### Issue: "Invalid redirect_uri"

**Symptom:** OAuth fails with redirect URI mismatch

**Fix:**
1. Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel URL exactly
2. Update `shopify.app.toml` redirect URLs
3. Verify Shopify Partner Dashboard URLs match

### Issue: "Environment validation failed"

**Symptom:** Build fails or runtime errors about missing variables

**Fix:**
1. Check `src/lib/env.ts` for required variables
2. Ensure all required variables are set in Vercel
3. Redeploy after adding missing variables

### Issue: App works locally but fails on Vercel

**Cause:** Environment variables not set in Vercel

**Fix:**
1. Local: Variables in `.env.local`
2. Vercel: Must manually add in dashboard
3. **They don't sync automatically!**

---

## 📚 Related Documentation

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Shopify App Configuration](https://shopify.dev/docs/apps/tools/cli/configuration)
- [Supabase API Settings](https://supabase.com/docs/guides/api)

---

## 🎉 Summary

### Critical Variables (App won't work without these):
1. ✅ `SHOPIFY_API_KEY`
2. ✅ `SHOPIFY_API_SECRET`
3. ✅ `NEXT_PUBLIC_SHOPIFY_API_KEY` (same as #1)
4. ✅ `SHOPIFY_SCOPES`
5. ✅ `NEXT_PUBLIC_APP_URL`
6. ✅ `VAPI_API_KEY`
7. ✅ `SUPABASE_URL`
8. ✅ `SUPABASE_ANON_KEY`
9. ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Optional but Recommended:
- `VAPI_PUBLIC_KEY`
- `VAPI_TEST_PHONE_NUMBER`
- `SENTRY_DSN` (and related Sentry variables)

**After setting all variables in Vercel, don't forget to redeploy!**

