# Vapi Phone Provisioning - Bug Fixes

**Date:** 2025-10-21  
**Issue:** Provisioning test phone number failed with voice ID and error display issues

---

## Issues Fixed

### 1. **Incorrect Vapi API Parameters**

❌ **Before:**
```typescript
model: 'claude-sonnet-4.5-20241022'  // Invalid model name
voice: { 
  provider: 'elevenlabs',            // Invalid provider name
  voiceId: 'rachel'                  // Invalid voice ID (name, not ID)
}
name: `Test Receptionist - ${shop}`  // Could exceed 40 chars
```

✅ **After:**
```typescript
model: 'claude-3-5-sonnet-20241022'  // Valid Vapi model
voice: { 
  provider: '11labs',                // Valid Vapi provider
  voiceId: '21m00Tcm4TlvDq8ikWAM'    // Valid ElevenLabs Rachel ID
}
name: `Test AI - ${shopName}`        // Max 40 chars
```

### 2. **Wrong Model Configuration Structure**

❌ **Before:**
```typescript
model: {
  provider: 'anthropic',
  model: 'claude-sonnet-4.5-20241022',
  messages: [...]  // Wrong structure
}
```

✅ **After:**
```typescript
model: {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: '...'  // Correct Vapi structure
}
```

### 3. **Error Response Bug**

❌ **Before:**
```typescript
return createErrorResponse(error, 'Test provisioning failed');
//                                  ^^^ String instead of number
```

✅ **After:**
```typescript
const errorMessage = error?.body?.message 
  ? (Array.isArray(error.body.message) ? error.body.message.join('; ') : error.body.message)
  : error?.message || 'Unknown error during provisioning';

return createErrorResponse(new Error(`Test provisioning failed: ${errorMessage}`), 500);
//                                                                                    ^^^ Valid status code
```

---

## Changes Made

**File:** `src/app/api/vapi/test/provision/route.ts`

1. **Line 29-30**: Truncate shop name to stay under 40 character limit
   ```typescript
   const shopName = shop.replace('.myshopify.com', '').substring(0, 20);
   ```

2. **Line 32**: Shorter assistant name
   ```typescript
   name: `Test AI - ${shopName}`
   ```

3. **Line 35**: Correct Vapi model name
   ```typescript
   model: 'claude-3-5-sonnet-20241022'
   ```

4. **Line 37**: Use `systemPrompt` instead of `messages` array
   ```typescript
   systemPrompt: `You are a friendly AI receptionist...`
   ```

5. **Line 50**: Correct voice provider
   ```typescript
   provider: '11labs'
   ```

6. **Lines 158-162**: Better error handling with proper status code
   ```typescript
   const errorMessage = error?.body?.message 
     ? (Array.isArray(error.body.message) ? error.body.message.join('; ') : error.body.message)
     : error?.message || 'Unknown error during provisioning';

   return createErrorResponse(new Error(`Test provisioning failed: ${errorMessage}`), 500);
   ```

---

## Vapi API Reference

Based on the error messages, here are the valid values:

### Valid Model Names:
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- `claude-3-5-sonnet-20240620`
- ✅ **`claude-3-5-sonnet-20241022`** ← We're using this
- `claude-3-5-haiku-20241022`
- `claude-3-7-sonnet-20250219`
- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001`

### Valid Voice Providers:
- `vapi`
- ✅ **`11labs`** ← We're using this (ElevenLabs)
- `azure`
- `cartesia`
- `custom-voice`
- `deepgram`
- `hume`
- `lmnt`
- `neuphonic`
- `openai`
- `playht`
- `rime-ai`
- `smallest-ai`
- `tavus`
- `sesame`
- `inworld`
- `minimax`

---

## Testing

**To test the fix:**

1. **Restart dev server** (changes should hot-reload, but restart to be safe)
   
2. **Navigate to:** `https://localhost:3000/test/vapi?shop=always-ai-dev-store.myshopify.com`

3. **Click:** "Provision Test Phone Number"

4. **Expected result:** 
   - ✅ Assistant created
   - ✅ Phone number provisioned
   - ✅ Phone number displayed
   - ✅ Saved to database

5. **Check terminal for logs:**
   ```
   [xxxxx] ═══════════════════════════════════════
   [xxxxx] Starting test provisioning for: always-ai-dev-store.myshopify.com
   [xxxxx] Creating test assistant...
   [xxxxx] ✅ Assistant created: ast_xxxxx
   [xxxxx] Provisioning phone number (toll-free preferred)...
   [xxxxx] ✅ Got phone number: +1xxxxxxxxxx
   [xxxxx] Saving to database...
   [xxxxx] ✅ Saved to database
   [xxxxx] ✅ Test provisioning complete!
   [xxxxx] Phone: +1xxxxxxxxxx
   [xxxxx] ═══════════════════════════════════════
   ```

---

## Status

✅ **Fixed - Voice ID corrected**
⚠️ **Phone provisioning requires Twilio setup**

The assistant creation and voice configuration now work correctly. Phone provisioning requires additional setup (see below).

---

## Update: Voice ID Fix (Latest)

### 4. **Invalid Voice ID**

❌ **Before:**
```typescript
voice: {
  provider: '11labs',
  voiceId: 'rachel',  // Name, not ID - causes 400 error
}
```

