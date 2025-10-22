# Vapi Phone Number Provisioning - Correct Workflow

**Date:** 2025-10-22  
**Status:** ✅ RESOLVED

---

## **Problem Statement**

We attempted to provision phone numbers programmatically using `vapi.phoneNumbers.create()`, but:
- No actual phone number was returned
- Phone number resources appeared in logs but not in Vapi dashboard
- Dashboard showed error: `"A phone number must either be a string or an object of shape { phone, [country] }."`

---

## **Investigation Results** 🔍

### **1. SDK Methods Available**

```typescript
vapi.phoneNumbers = {
  list()      // List all phone numbers
  create()    // Create/import a phone number
  get(id)     // Get phone number details
  update(id)  // Update phone number settings
  delete(id)  // Delete phone number
}
```

**❌ NO `buy()`, `provision()`, or `purchase()` method exists!**

### **2. What `create()` Actually Does**

The `create()` method is for **IMPORTING** existing phone numbers, NOT buying new ones:

```typescript
// ❌ WRONG - Trying to buy a new number
await vapi.phoneNumbers.create({
  provider: 'vapi',
  assistantId: 'xxx'
});
// Result: Creates resource but no phone number assigned

// ✅ CORRECT - Importing an existing number
await vapi.phoneNumbers.create({
  number: "+18005551234",  // Phone number you already own
  provider: "vapi",
  assistantId: "xxx",
  name: "My Receptionist"
});
```

### **3. Dashboard Error Explained**

The error `"A phone number must either be a string or an object of shape { phone, [country] }"` means:
- Vapi expects a `number` field in the create request
- This number must be one you already purchased/own
- Without it, the API creates an empty/invalid resource

---

## **The Correct Workflow** ✅

### **Phase 1: Buy Number (Dashboard - One-time)**

1. **Go to Vapi Dashboard**
   - URL: https://dashboard.vapi.ai
   - Navigate to **Phone Numbers** tab

2. **Buy a Free US Number**
   - Click **"Buy Number"** or **"Get Phone Number"**
   - Select area code (800, 888, 877 preferred for toll-free)
   - Confirm purchase (uses one of your 10 free US numbers)
   - **IMPORTANT:** Copy the phone number (e.g., `+18005551234`)

3. **Verify in Dashboard**
   - Number should appear in Phone Numbers list
   - Status: "Active" or "Available"
   - Not yet linked to any assistant

### **Phase 2: Link to Assistant (API - Automated)**

```typescript
// 1. Create an assistant
const assistant = await vapi.assistants.create({
  name: "Shop Receptionist",
  model: "claude-3-5-sonnet-20241022",
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM" // Rachel
  },
  systemPrompt: "You are a helpful receptionist..."
});

// 2. Link the phone number from dashboard to the assistant
const phoneNumber = await vapi.phoneNumbers.create({
  number: "+18005551234",        // ✅ From dashboard (Step 1)
  provider: "vapi",
  assistantId: assistant.id,     // ✅ Link to assistant
  name: "Shop Receptionist Line"
});

console.log("✅ Phone number linked!");
console.log("Call:", phoneNumber.number);
```

---

## **Why This Design?** 🤔

### **Vapi's Reasoning:**

1. **Phone Numbers are Valuable Resources**
   - Can't be easily revoked/changed
   - Represent your business's contact point
   - Need manual oversight for acquisition

2. **Separation of Concerns**
   - **Dashboard:** Resource procurement (buying numbers)
   - **API:** Resource automation (linking, configuring)

3. **Similar to Industry Standards**
   - Twilio: Buy numbers in console, manage via API
   - Vonage: Purchase in dashboard, configure via SDK
   - Vapi: Same pattern for consistency

### **Benefits:**

- ✅ Prevents accidental number purchases
- ✅ Manual review of area codes/numbers
- ✅ Better cost control (10 free limit enforced)
- ✅ Clearer audit trail
- ✅ API remains focused on automation, not procurement

---

## **Implementation for Shopify App** 🛠️

### **Option 1: Pre-provisioned Pool (Recommended)**

**Setup:**
1. Buy 10 free US numbers through Vapi dashboard
2. Store them in your database as "available pool"
3. When a shop installs the app, assign one from the pool
4. Link it to the shop's assistant via API

**Pros:**
- Fully automated for end users
- Fast setup (no manual steps)
- Scalable up to 10 shops

**Cons:**
- Limited to 10 shops (need more? Buy additional numbers)
- Requires upfront manual setup

### **Option 2: Manual Number Entry (Development)**

**For testing/development:**
1. Buy one number in Vapi dashboard
2. Add UI in app for admin to enter the number
3. Use that single number for all test shops
4. When provisioning, link the shared number to new assistants

**Pros:**
- Good for development/testing
- No limit on assistant count

