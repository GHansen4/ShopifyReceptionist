# Vapi Phone Number Setup - Quick Start

**Your Phone Number:** `+1 (831) 200-2458`

---

## ✅ What I Just Fixed

I've updated the code to **link your phone number to new assistants** instead of trying to buy numbers via API (which doesn't work).

### Changes Made:

1. **Updated**: `src/app/api/vapi/test/provision/route.ts`
   - Now uses `number: "+18312002458"` in the API call
   - Links your pre-bought number to each test assistant
   - Immediate success (no async waiting needed!)

---

## 🚀 How to Test Right Now

### **Option 1: Test with Default (Hardcoded)**

The code now has your number hardcoded as a fallback:
```typescript
const VAPI_PHONE_NUMBER = process.env.VAPI_TEST_PHONE_NUMBER || '+18312002458';
```

**Just test it:**
1. Navigate to `/test/vapi` in your app
2. Click **"Provision Test Phone Number"**
3. You should see: `"Test receptionist created and linked to +18312002458! You can now call this number to test."`
4. Call `+1 (831) 200-2458` from your phone
5. The AI should answer!

---

### **Option 2: Add to Environment Variables (Recommended for Production)**

For cleaner code, add it to your `.env` file:

```bash
# .env
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Phone number bought from Vapi dashboard
VAPI_TEST_PHONE_NUMBER=+18312002458
```

Then restart your dev server:
```bash
npm run dev
```

---

## 📞 Expected Behavior

### **When You Call +1 (831) 200-2458:**

1. Phone rings
2. AI answers: *"Hello! You've reached the test receptionist for [Shop Name]. How can I help you today?"*
3. You can talk to it naturally
4. AI responds using Claude Sonnet 4.5
5. Voice is ElevenLabs Rachel (female, professional)

### **What the AI Can Do:**

- Answer questions about the test shop
- Provide basic product information
- Have natural conversations
- End call when you say "goodbye" or "thank you"

---

## 🐛 Troubleshooting

### **If you see an error when provisioning:**

Check the terminal logs for:
```
[xxxxx] ❌ Phone number linking failed: ...
```

**Common Issues:**

1. **"Number already linked to another assistant"**
   - Go to Vapi Dashboard → Phone Numbers
   - Unlink the number from the old assistant
   - Try again

2. **"Invalid phone number format"**
   - Ensure it's in E.164 format: `+18312002458` (no spaces, dashes, or parentheses)

3. **"Authentication failed"**
   - Check `VAPI_API_KEY` in your `.env` is correct
   - Restart dev server after changing `.env`

---

## 📋 For Production (Multiple Shops)

When you're ready to support multiple shops:

### **Step 1: Buy More Numbers**
1. Go to Vapi Dashboard
2. Buy more free US numbers (you get 10 free)
3. Document them in a spreadsheet

### **Step 2: Create a Phone Number Pool**

Add to your database:
```sql
CREATE TABLE phone_number_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available',  -- available, assigned
  assigned_to_shop_id UUID REFERENCES shops(id),
  assigned_at TIMESTAMP,
  vapi_phone_number_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Insert your numbers:
```sql
INSERT INTO phone_number_pool (phone_number) VALUES
  ('+18312002458'),
  ('+18312002459'),  -- Buy more from Vapi
  ('+18312002460'),
  ...;
```

### **Step 3: Update Provisioning Logic**

Modify the provision route to:
1. Get an available number from the pool
2. Link it to the new assistant
3. Mark it as assigned in the database
4. Return the number to the shop

---

## ✅ Next Steps

1. **Test the phone now** - Call `+1 (831) 200-2458`
2. **Verify it works** - Talk to the AI
3. **Check Vapi Dashboard** - See if the call appears in logs
4. **Iterate on the prompt** - Customize the AI's behavior

---

## 📚 Documentation Reference

- **Full Workflow Guide:** `docs/VAPI_PHONE_NUMBER_WORKFLOW.md`
- **API Fixes:** `docs/VAPI_PROVISIONING_FIX.md`

---

**Status:** ✅ Ready to test!  
**Your Number:** `+1 (831) 200-2458`  
**Next:** Navigate to `/test/vapi` and click "Provision Test Phone Number" 🎉

