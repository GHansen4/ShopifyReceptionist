# Vercel Deployment Preparation - Status Report

## ✅ What's Already Good

### 1. **next.config.js** ✅
- Headers configured correctly for Shopify iframe embedding
- Environment variable handling in place
- No custom server references
- **Status:** Ready for Vercel

### 2. **No Hardcoded localhost URLs** ✅
- Checked all source files
- No hardcoded `localhost:3000` found in `src/`
- Uses environment variables correctly
- **Status:** Ready for Vercel

### 3. **Code is Already Deployed** ✅
- Currently live at: https://shopify-receptionist.vercel.app
- **Status:** Deployed (needs post-deployment config)

---

## ⚠️ What Needs to Be Fixed

### 1. **package.json Scripts** ⚠️ NEEDS FIX

**Current:**
```json
"dev": "node server.js",
"start": "next start"
```

**Problem:** 
- `npm run dev` uses custom HTTPS server (server.js)
- Vercel ignores this and uses standard Next.js
- Local dev and Vercel behave differently

**Fix Needed:** Separate local dev from Vercel

---

### 2. **Custom HTTPS Server (server.js)** ⚠️ CONDITIONALLY NEEDED

**Status:** 
- File exists: `server.js`
- Used for: Local HTTPS development with self-signed certs
- Vercel: Doesn't use this (has its own HTTPS)

**Decision:** 
- ✅ Keep `server.js` for **local development only**
- ✅ Vercel will ignore it automatically
- ✅ No code changes needed (Vercel uses Next.js directly)

---

### 3. **Environment Variables** ⚠️ NEEDS CONFIGURATION

**Required in Vercel:**

```bash
# Shopify
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE  # ⚠️ Add this
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Vapi
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Supabase
SUPABASE_URL=https://ezoyrjzzynmxdoorpokr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY_HERE  # ⚠️ Add this

# App URL (CRITICAL)
NEXT_PUBLIC_APP_URL=https://shopify-receptionist.vercel.app
NODE_ENV=production
```

**Status:** Needs verification in Vercel dashboard

---

### 4. **Shopify Partner Dashboard URLs** ⚠️ NEEDS UPDATE

**Required Changes:**

Go to: https://partners.shopify.com → Your App → Configuration

Update:
- **App URL:** `https://shopify-receptionist.vercel.app`
- **Redirect URLs:** `https://shopify-receptionist.vercel.app/api/auth/callback`

**Status:** Needs manual update

---

### 5. **Vapi Assistant Configuration** ⚠️ NEEDS UPDATE

**Current:** Using old tunnel URL  
**Required:** `https://shopify-receptionist.vercel.app/api/vapi/functions`

**Status:** Needs update in Vapi dashboard

---

## 🎯 Action Items (Priority Order)

### Priority 1: Environment Variables
- [ ] Add `SHOPIFY_API_SECRET` to Vercel
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
- [ ] Verify `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] Redeploy after adding variables

### Priority 2: External Services
- [ ] Update Shopify Partner Dashboard URLs
- [ ] Update Vapi assistant serverUrl

### Priority 3: Code Improvements (Optional)
- [ ] Update package.json scripts for clarity
- [ ] Add vercel.json for custom configuration (optional)
- [ ] Create environment-specific documentation

---

## 📋 Detailed Fix Plan

### Fix 1: Update package.json Scripts

**Purpose:** Make it clearer what runs in dev vs production

**Current:**
```json
"scripts": {
  "dev": "node server.js",
  "build": "next build",
  "start": "next start"
}
```

**Recommended:**
```json
"scripts": {
  "dev": "node server.js",
  "dev:vercel": "next dev",
  "build": "next build",
  "start": "next start",
  "vercel-build": "next build"
}
```

**Benefit:**
- `npm run dev` = Local HTTPS with Shopify CLI
- `npm run dev:vercel` = Standard Next.js dev (no HTTPS)
- Vercel automatically runs `build` and `start`

---

### Fix 2: Environment-Aware URL Handling

**How URLs Work:**

**Local Development (with Shopify CLI):**
```
SHOPIFY_APP_URL = https://[random].trycloudflare.com (set by CLI)
NEXT_PUBLIC_APP_URL = https://localhost:3000 (from .env)
App uses: SHOPIFY_APP_URL (tunnel)
```

**Production (Vercel):**
```
SHOPIFY_APP_URL = undefined (no CLI)
NEXT_PUBLIC_APP_URL = https://shopify-receptionist.vercel.app
App uses: NEXT_PUBLIC_APP_URL
```

**Current Code (lib/env.ts):**
```typescript
NEXT_PUBLIC_APP_URL: getAppUrl(process.env)  // Picks correct URL
```

**Status:** ✅ Already handles both environments correctly!

---

### Fix 3: Vercel-Specific Configuration (Optional)

**Create vercel.json:**

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev:vercel",
  "framework": "nextjs",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Status:** Optional (Vercel auto-detects Next.js)

---

## 🔄 How Both Environments Work

### Local Development Flow

```
1. Run: shopify app dev
   → Creates tunnel: https://[random].trycloudflare.com
   → Sets SHOPIFY_APP_URL

2. Run: npm run dev (in separate terminal)
   → Uses server.js (HTTPS)
   → Listens on localhost:3000
   → Tunnel forwards to localhost:3000

3. Access: Via Shopify Admin
   → Loads through tunnel URL
   → OAuth callback goes through tunnel
   → Function calls use tunnel URL
```

### Production (Vercel) Flow

```
1. Deploy: Push to GitHub
   → Vercel auto-deploys
   → Uses standard Next.js (ignores server.js)
   → Serves on https://shopify-receptionist.vercel.app

2. Access: Via Shopify Admin
   → Loads directly from Vercel
   → OAuth callback goes to Vercel
   → Function calls use Vercel URL

3. No tunnel needed!
   → Direct public HTTPS
   → Vercel handles SSL automatically
   → Always same URL (stable)
```

---

## ✅ What Vercel Handles Automatically

- ✅ **HTTPS/SSL certificates** - Automatic, always valid
- ✅ **Custom domains** - If you add one
- ✅ **Environment variables** - Set in dashboard
- ✅ **Build & deploy** - On every push to main
- ✅ **Edge caching** - Fast global delivery
- ✅ **Logs & monitoring** - Built-in dashboard

**You don't need:**
- ❌ server.js (Vercel uses standard Next.js)
- ❌ Cloudflare tunnel (Vercel URL is public)
- ❌ Self-signed certificates (Vercel provides real SSL)
- ❌ Port forwarding or ngrok
- ❌ Manual HTTPS configuration

---

## 🎯 Summary

### Already Good ✅
- Code structure
- Environment variable handling
- No hardcoded URLs
- Currently deployed

### Needs Configuration ⚠️
1. Environment variables in Vercel
2. Shopify Partner Dashboard URLs
3. Vapi assistant serverUrl

### Nice to Have 📝
- Update package.json scripts for clarity
- Add vercel.json (optional)

---

## Next Steps

1. **Verify environment variables** (Priority 1)
2. **Update external services** (Priority 2) 
3. **Test end-to-end** (Priority 3)

See POST_DEPLOYMENT_CHECKLIST.md for detailed steps.

