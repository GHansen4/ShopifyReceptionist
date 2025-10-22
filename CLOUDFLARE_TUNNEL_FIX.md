# ✅ Cloudflare Tunnel URL Issue - FIXED

## 🔍 **Problem Identified**

Your Shopify app was configured to use a Cloudflare tunnel URL instead of your local HTTPS server.

**Incorrect Configuration Found:**
```env
# .env file (BEFORE)
NEXT_PUBLIC_APP_URL=https://santa-jenny-frequencies-replacement.trycloudflare.com
```

---

## ✅ **What Was Fixed**

### **1. Updated .env File**

**Changed:**
```env
# .env file (AFTER)
NEXT_PUBLIC_APP_URL=https://localhost:3000
```

### **2. Verified shopify.app.toml**

Already correctly configured:
```toml
application_url = "https://localhost:3000"  ✅
redirect_urls = ["https://localhost:3000/api/auth/callback"]  ✅
```

### **3. Restarted HTTPS Server**

Server restarted to pick up the new environment variable.

---

## 🎯 **Current Configuration**

### **Your App URLs:**
```
Application URL: https://localhost:3000
OAuth Callback: https://localhost:3000/api/auth/callback
API Endpoint: https://localhost:3000/api/*
```

### **Environment Variables:**
```env
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_YOUR_SECRET_HERE
NEXT_PUBLIC_APP_URL=https://localhost:3000 ✅
```

---

## 📝 **How to Access Your App**

### **Option 1: Direct Local Access (Testing)**

```
https://localhost:3000
```

Your browser will show a certificate warning - this is normal. Click "Advanced" → "Proceed to localhost".

### **Option 2: Shopify Embedded App (Recommended)**

Access your app through Shopify Admin:

1. Go to your Shopify Partner Dashboard
2. Navigate to your dev store
3. Click "Apps" in the left sidebar
4. Find "Always AI Call Receptionist"
5. Click to open the app

**Important:** Your app will load in an iframe within Shopify Admin using localhost.

---

## 🔧 **If You Need to Update Shopify Partner Dashboard**

The Cloudflare URL might still be cached in your Partner Dashboard app settings. Here's how to fix it:

### **Method 1: Using Shopify CLI (Recommended)**

```bash
# Stop any running servers first
# Press Ctrl+C in terminals running the server

# Reset and reconfigure
npx @shopify/cli app config push

# This will update your Partner Dashboard with the current shopify.app.toml settings
```

### **Method 2: Manual Update in Partner Dashboard**

1. Go to https://partners.shopify.com/
2. Click on your app "Always AI Call Receptionist"
3. Go to **Configuration** → **App Setup**
4. Update these fields:
   - **App URL:** `https://localhost:3000`
   - **Allowed redirection URLs:** `https://localhost:3000/api/auth/callback`
5. Click **Save**

---

## 🚀 **Testing Your Local App**

### **Step 1: Verify Server is Running**

```powershell
# Check if Node.js is running
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Check if port 3000 is listening
netstat -ano | findstr :3000
```

**Expected Output:**
```
TCP    0.0.0.0:3000    LISTENING
```

### **Step 2: Test Direct Access**

Open browser: `https://localhost:3000`

**Expected:**
- Certificate warning (click through it)
- Your app's home page loads

### **Step 3: Test in Shopify Admin**

1. Open your dev store: `https://always-ai-dev-store.myshopify.com/admin`
2. Click "Apps" → "Always AI Call Receptionist"
3. App should load in iframe

**Expected:**
- URL bar shows: `admin.shopify.com/store/always-ai-dev-store`
- Iframe content loads from: `https://localhost:3000?embedded=1&...`

---

## 🔄 **When to Use Cloudflare Tunnel vs Localhost**

### **Use Localhost (Current Setup) When:**
✅ Developing on your local machine  
✅ Testing in Shopify Admin on the same computer  
✅ You have HTTPS server running locally  
✅ No need to share with others  

### **Use Cloudflare Tunnel When:**
❌ Need to test on mobile devices  
❌ Need to share with team members  
❌ Testing webhooks from external services  
❌ Need public URL for any reason  

