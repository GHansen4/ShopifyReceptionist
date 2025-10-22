# Start App with Public Tunnel

## Problem
Shopify CLI is using `localhost:3000` instead of creating a public tunnel.
Vapi needs a public URL to call your app during phone calls.

## Solution: Use Cloudflare Tunnel

### Step 1: Install Cloudflare Tunnel (One-time)

```powershell
# Download cloudflared
winget install --id Cloudflare.cloudflared
```

Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

### Step 2: Start Your Servers (3 Terminals)

**Terminal 1: Cloudflare Tunnel**
```powershell
cloudflared tunnel --url http://localhost:3000
```

This will output a URL like:
```
https://[random].trycloudflare.com
```

**Copy this URL!**

**Terminal 2: Shopify CLI**
```powershell
shopify app dev
```

**Terminal 3: Next.js**
```powershell
npm run dev
```

### Step 3: Use the Tunnel URL

1. Go to `/test/vapi` in your app
2. Paste the Cloudflare tunnel URL in the text field
3. Click "Provision Test Phone Number"

---

## Alternative: Simplified Setup (Just 2 Terminals)

Since Shopify CLI isn't creating a tunnel anyway, you can simplify:

**Terminal 1: Cloudflare Tunnel + Next.js**
```powershell
# Start Next.js
npm run dev

# Wait for it to start, then in a new terminal:
cloudflared tunnel --url http://localhost:3000
```

**Terminal 2: Just for reference**
```powershell
# Optional: You can run Shopify CLI if you want the preview link
shopify app dev
```

The tunnel URL from Terminal 1 is what you need for Vapi.

