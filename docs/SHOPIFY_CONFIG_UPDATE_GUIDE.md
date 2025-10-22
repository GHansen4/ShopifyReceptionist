# Shopify Configuration Update Guide

## 📝 Understanding Shopify CLI Configuration

For Shopify CLI apps, configuration is managed in `shopify.app.toml`, not manually in the Partner Dashboard.

---

## ✅ What We Just Updated

### `shopify.app.toml` Changes:

```toml
# OLD (localhost):
application_url = "https://localhost:3000"

# NEW (Vercel production):
application_url = "https://shopify-receptionist.vercel.app"
```

```toml
# OLD (localhost only):
redirect_urls = [
  "https://localhost:3000/api/auth/callback",
  "https://localhost/api/auth/callback",
  "http://localhost:3000/api/auth/callback"
]

# NEW (production + localhost):
redirect_urls = [
  # Production (Vercel)
  "https://shopify-receptionist.vercel.app/api/auth/callback",
  "https://shopify-receptionist.vercel.app/api/auth",
  # Local development (kept for local testing)
  "https://localhost:3000/api/auth/callback",
  "https://localhost/api/auth/callback",
  "http://localhost:3000/api/auth/callback"
]
```

---

## 🔄 How to Sync Configuration to Shopify

### Method 1: Automatic Sync (Recommended)

The configuration automatically syncs when you run:

```bash
shopify app dev
```

**When you start the development server, Shopify CLI will:**
1. Read `shopify.app.toml`
2. Update Partner Dashboard with the configuration
3. Override `application_url` with the tunnel URL (for local dev only)

**But for production configuration to take effect:**
- You don't need to run `shopify app dev`
- The configuration is already in the file
- Shopify will use it when merchants access your app

### Method 2: Deploy Configuration (For Apps with Extensions)

If you have app extensions (you don't currently), you would run:

```bash
shopify app deploy
```

**This creates an app version with:**
- Your configuration from `shopify.app.toml`
- Any app extensions (UI extensions, functions, etc.)

**Note:** Your app is a standalone web app without Shopify extensions, so you don't need to deploy.

---

## 🎯 What Happens Now

### When Merchants Access Your App:

1. **Merchant clicks your app in Shopify Admin**
2. **Shopify loads:** `https://shopify-receptionist.vercel.app` (from `application_url`)
3. **If OAuth needed, redirects to:** `https://shopify-receptionist.vercel.app/api/auth/callback` (from `redirect_urls`)

### For Local Development:

When you run `shopify app dev`:
1. **Shopify CLI creates tunnel:** `https://[random].trycloudflare.com`
2. **Temporarily overrides** `application_url` with tunnel
3. **Your redirect URLs remain** (including localhost)
4. **You can test locally** with the tunnel URL

---

## ✅ Verification Steps

### Step 1: Check Partner Dashboard

1. Go to: https://partners.shopify.com
2. Navigate to: **Apps → Always AI Call Receptionist → Configuration**
3. **Verify you see:**
   - **App URL:** `https://shopify-receptionist.vercel.app`
   - **Allowed redirect URLs:** Include both Vercel and localhost URLs

**Note:** If you don't see the changes, they'll sync next time you run `shopify app dev` or when a merchant accesses the app.

### Step 2: Test App Access

1. Go to: https://always-ai-dev-store.myshopify.com/admin
2. Click **Apps** → **Always AI Call Receptionist**
3. **Expected:** App loads from Vercel URL ✅

---

## 🔧 Troubleshooting

### Issue: Configuration Not Showing in Partner Dashboard

**Solution:** Run the following to force a sync:

```bash
shopify app dev
```

Then press `Ctrl+C` to stop. The configuration will be synced.

### Issue: "Invalid redirect_uri" Error

**Cause:** Redirect URL not in `shopify.app.toml`

**Solution:** Ensure your callback URL is in the `redirect_urls` array:

```toml
redirect_urls = [
  "https://shopify-receptionist.vercel.app/api/auth/callback",
  # ... other URLs
]
```

### Issue: App Still Using Localhost

**Cause:** Local `shopify app dev` is running and overriding the URL

**Solution:** 
- Stop `shopify app dev` if it's running
- Access app directly from Shopify Admin (not through CLI)

---

## 📊 Configuration Priority

### Local Development:
```
shopify app dev (tunnel URL)  >  shopify.app.toml
```
The CLI tunnel URL takes priority

### Production:
```
shopify.app.toml  >  Partner Dashboard
```
The TOML file is the source of truth

---

## 🎯 Current Status

### ✅ Completed:
- [x] Updated `application_url` to Vercel URL
- [x] Added Vercel URLs to `redirect_urls`
- [x] Kept localhost URLs for local development

### ⏳ Next Steps:
1. **Configuration will automatically sync** (no action needed)
2. **Or manually sync** by running: `shopify app dev` (then stop it)
3. **Continue with:** Vercel environment variables setup
4. **Then:** Test app access from Shopify Admin

---

## 📚 Official Documentation

- [Shopify CLI Configuration](https://shopify.dev/docs/apps/tools/cli/configuration)
- [App Configuration Reference](https://shopify.dev/docs/api/shopify-cli/app/app-toml)
- [OAuth Configuration](https://shopify.dev/docs/apps/auth/oauth)

---

## 💡 Key Takeaways

1. **`shopify.app.toml` is the source of truth** for app configuration
2. **Don't manually edit Partner Dashboard** - it will be overwritten by TOML
3. **Configuration syncs automatically** when you use Shopify CLI
4. **For production, just update the TOML file** (done ✅)
5. **Merchants will immediately see changes** when they access your app

---

## ✅ You're All Set!

Your configuration is updated. The changes will automatically take effect when:
- Merchants access your app from Shopify Admin
- You run `shopify app dev` (which syncs config)

**Next:** Configure Vercel environment variables to make the app functional!

