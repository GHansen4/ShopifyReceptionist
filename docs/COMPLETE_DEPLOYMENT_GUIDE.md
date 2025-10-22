# 🚀 Complete Vercel Deployment Guide

## 📊 Current Status

**Your app is deployed at:** https://shopify-receptionist.vercel.app  
**Status:** Deployed but needs post-deployment configuration

---

## ✅ What's Been Done

### Code Preparation ✅
- ✅ **Updated package.json** - Added `dev:vercel` and `vercel-build` scripts
- ✅ **Created vercel.json** - Optimal Vercel configuration
- ✅ **No hardcoded URLs** - All URLs use environment variables
- ✅ **Custom server separation** - server.js only for local dev
- ✅ **Environment-aware** - Works in both local and production

### Changes Made:

#### 1. **package.json** (Updated)
```json
{
  "scripts": {
    "dev": "node server.js",           // Local dev with HTTPS
    "dev:vercel": "next dev",           // NEW: Vercel-style dev
    "build": "next build",              // Production build
    "start": "next start",              // Production start
    "vercel-build": "next build"        // NEW: Vercel build command
  }
}
```

#### 2. **vercel.json** (Created)
- Optimal Vercel configuration
- Security headers for Shopify embedding
- Production environment settings

---

## 🔄 How It Works Now

### Local Development (with Shopify CLI)

```bash
# Terminal 1: Shopify CLI (creates tunnel)
shopify app dev
# Creates: https://[random].trycloudflare.com
# Sets: SHOPIFY_APP_URL

# Terminal 2: Custom HTTPS server
npm run dev
# Uses: server.js (HTTPS with self-signed certs)
# Listens on: https://localhost:3000
# Tunnel forwards to: localhost:3000
```

**Environment Variables Used:**
- `SHOPIFY_APP_URL` - From Shopify CLI (tunnel URL)
- `NEXT_PUBLIC_APP_URL` - From .env (localhost:3000)
- **App uses:** `SHOPIFY_APP_URL` (tunnel)

**Flow:**
```
Shopify Admin
    ↓
Tunnel (https://[random].trycloudflare.com)
    ↓
localhost:3000 (server.js with HTTPS)
    ↓
Your Next.js app
```

---

### Production (Vercel)

```bash
# Just push to GitHub
git push origin master
# Vercel automatically:
# 1. Detects push
# 2. Runs: npm run build
# 3. Deploys to: https://shopify-receptionist.vercel.app
```

**Environment Variables Used:**
- `SHOPIFY_APP_URL` - undefined (no CLI in production)
- `NEXT_PUBLIC_APP_URL` - https://shopify-receptionist.vercel.app
- **App uses:** `NEXT_PUBLIC_APP_URL`

**Flow:**
```
Shopify Admin
    ↓
Direct HTTPS (https://shopify-receptionist.vercel.app)
    ↓
Vercel (automatic HTTPS, no custom server)
    ↓
Your Next.js app
```

