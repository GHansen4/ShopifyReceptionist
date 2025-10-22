# Authorization Code Reuse - Prevention & Fix

## The Problem You Encountered

```
❌ Authorization code expired or already used
❌ The authorization code is invalid or has expired
❌ Cannot exchange code for token
```

You tried to reuse an authorization code from a previous OAuth attempt, which doesn't work because:

1. **Single-Use Only** - Each authorization code can be used ONCE
2. **Time Expiration** - Codes expire after ~10 minutes
3. **Tunnel Changes** - When your Cloudflare tunnel URL changes, you need a new OAuth flow
4. **URL Mismatch** - The redirect URL must match exactly what's registered in Shopify

---

## What Changed?

### **Scenario: Old Tunnel vs New Tunnel**

```
Old Setup:
1. Tunnel URL: santa-jenny-frequencies-replacement.trycloudflare.com
2. Started OAuth → Got code: 40cbe03761959d2b91b4b23d665799ef
3. Tunnel CHANGES to: mapping-main-pleasant-yarn.trycloudflare.com
4. Tried to use old code ← FAILS! ❌
   - Code was for OLD tunnel
   - Redirect URL now different
   - Code already expired (>10 minutes)

New Setup:
1. Update Shopify config with NEW tunnel URL
2. Start FRESH OAuth flow
3. Get NEW authorization code
4. Callback succeeds ✅
```

---

## Correct OAuth Flow

### **Step 1: Update Shopify Configuration**

**File: `shopify.app.toml`**
```toml
application_url = "https://mapping-main-pleasant-yarn.trycloudflare.com"

[auth]
redirect_urls = [
  "https://mapping-main-pleasant-yarn.trycloudflare.com/api/auth/callback",
  "http://localhost:3000/api/auth/callback"
]
```

✅ This has already been updated!

### **Step 2: Start Fresh OAuth Flow**

**DO NOT** use the old callback URL from your browser history!

Instead:

1. **Clear browser cache/history** (or use incognito mode)
2. **Visit the HOME page** of your new tunnel:
   ```
   https://mapping-main-pleasant-yarn.trycloudflare.com/
   ```
3. **Click "Install App"** or OAuth button
4. **Authorize in Shopify** (this generates a NEW code)
5. **Callback redirects** to your app with fresh code ✅

### **Step 3: OAuth Callback Succeeds**

The callback route will:
1. ✅ Validate the fresh authorization code
2. ✅ Exchange it for an access token
3. ✅ Save the shop to database
4. ✅ Create authenticated session

---

## Console Output Improvements

### **Detecting Authorization Code Reuse**

New error message:

```
[Callback] ❌ Token exchange failed!
[Callback] Error message: invalid_request - The authorization code is invalid or has expired

[Callback] 💡 HINT: Authorization code reuse detected
[Callback] 💡 ACTION: Start fresh OAuth from https://mapping-main-pleasant-yarn.trycloudflare.com
[Callback] ⚠️  Authorization code expired or already used. 
Authorization codes can only be used ONCE and expire after ~10 minutes. 
Please start a fresh OAuth flow from the beginning.
```

### **Successful OAuth (New)**

```
[OAuth Init] ✅ Nonce stored in state manager for shop: always-on-apps.myshopify.com
[OAuth Init] ✅ Cookies set (backup mechanism)

[Callback] ✅ Nonce retrieved from state manager
[Callback] ✅ OAuth state validation PASSED
[Callback] Exchanging code for token...
[Callback] Token exchange successful
[Callback] Shop upserted successfully
[Callback] Cleaned up OAuth state for shop: always-on-apps.myshopify.com
```

---

## Why Authorization Codes Expire

**Shopify Security Design:**

| Aspect | Details |
|--------|---------|
| **Validity** | ~10 minutes from generation |
| **Use Count** | Single-use only |
| **Purpose** | Prevent code interception attacks |
| **Reuse Attempts** | Always rejected with `invalid_request` |

---

## Common Mistakes to Avoid

❌ **DO NOT**: Bookmark or save the callback URL  
❌ **DO NOT**: Use browser back button after OAuth  
❌ **DO NOT**: Try the old tunnel's callback URL  
❌ **DO NOT**: Wait more than 10 minutes to complete OAuth  

✅ **DO**: Always start from the home page (`/`)  
✅ **DO**: Complete OAuth flow in one session  
✅ **DO**: Use incognito/private mode if having cookie issues  
✅ **DO**: Check the `.env` has correct Shopify API credentials  

