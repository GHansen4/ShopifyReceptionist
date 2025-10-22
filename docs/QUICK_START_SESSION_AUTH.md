# 🚀 Quick Start - Session-Based Authentication

## ⚡ 3-Step Setup

### 1️⃣ Run Database Migration

Open **Supabase SQL Editor** and paste this entire file:

```
database/002_shopify_sessions.sql
```

Click **Run** ▶️

**Verify:**
```sql
SELECT COUNT(*) FROM shopify_sessions;
-- Should return: 0 (table exists, no sessions yet)
```

---

### 2️⃣ Start Your App

```bash
npm run dev
```

**Expected output:**
```
[Shopify Client] ✅ Initialized with session storage
[Shopify Client] API Version: 2025-01
[Shopify Client] Host: https://localhost:3000
```

---

### 3️⃣ Complete OAuth Flow

Visit in browser:
```
https://localhost:3000/api/auth?shop=always-ai-dev-store.myshopify.com
```

**Expected:**
1. Redirects to Shopify OAuth page ✅
2. Click "Install" ✅
3. Redirects back to your app ✅
4. **Logs show:**
```
[OAuth] ✅ OAuth initiated by Shopify library
[OAuth Callback] ✅ OAuth completed successfully
[SessionStorage] ✅ Session stored successfully
```

**Verify session created:**
```sql
SELECT id, shop, access_token IS NOT NULL as has_token 
FROM shopify_sessions;

-- Expected result:
-- id: offline_always-ai-dev-store.myshopify.com
-- shop: always-ai-dev-store.myshopify.com
-- has_token: true ✅
```

---

## 🧪 Test API Call

Visit in browser:
```
https://localhost:3000/api/shopify/products?shop=always-ai-dev-store.myshopify.com&limit=5
```

**Expected:**
- Returns products JSON ✅
- Logs show:
```
[Shopify Products] ✅ Authenticated
[Shopify Products] ✅ Fetched 5 products
```

---

## ✅ You're Done!

Your app now uses Shopify's prescribed session-based authentication:
- ✅ Tokens managed automatically
- ✅ Automatic refresh
- ✅ Works with Shopify CLI
- ✅ 85% less code

---

## 🐛 Troubleshooting

### "Table shopify_sessions does not exist"
👉 Run migration: `database/002_shopify_sessions.sql`

### "SUPABASE_SERVICE_ROLE_KEY is required"
👉 Add to `.env`:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Get from: Supabase Dashboard → Settings → API → `service_role` key

### "No session found"
👉 Complete OAuth flow first: `/api/auth?shop=<shop>`

---

## 📚 Next Steps

- Read: `SESSION_AUTH_IMPLEMENTATION_COMPLETE.md` for full details
- Check: `CORRECT_VS_WRONG_APPROACH.md` to see what changed
- Migrate: Other API routes to use `authenticate.admin()`
- Deploy: Test in production when ready

---

**Need help?** Check the comprehensive docs:
- `SESSION_AUTH_IMPLEMENTATION_COMPLETE.md`
- `DATABASE_MIGRATION_GUIDE.md`
- `ARCHITECTURE_FIX_PLAN.md`

🎉 **Happy coding!**