**Key Differences:**
- ❌ No `server.js` (Vercel uses standard Next.js)
- ❌ No tunnel (Vercel URL is public)
- ✅ Vercel provides real SSL certificates
- ✅ URL is stable (doesn't change on restart)

---

## 📋 Post-Deployment Checklist

### Step 1: Verify Environment Variables in Vercel

Go to: https://vercel.com → Your Project → Settings → Environment Variables

**Check these are set:**

```bash
# Shopify
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_[YOUR_SECRET]  # ⚠️ Must be set!
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Vapi  
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Supabase
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_KEY]  # ⚠️ Must be set!

# App URL
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
NODE_ENV=production
```

**After adding/updating:**
- Click "Redeploy" in Vercel
- Select "Use existing Build Cache"
- Wait 1-2 minutes

---

### Step 2: Update Shopify Partner Dashboard

Go to: https://partners.shopify.com → Apps → Always AI Call Receptionist → Configuration

**Update these fields:**

| Field | Old Value | New Value |
|-------|-----------|-----------|
| **App URL** | `https://localhost:3000` | `https://shopify-receptionist.vercel.app` |
| **Redirect URLs** | `https://localhost:3000/api/auth/callback` | `https://shopify-receptionist.vercel.app/api/auth/callback` |

Click **Save**.

---

### Step 3: Update Vapi Assistant

Go to: https://dashboard.vapi.ai → Assistants → Your Assistant

**Update:**
- **Server URL:** `https://shopify-receptionist.vercel.app/api/vapi/functions`
- **Server URL Secret:** Your `VAPI_API_KEY` (should already be set)

Click **Save**.

**Alternative:** Reprovision via your app:
1. Go to: https://shopify-receptionist.vercel.app/test/vapi
2. Enter tunnel URL: `https://shopify-receptionist.vercel.app`
3. Click "Provision Test Phone Number"
4. This creates a new assistant with production URL

---

### Step 4: Test OAuth Flow

1. **Visit:** https://shopify-receptionist.vercel.app
2. **Expected:** Redirected to Shopify for authorization
3. **Authorize:** Click "Install" or "Allow"
4. **Expected:** Redirected back to your app dashboard
5. **Success:** You see the app homepage with "Quick System Check"

**If errors:**
- Check Shopify app URLs are correct
- Check redirect URL matches exactly
- Check `SHOPIFY_API_SECRET` is set in Vercel
- Check Vercel logs for detailed error

---

### Step 5: Test Vapi Function Calls

1. **Call:** +1 (831) 200-2458
2. **Say:** "Hello"
3. **Agent:** "Hello! You've reached always-ai-dev-store..."
4. **Ask:** "What products do you sell?"
5. **Expected:** Agent lists actual products from your store ✅

**If function calls fail:**
- Check Vercel logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify Vapi assistant `serverUrl` is updated
- Ensure you completed OAuth flow (Step 4)

---

## 🔍 Debugging

### Check Vercel Logs

1. Go to: https://vercel.com → Your Project → Functions or Logs
2. Look for lines with `[Vapi Functions]`
3. Check for errors

**Good logs:**
```
[Vapi Functions] Received function call
[get_products] Fetching 5 products for always-ai-dev-store.myshopify.com
[get_products] ✅ Fetched 3 products
```

**Bad logs:**
```
[Vapi Functions] ❌ Unauthorized: Invalid or missing API key
[get_products] Store not authenticated
[get_products] Shopify API error: 401
```

---

### Common Issues

#### "Cannot reach the origin service"

**Cause:** Vapi has old tunnel URL  
**Fix:** Update Vapi assistant `serverUrl` (Step 3)

---

#### "Store not authenticated"

**Cause:** No Shopify session in database  
**Fix:** Complete OAuth flow (Step 4)

---

#### "Invalid redirect_uri"

**Cause:** Shopify redirect URL doesn't match  
**Fix:**
1. Check Shopify Partner Dashboard redirect URLs
2. Must exactly match: `https://shopify-receptionist.vercel.app/api/auth/callback`
3. No trailing slash, must use HTTPS

---

#### "Function calls don't work"

**Cause:** Multiple possible issues  
**Check:**
1. All Vercel environment variables set?
2. Redeployed after updating variables?
3. Vapi assistant `serverUrl` updated?
4. OAuth flow completed (authenticated)?
5. Check Vercel logs for specific error

---

## 🎯 Environment Comparison

### What Works in BOTH Environments

| Feature | Local Dev | Production |
|---------|-----------|------------|
| **HTTPS** | ✅ (server.js) | ✅ (Vercel) |
| **OAuth** | ✅ (via tunnel) | ✅ (direct) |
| **Vapi Callbacks** | ✅ (via tunnel) | ✅ (direct) |
| **Product API** | ✅ | ✅ |
| **Database** | ✅ (Supabase) | ✅ (Supabase) |
| **Shopify API** | ✅ | ✅ |

### Key Differences

| Aspect | Local Dev | Production |
|--------|-----------|------------|
| **Server** | server.js (custom) | Vercel (standard) |
| **URL** | Changes on restart | Stable |
| **SSL Cert** | Self-signed | Real (Vercel) |
| **Tunnel** | Required | Not needed |
| **ENV Source** | .env + CLI | Vercel dashboard |

---

## 📦 Deployment Workflow

### For Code Changes

```bash
# 1. Make changes locally
git add .
git commit -m "Your changes"
git push origin master

# 2. Vercel auto-deploys
# No manual steps needed!

# 3. Check deployment
# Go to Vercel dashboard → Deployments
# Wait for "Ready" status
```

### For Environment Variable Changes

```bash
# 1. Update in Vercel dashboard
# Settings → Environment Variables

# 2. Redeploy
# Deployments tab → ⋯ → Redeploy

# 3. Wait 1-2 minutes
# Check logs for confirmation
```

---

## ✅ Success Criteria

You're fully deployed when:

- [ ] All environment variables set in Vercel
- [ ] Shopify app URLs updated to Vercel URL
- [ ] Vapi assistant serverUrl updated
- [ ] OAuth flow works (can authorize app)
- [ ] Can call phone number and agent answers
- [ ] Agent can fetch and list products
- [ ] No errors in Vercel logs

---

## 🎉 Benefits of Production Deployment

### vs Local Development:

| Benefit | Local | Production |
|---------|-------|------------|
| **Stability** | URL changes on restart | URL never changes |
| **Accessibility** | Only when dev server running | Always available |
| **Performance** | Local machine | Vercel's global CDN |
| **SSL** | Self-signed (browser warnings) | Real certificate |
| **Setup** | 2 terminals + tunnel | Just push code |
| **Debugging** | Terminal logs only | Full dashboard + logs |
| **Collaboration** | Hard to share | Easy to share URL |

---

## 🚀 You're Ready!

Your app is:
- ✅ Deployed to Vercel
- ✅ Code prepared for production
- ✅ Scripts updated for clarity
- ✅ Vercel configuration optimized

**Next:** Complete the Post-Deployment Checklist above to finish setup!

---

## 📚 Related Docs

- `POST_DEPLOYMENT_CHECKLIST.md` - Step-by-step post-deploy tasks
- `VERCEL_PREPARATION_STATUS.md` - Detailed status report
- `VERCEL_ENV_VARS.txt` - Environment variables list
- `vercel.json` - Vercel configuration file

---

## 💡 Pro Tips

1. **Auto-deploy on push** - Vercel deploys every push to `master`
2. **Preview deployments** - Every PR gets its own URL
3. **Rollback** - One-click rollback to previous deployment
4. **Custom domain** - Add your own domain in Vercel settings
5. **Environment per branch** - Different env vars for staging/prod

**You're production-ready!** 🎉