---

## Fix Summary

### **Files Fixed**

1. **`src/app/api/auth/callback/route.ts`**
   - ✅ Added import for `getOAuthState` and `deleteOAuthState`
   - ✅ Enhanced error detection for reused codes
   - ✅ Better error messages with action items
   - ✅ Auto-cleanup of OAuth state after successful validation

2. **`shopify.app.toml`**
   - ✅ Updated `application_url` to new tunnel
   - ✅ Updated `redirect_urls` to include `/api/auth/callback` path
   - ✅ Both localhost and tunnel URLs included

### **Improvements**

- ✅ Detects code reuse and expired codes
- ✅ Tells user to start fresh OAuth
- ✅ Shows the correct URL to visit
- ✅ Cleans up OAuth state after use
- ✅ Better diagnostics in console

---

## Testing the Fix

### **Test Successful OAuth**

1. **Visit home page:**
   ```
   https://mapping-main-pleasant-yarn.trycloudflare.com/
   ```

2. **Click "Install App"** (or start OAuth)

3. **Complete Shopify authorization**

4. **Check console for:**
   ```
   [Callback] ✅ OAuth state validation PASSED
   [Callback] Token exchange successful
   [Callback] Shop upserted successfully
   [Callback] Cleaned up OAuth state for shop
   ```

### **Test Code Reuse Detection**

1. **Old callback URL** (from browser history):
   ```
   https://mapping-main-pleasant-yarn.trycloudflare.com/api/auth/callback?code=OLD_CODE&...
   ```

2. **Console shows:**
   ```
   [Callback] 💡 HINT: Authorization code reuse detected
   [Callback] ⚠️  Authorization code expired or already used
   ```

3. **User sees error** with instruction to start fresh

---

## Authorization Code Lifecycle

```
Timeline:
1. OAuth Init (t=0)
   ↓ Generate nonce
   ↓ Store in state manager
   ↓ Redirect to Shopify
   
2. User Authorizes (t=0-2min)
   ↓ Shopify generates code (valid for ~10 minutes)
   ↓ Shopify redirects back with code
   
3. Callback (t=2-5min) ✅
   ↓ Code still fresh
   ↓ Exchange succeeds
   ↓ Session created
   
4. Reuse Attempt (t=11+ min or reuse) ❌
   ↓ Code expired or already used
   ↓ Shopify returns error
   ↓ User must start fresh
```

---

## OAuth State Management

**What Happens Behind the Scenes:**

1. **OAuth Init**
   ```
   storeOAuthState('always-on-apps.myshopify.com', nonce)
   ↓ Stored in memory (Layer 1)
   ↓ Also in secure cookie (Layer 2)
   ```

2. **Callback Validation**
   ```
   const nonce = getOAuthState('always-on-apps.myshopify.com')
   ↓ Tries memory first (usually works)
   ↓ Falls back to cookie (if server restarted)
   ↓ Validates: nonce === state
   ```

3. **After Success**
   ```
   deleteOAuthState('always-on-apps.myshopify.com')
   ↓ Cleans up memory
   ↓ Prevents accidental reuse
   ```

---

## Production Considerations

### **Current (Development)**
- ✅ In-memory + cookie-based state
- ✅ Auto-cleanup of OAuth states
- ✅ Helpful error messages
- ✅ Code reuse detection

### **For Production**
- Consider Redis for distributed state
- Add rate limiting for reuse attempts
- Monitor failed OAuth attempts
- Alert on suspicious patterns

---

## Next Steps

1. ✅ **Authorization code reuse detection added**
2. ✅ **Shopify config updated with new tunnel URL**
3. **Restart dev server** to load new code
4. **Start fresh OAuth flow** from `https://mapping-main-pleasant-yarn.trycloudflare.com/`
5. **Should complete successfully** ✅

---

## Quick Reference

| Scenario | Action |
|----------|--------|
| Code expired (>10 min) | Start fresh OAuth |
| Tunnel URL changed | Update Shopify config, start fresh |
| Tried to reuse code | Start fresh OAuth |
| Server restarted mid-flow | Cookie fallback handles it |
| Multiple shops testing | Fresh OAuth for each shop |

**Remember: Each OAuth flow gets a NEW, fresh authorization code. Always start from the home page!** 🔄