✅ **After:**
```typescript
voice: {
  provider: '11labs',
  voiceId: '21m00Tcm4TlvDq8ikWAM',  // Valid ElevenLabs Rachel ID
}
```

**Common ElevenLabs Voice IDs:**
| Name | Voice ID |
|------|----------|
| Rachel | `21m00Tcm4TlvDq8ikWAM` ✅ |
| Domi | `AZnzlk1XvdvUeBnXmlld` |
| Bella | `EXAVITQu4vr4xnSDxMaL` |
| Antoni | `ErXwobaYiN019PkySvjV` |
| Josh | `TxGEqnHWrfWFTfGW9XjX` |

### 5. **Frontend Error Display - "[object Object]"**

❌ **Before:**
```typescript
alert(`Provisioning failed: ${data.error || 'Unknown error'}`);
// Shows: "Provisioning failed: [object Object]"
```

✅ **After:**
```typescript
const errorMsg = data.error?.message || data.error || 'Unknown error';
alert(`Provisioning failed: ${errorMsg}`);
// Shows: "Provisioning failed: Couldn't Find 11labs Voice..."
```

**Fixed in:**
- `testConnection()` - Connection test errors
- `provisionTestPhone()` - Provisioning errors  
- `cleanupResources()` - Cleanup errors

### 6. **Phone Number Provisioning - Fetching Number After Creation**

**Issue:** Using `provider: 'vapi'` created a phone number resource, but the CREATE response didn't include the actual phone number.

```json
// Create response had ID and metadata but no phone number field
{
  "id": "9260452a-4e5b-4bc7-999c-344c3d778576",
  "provider": "vapi",
  "status": "active"
  // ❌ No "number" or "phoneNumber" field!
}
```

**Root Cause:** The phone number may not be immediately available in the CREATE response. Need to fetch it separately.

**Solution:** Create the resource, then GET the full details:

```typescript
// Step 1: Create phone number
const createResponse = await vapi.phoneNumbers.create({
  provider: 'vapi', // ✅ Vapi handles provisioning directly
  assistantId: assistant.id,
});

// Step 2: Fetch full details
const phoneNumber = await vapi.phoneNumbers.get(createResponse.id);
// Now check: phoneNumber.number, phoneNumber.e164, etc.
```

**Why this works:**
- Vapi provisions numbers directly (no external provider needed)
- The number might be assigned asynchronously
- Fetching via GET should return the complete details

**If number still not available:**
- Phone provisioning may be async (takes a few seconds)
- Check Vapi dashboard at https://dashboard.vapi.ai
- Or wait and retry the GET request

---

## Update: Dashboard Not Showing Phone Numbers

**Date:** 2025-10-22  
**Issue:** Phone numbers created via API don't appear in Vapi dashboard

### Response from Vapi Support:

> "You are using the API to provision a phone number but nothing is showing up on your phone number tab in the dashboard. Make sure you are successfully calling the correct endpoint to create a phone number, such as **POST /phone-number**. After the API call, you can list phone numbers using **GET /phone-number** or **GET /v2/phone-number**. If the phone numbers still do not appear in the dashboard, double-check that your API authentication is correct and that you are operating under the same organization/account as the dashboard view."

### Key Points:

1. **Correct Endpoint**: Use `POST /phone-number` (not `/phone-numbers`)
2. **Verification**: After creation, list numbers with `GET /phone-number` or `GET /v2/phone-number`
3. **Dashboard Sync**: Numbers should appear in dashboard if API call succeeds
4. **Authentication**: Verify API key matches the dashboard account/organization

### Current Status:

🔍 **Investigating SDK Method**
- Currently using: `vapi.phoneNumbers.create()`
- Creates a "phone number resource" with ID and status
- But no actual phone number is assigned
- Resource doesn't appear in dashboard

**Possible Issues:**
1. Wrong SDK method (should be `buy()` or similar?)
2. Missing parameters in create call
3. Two-step process required (create resource → buy number)
4. Different endpoint needed for actual provisioning

**RESOLUTION (2025-10-22):**

After investigation, we discovered:

1. **Available SDK Methods:**
   ```
   list, create, get, delete, update
   ```
   ❌ NO `buy()` or `provision()` method exists!

2. **Dashboard Error:**
   ```
   "A phone number must either be a string or an object of shape { phone, [country] }."
   ```

3. **Root Cause:**
   - `vapi.phoneNumbers.create()` is for **IMPORTING** existing numbers
   - It requires you to provide a `number` parameter (e.g., `"+18005551234"`)
   - The Vapi API does NOT support buying new numbers programmatically

**The Correct Workflow:**

1. **Manual Step (One-time):** Buy free US numbers through Vapi Dashboard
   - Go to https://dashboard.vapi.ai → Phone Numbers
   - Click "Buy Number" or "Get Free Number"
   - Select from 10 free US numbers
   - Save the number (e.g., `+18005551234`)

2. **API Step (Automated):** Link number to assistant
   ```typescript
   const phoneNumber = await vapi.phoneNumbers.create({
     number: "+18005551234", // From dashboard
     provider: "vapi",
     assistantId: assistant.id,
     name: "Shop Receptionist"
   });
   ```

**Why This Makes Sense:**
- Phone numbers are valuable resources
- Vapi wants manual oversight for number provisioning
- API is for automation (linking numbers to assistants), not procurement
- Similar to how Twilio works: buy numbers in dashboard, manage via API

