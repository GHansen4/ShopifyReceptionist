# Debug: Vapi Still Using Localhost Despite Environment Variable

## 🚨 Problem

Even though `NEXT_PUBLIC_APP_URL` is set to `https://shopify-receptionist.vercel.app` in Vercel, phone provisioning still fails with:

```
serverUrl must be a valid URL... but found https://localhost:3000/api/vapi/functions
```

## 🔍 Debugging Steps

### Step 1: Enhanced Logging Added

**File:** `src/app/api/vapi/test/provision/route.ts`

**Added comprehensive debugging:**
```typescript
// DEBUG: Check individual environment variables
console.log(`[${requestId}] 🔍 Raw Environment Variables:`);
console.log(`[${requestId}]    process.env.NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
console.log(`[${requestId}]    process.env.VERCEL_URL: ${process.env.VERCEL_URL}`);
console.log(`[${requestId}]    process.env.SHOPIFY_APP_URL: ${process.env.SHOPIFY_APP_URL}`);
console.log(`[${requestId}]    process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[${requestId}]    process.env.VERCEL: ${process.env.VERCEL}`);
console.log(`[${requestId}]    process.env.VERCEL_ENV: ${process.env.VERCEL_ENV}`);

console.log(`[${requestId}] 🔍 URL Resolution:`);
console.log(`[${requestId}]    getAppUrl() result: ${getAppUrl()}`);
console.log(`[${requestId}]    getVapiFunctionsUrl() result: ${getVapiFunctionsUrl()}`);
console.log(`[${requestId}]    Final App URL: ${serverBaseUrl}`);
console.log(`[${requestId}]    Final Function URL: ${functionUrl}`);
```

### Step 2: Test the Debugging

**After deployment, test phone provisioning and check Vercel logs for:**

**Expected Output (if working):**
```javascript
[requestId] 🔍 Raw Environment Variables:
[requestId]    process.env.NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[requestId]    process.env.VERCEL_URL: shopify-receptionist.vercel.app
[requestId]    process.env.SHOPIFY_APP_URL: undefined
[requestId]    process.env.NODE_ENV: production
[requestId]    process.env.VERCEL: 1
[requestId]    process.env.VERCEL_ENV: production

[requestId] 🔍 URL Resolution:
[requestId]    getAppUrl() result: https://shopify-receptionist.vercel.app
[requestId]    getVapiFunctionsUrl() result: https://shopify-receptionist.vercel.app/api/vapi/functions
[requestId]    Final App URL: https://shopify-receptionist.vercel.app
[requestId]    Final Function URL: https://shopify-receptionist.vercel.app/api/vapi/functions
```

**If Still Broken (localhost):**
```javascript
[requestId] 🔍 Raw Environment Variables:
[requestId]    process.env.NEXT_PUBLIC_APP_URL: undefined
[requestId]    process.env.VERCEL_URL: shopify-receptionist.vercel.app
[requestId]    process.env.SHOPIFY_APP_URL: undefined
[requestId]    process.env.NODE_ENV: production
[requestId]    process.env.VERCEL: 1
[requestId]    process.env.VERCEL_ENV: production

[requestId] 🔍 URL Resolution:
[requestId]    getAppUrl() result: https://shopify-receptionist.vercel.app
[requestId]    getVapiFunctionsUrl() result: https://shopify-receptionist.vercel.app/api/vapi/functions
[requestId]    Final App URL: https://localhost:3000  ← PROBLEM!
[requestId]    Final Function URL: https://localhost:3000/api/vapi/functions
```

---

## 🔧 Possible Issues & Solutions

### Issue 1: Environment Variable Not Set Correctly

**Symptom:** `process.env.NEXT_PUBLIC_APP_URL: undefined`

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Verify `NEXT_PUBLIC_APP_URL` is set for **Production**
3. Value should be: `https://shopify-receptionist.vercel.app`
4. Redeploy after adding

### Issue 2: Build Cache Issues

**Symptom:** Variable set but not accessible at runtime

**Fix:**
1. Vercel → Settings → General → "Clear Build Cache"
2. Deployments → Latest → ⋯ → Redeploy
3. Uncheck "Use existing Build Cache"

### Issue 3: Variable Name Typo

**Symptom:** Variable not appearing in logs

**Fix:** Check exact spelling: `NEXT_PUBLIC_APP_URL`

### Issue 4: Next.js Not Including Variable

**Symptom:** Variable set in Vercel but undefined in code

**Fix:** Already added to `next.config.js`:
```javascript
env: {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}
```

### Issue 5: Code Using Wrong Variable

**Symptom:** Code is checking wrong environment variable

**Fix:** The code is correct - it uses `getAppUrl()` which checks `NEXT_PUBLIC_APP_URL` first

---

## 🧪 Testing Process

### Step 1: Deploy with Enhanced Logging

1. **Commit and push** the enhanced debugging code
2. **Wait for Vercel deployment** to complete
3. **Check deployment logs** for any build errors

### Step 2: Test Phone Provisioning

1. Go to: https://shopify-receptionist.vercel.app/test/vapi
2. Click **"Provision Test Phone Number"**
3. **Check Vercel logs** (Functions tab) for the debug output

### Step 3: Analyze the Logs

**Look for:**
- What `process.env.NEXT_PUBLIC_APP_URL` shows
- What `getAppUrl()` returns
- What `Final Function URL` shows
- Any warnings about localhost

---

## 📊 Expected Results

### If Working Correctly:
```javascript
[requestId]    process.env.NEXT_PUBLIC_APP_URL: https://shopify-receptionist.vercel.app
[requestId]    getAppUrl() result: https://shopify-receptionist.vercel.app
[requestId]    Final Function URL: https://shopify-receptionist.vercel.app/api/vapi/functions
```

### If Still Broken:
```javascript
[requestId]    process.env.NEXT_PUBLIC_APP_URL: undefined
[requestId]    getAppUrl() result: https://localhost:3000
[requestId]    Final Function URL: https://localhost:3000/api/vapi/functions
```

---

## 🎯 Next Steps

### Immediate:
1. **Deploy the enhanced debugging code**
2. **Test phone provisioning**
3. **Check Vercel logs** for debug output
4. **Identify the exact issue** from the logs

### Based on Logs:
- **If `NEXT_PUBLIC_APP_URL` is undefined:** Check Vercel environment variable settings
- **If `NEXT_PUBLIC_APP_URL` is set but `getAppUrl()` returns localhost:** Check URL helper logic
- **If everything looks correct but still fails:** Check for other hardcoded URLs

---

## 🚀 Quick Action

**Right now:**
1. **Deploy the debugging code** (already done)
2. **Test phone provisioning** and check logs
3. **Share the debug output** to identify the exact issue

**The enhanced logging will show us exactly what's happening with the environment variables!** 🔍