**Cons:**
- All test shops share one number (can't distinguish calls)
- Not suitable for production

### **Option 3: Hybrid (Production)**

**For production:**
1. Start with pre-provisioned pool (Option 1)
2. When pool runs low, show admin notification
3. Admin buys more numbers in Vapi dashboard
4. Admin adds them to the pool via app UI
5. App continues assigning from pool

**Pros:**
- Scalable beyond 10 shops
- Maintains automation for end users
- Controlled number acquisition

---

## **Updated Code** 📝

### **Test Provisioning Route**

```typescript
// src/app/api/vapi/test/provision/route.ts
export async function POST(request: NextRequest) {
  // ... create assistant code ...

  // ❌ OLD: Tried to buy number via API (doesn't work)
  // const phoneNumber = await vapi.phoneNumbers.create({
  //   provider: 'vapi',
  //   assistantId: assistant.id
  // });

  // ✅ NEW: Link pre-bought number to assistant
  const VAPI_PHONE_NUMBER = process.env.VAPI_TEST_PHONE_NUMBER;
  
  if (!VAPI_PHONE_NUMBER) {
    return createErrorResponse(
      new Error('No test phone number configured. Please buy a number in Vapi dashboard and set VAPI_TEST_PHONE_NUMBER in .env'),
      'Missing phone number',
      500
    );
  }

  const phoneNumber = await vapi.phoneNumbers.create({
    number: VAPI_PHONE_NUMBER,     // From .env (bought in dashboard)
    provider: "vapi",
    assistantId: assistant.id,
    name: `Test Receptionist - ${shop}`
  });

  return createSuccessResponse({
    assistantId: assistant.id,
    phoneNumber: phoneNumber.number,
    phoneNumberId: phoneNumber.id,
    message: "Test receptionist created and linked to phone number!"
  });
}
```

### **Environment Variables**

```bash
# .env
VAPI_API_KEY=92c92ccc-8c0b-416b-b059-47711e746ab8
VAPI_PUBLIC_KEY=296470fc-f13b-4fa5-8f13-d486182c1880

# Phone number bought from Vapi dashboard
VAPI_TEST_PHONE_NUMBER=+18005551234  # ← Add this
```

---

## **Next Steps** 🎯

### **For Development/Testing:**

1. **Buy a Test Number:**
   ```
   - Go to https://dashboard.vapi.ai
   - Click "Phone Numbers" → "Buy Number"
   - Select any free US number (e.g., +1-800-XXX-XXXX)
   - Copy the number
   ```

2. **Add to Environment:**
   ```bash
   # .env
   VAPI_TEST_PHONE_NUMBER=+18005551234  # Your number from dashboard
   ```

3. **Update Code:**
   - Modify provisioning route to use `VAPI_TEST_PHONE_NUMBER`
   - Remove attempts to buy numbers via API
   - Link the pre-bought number to new assistants

4. **Test:**
   - Create assistant via API ✅
   - Link phone number to assistant ✅
   - Verify in Vapi dashboard ✅
   - Make a test call ✅

### **For Production:**

1. **Build Number Pool Management:**
   - Admin UI to view available numbers
   - Admin UI to add numbers to pool (manual entry after buying)
   - Auto-assignment logic when provisioning for shops
   - Notifications when pool is running low

2. **Database Schema:**
   ```sql
   CREATE TABLE phone_number_pool (
     id UUID PRIMARY KEY,
     phone_number TEXT UNIQUE NOT NULL,
     provider TEXT DEFAULT 'vapi',
     status TEXT DEFAULT 'available', -- available, assigned, reserved
     assigned_to_shop_id UUID REFERENCES shops(id),
     assigned_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Provisioning Flow:**
   ```typescript
   // 1. Get available number from pool
   const availableNumber = await getAvailablePhoneNumber();
   
   // 2. Create assistant
   const assistant = await vapi.assistants.create({...});
   
   // 3. Link number to assistant
   const linkedNumber = await vapi.phoneNumbers.create({
     number: availableNumber.phone_number,
     provider: "vapi",
     assistantId: assistant.id
   });
   
   // 4. Mark as assigned in pool
   await markPhoneNumberAssigned(availableNumber.id, shop.id);
   ```

---

## **Summary** 📋

| Aspect | Finding |
|--------|---------|
| **API Capability** | Cannot buy numbers via API |
| **Correct Method** | Buy in dashboard, link via API |
| **SDK Method** | `vapi.phoneNumbers.create({ number, provider, assistantId })` |
| **Required Param** | `number` (e.g., `"+18005551234"`) |
| **Free Numbers** | 10 US numbers per account (dashboard only) |
| **Production Strategy** | Pre-provision pool + admin management UI |

**Status:** ✅ Workflow clarified and documented  
**Next:** Implement number pool management for production use

