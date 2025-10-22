# Shopify Partner Dashboard Configuration for Vercel

## 📋 Configuration Checklist

Configure your Shopify app to use the Vercel production URL instead of localhost.

---

## 🔗 Step-by-Step Instructions

### Step 1: Access Your App Configuration

1. Go to **[Shopify Partners Dashboard](https://partners.shopify.com/)**
2. Click **Apps** in the left sidebar
3. Find and click **"Always AI Call Receptionist"** (or your app name)
4. Click **"Configuration"** tab

---

### Step 2: Update App URLs Section

Look for the **"App URL"** section and update:

#### App URL
```
https://shopify-receptionist.vercel.app
```

**What this does:** 
- This is where Shopify loads your app's embedded interface
- Must be HTTPS
- No trailing slash

---

### Step 3: Update Allowed Redirection URLs

Look for **"Allowed redirection URL(s)"** section:

#### Primary OAuth Callback URL (REQUIRED)
```
https://shopify-receptionist.vercel.app/api/auth/callback
```

#### Additional URLs (Recommended for compatibility)
```
https://shopify-receptionist.vercel.app/api/auth
https://shopify-receptionist.vercel.app/
```

**Format:**
- One URL per line
- Must be HTTPS
- Must match your actual callback route
- No trailing slashes on paths

**What these do:**
- `/api/auth/callback` - Where Shopify redirects after OAuth authorization
- `/api/auth` - Your OAuth initiation endpoint
- `/` - Root redirect (fallback)

---

### Step 4: App Proxy (Optional - if using product data endpoints)

If you're using app proxy features:

#### Subpath
```
tools/receptionist
```

#### Proxy URL
```
https://shopify-receptionist.vercel.app
```

**Note:** Only configure this if you're using Shopify App Proxy features for customer-facing pages.

---

### Step 5: GDPR Webhooks (Optional but Recommended)

Configure GDPR compliance webhooks:

#### Customer Data Request
```
https://shopify-receptionist.vercel.app/api/webhooks/customers/data_request
```

#### Customer Data Erasure
```
https://shopify-receptionist.vercel.app/api/webhooks/customers/redact
```

#### Shop Data Erasure
```
https://shopify-receptionist.vercel.app/api/webhooks/shop/redact
```

**Note:** Only required if you store customer data. Your app uses Shopify's session storage, so this may not be necessary.

---

### Step 6: Save Configuration

1. Review all changes
2. Click **"Save"** button at the bottom
3. Wait for confirmation message

---

## ✅ Configuration Summary

After configuration, your settings should be:

| Field | Value |
|-------|-------|
| **App URL** | `https://shopify-receptionist.vercel.app` |
| **OAuth Callback** | `https://shopify-receptionist.vercel.app/api/auth/callback` |
| **Environment** | Production (HTTPS) |

---

## 🧪 Testing Your Configuration

### Test 1: Access App from Shopify Admin

1. Go to your development store: `https://always-ai-dev-store.myshopify.com/admin`
2. Click **"Apps"** in the left sidebar
3. Click your app name
4. You should see your app load in the iframe ✅

**If it fails:**
- Check Vercel deployment is "Ready"
- Verify App URL in Shopify Partners matches exactly
- Check browser console for errors

---

### Test 2: OAuth Flow

1. If prompted to authorize, click **"Install"**
2. You should be redirected to your callback URL
3. Then back to your app dashboard
4. No errors should appear ✅

**If it fails:**
- Check redirect URLs in Shopify Partners
- Verify callback route exists: `/api/auth/callback`
- Check Vercel logs for OAuth errors

---

### Test 3: API Calls

1. Navigate to different pages in your app
2. Check that product data loads
3. Verify Vapi integration works
4. No CORS or authentication errors ✅

---

## 🔧 Troubleshooting

### Issue: "Invalid redirect_uri"

**Cause:** Redirect URL doesn't match exactly

**Fix:**
1. Check Shopify Partner Dashboard redirect URLs
2. Ensure exact match (no trailing slash)
3. Must be HTTPS
4. Must match your callback route

**Example:**
```
✅ Correct: https://shopify-receptionist.vercel.app/api/auth/callback
❌ Wrong:   https://shopify-receptionist.vercel.app/api/auth/callback/
❌ Wrong:   http://shopify-receptionist.vercel.app/api/auth/callback
❌ Wrong:   https://shopify-receptionist.vercel.app/callback
```

---

### Issue: "Refused to display in frame"

**Cause:** CSP or X-Frame-Options headers blocking iframe

**Fix:**
- Already configured in `next.config.js` with:
  ```
  Content-Security-Policy: frame-ancestors https://*.myshopify.com
  ```
- Should work automatically

---

### Issue: App loads but no data

**Cause:** Missing environment variables in Vercel

**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify all required variables are set (see `VERCEL_ENV_VARS.txt`)
3. Redeploy after adding variables

---

## 📝 Important Notes

### Development vs Production

**Development (Shopify CLI):**
- Uses tunnel URL: `https://[random].trycloudflare.com`
- Changes on every restart
- For local testing only

**Production (Vercel):**
- Uses stable URL: `https://shopify-receptionist.vercel.app`
- Never changes
- For real customers

### Multiple Environments

If you want separate dev and production apps:

**Option 1: Two Apps**
- Create separate app in Partners for development
- Use tunnel URL for dev app
- Use Vercel URL for production app

**Option 2: Environment-Specific Branches**
- `development` branch → Dev environment
- `master` branch → Production environment
- Configure different URLs per environment

---

## 🎯 Next Steps After Configuration

1. ✅ **Shopify Partner Dashboard** - Configured (this guide)
2. 📝 **Vercel Environment Variables** - Configure next
3. 🤖 **Vapi Assistant serverUrl** - Update after Vercel config
4. 🧪 **Test deployment** - Verify everything works

---

## 🔐 Security Checklist

Before going live:

- [ ] App URL uses HTTPS
- [ ] Redirect URLs use HTTPS
- [ ] No localhost URLs in production config
- [ ] SHOPIFY_API_SECRET set in Vercel (never in code)
- [ ] SUPABASE_SERVICE_ROLE_KEY set in Vercel
- [ ] All sensitive keys in Vercel environment variables

---

## 📚 Reference Links

- [Shopify Partners Dashboard](https://partners.shopify.com/)
- [Shopify App Configuration Docs](https://shopify.dev/docs/apps/tools/cli/configuration)
- [OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Vercel Dashboard](https://vercel.com)

---

## ✅ Verification

After completing all steps, verify:

1. ✅ App URL is Vercel URL (not localhost)
2. ✅ OAuth callback URL is Vercel URL (not localhost)  
3. ✅ All URLs use HTTPS
4. ✅ Configuration saved in Partners Dashboard
5. ✅ App loads when accessed from Shopify Admin
6. ✅ OAuth flow completes successfully
7. ✅ API calls work (products, Vapi, etc.)

---

**You're ready for production!** 🎉