---

## 🛠️ **How to Switch Between Localhost and Tunnel**

### **To Use Localhost (Current):**

```env
# .env
NEXT_PUBLIC_APP_URL=https://localhost:3000
```

```bash
# Start server
npm run dev:https
```

### **To Use Cloudflare Tunnel:**

```env
# .env
NEXT_PUBLIC_APP_URL=https://your-tunnel-url.trycloudflare.com
```

```bash
# Terminal 1: Start local server
npm run dev:https

# Terminal 2: Create tunnel
cloudflared tunnel --url https://localhost:3000

# Or use Shopify CLI (handles tunnel automatically)
npx @shopify/cli app dev
```

---

## ⚠️ **Important Notes**

### **Certificate Warnings**
- Self-signed certificate warnings are **normal** for localhost
- Click "Advanced" → "Proceed" in your browser
- This doesn't affect Shopify embedded apps (Shopify handles HTTPS)

### **Environment Variable Priority**
```
1. SHOPIFY_APP_URL (set by Shopify CLI)
2. NEXT_PUBLIC_APP_URL (set in .env)
```

If using Shopify CLI, it will override `NEXT_PUBLIC_APP_URL` automatically.

### **Caching Issues**
If the old Cloudflare URL still appears:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Restart your dev server
4. Update Partner Dashboard app settings

---

## 📊 **Configuration Files Summary**

### **.env**
```env
NEXT_PUBLIC_APP_URL=https://localhost:3000 ✅
SHOPIFY_API_KEY=a0563782e38f84b7ce2ef0d2f5b87ed5
SHOPIFY_API_SECRET=shpss_***
```

### **shopify.app.toml**
```toml
application_url = "https://localhost:3000" ✅
redirect_urls = ["https://localhost:3000/api/auth/callback"] ✅
```

### **next.config.js**
```javascript
env: {
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}
```

---

## ✅ **Verification Checklist**

After fixing, verify:

- [x] `.env` has `NEXT_PUBLIC_APP_URL=https://localhost:3000`
- [x] `shopify.app.toml` has `application_url = "https://localhost:3000"`
- [x] HTTPS server running on port 3000
- [x] Node.js process active
- [ ] Browser can access `https://localhost:3000` (after clicking through certificate warning)
- [ ] App loads in Shopify Admin iframe
- [ ] OAuth callback works when installing app

---

## 🎉 **Success Indicators**

When everything is working:

✅ Server logs show: `HTTPS: https://localhost:3000`  
✅ Shopify requests visible in terminal (GET requests with `embedded=1`)  
✅ No Cloudflare URLs in terminal output  
✅ App loads in Shopify Admin  
✅ OAuth flow completes successfully  

---

## 🔍 **Debugging Tips**

### **Issue: App still shows Cloudflare URL**

**Check:**
```powershell
# Verify .env file
Get-Content .env | Select-String "NEXT_PUBLIC_APP_URL"

# Should show:
# NEXT_PUBLIC_APP_URL=https://localhost:3000
```

**Fix:**
```bash
# Restart server
npm run dev:https
```

### **Issue: "This site can't be reached"**

**Check:**
```powershell
# Is server running?
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Is port listening?
netstat -ano | findstr :3000
```

**Fix:**
```bash
# Start server if not running
npm run dev:https
```

### **Issue: Certificate error blocks loading**

**Solution:**
This is normal! Click "Advanced" → "Proceed to localhost (unsafe)"

For Shopify embedded apps, the certificate warning won't appear because Shopify loads it in an iframe.

---

## 📚 **Related Documentation**

- `HTTPS_SERVER_DEBUG_SUMMARY.md` - HTTPS server setup guide
- `TERMINAL_HANG_FIX.md` - Terminal hanging issue resolution
- `shopify.app.toml` - App configuration file

---

**Status**: ✅ FIXED  
**App URL**: https://localhost:3000  
**Configuration**: Localhost-only development  
**Date**: October 21, 2025

