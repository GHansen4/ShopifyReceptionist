# 🔐 HTTPS Setup Guide for Shopify App Development

## Problem

When running a Shopify embedded app locally, browsers block it because:
- Shopify Admin enforces HTTPS
- CSP (Content Security Policy) blocks HTTP requests in HTTPS contexts
- Error: "Refused to frame 'http://localhost:3000/'"

## Solution

Use a custom HTTPS server with self-signed certificates for local development.

---

## 🚀 Quick Setup (First Time Only)

### Option A: One Command (Recommended for Windows)

```bash
npm run dev:https:first-time
```

This will:
1. ✅ Generate self-signed SSL certificates
2. ✅ Start the HTTPS server
3. ✅ Ready for Shopify CLI

### Option B: Step by Step

#### Step 1: Generate SSL Certificates

**On Windows (PowerShell - Run as Administrator):**

```powershell
powershell -ExecutionPolicy Bypass -File generate-certs.ps1
```

**On macOS/Linux:**

```bash
bash generate-certs.sh
```

**Manual using OpenSSL (all platforms):**

```bash
mkdir -p certs
openssl genrsa -out certs/localhost-key.pem 2048
openssl req -new -x509 -key certs/localhost-key.pem -out certs/localhost-cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

#### Step 2: Start HTTPS Server

```bash
npm run dev:https
```

You'll see:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🚀  Next.js + Shopify App Dev Server Ready            │
│                                                         │
│  🔐  HTTPS: https://localhost:3000                     │
│                                                         │
│  📝  Note: This uses a self-signed certificate.         │
│     Your browser will show a warning - this is normal.  │
│     Click "Advanced" and "Proceed" to continue.         │
│                                                         │
│  🛑  To stop: Press Ctrl+C                             │
│                                                         │
└─────────────────────────────────────────────────────────┘

App is ready to be accessed in Shopify Admin!
```

---

## 📋 Available NPM Scripts

```bash
# First time setup (generates certs and starts HTTPS server)
npm run dev:https:first-time

# Start HTTPS server (certs must already exist)
npm run dev:https

# Generate certificates manually
npm run gen-certs

# Regular HTTP development (not for Shopify embedded apps)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🎯 Using with Shopify CLI

Once HTTPS is running (`npm run dev:https`), use Shopify CLI as normal:

**In a new terminal window:**

```bash
shopify app dev
```

The CLI will connect to your HTTPS server and expose it to Shopify.

---

## 🔒 Self-Signed Certificates

### What are they?

Self-signed certificates are SSL certificates created locally that:
- Don't require a Certificate Authority
- Work perfectly for local development
- Show a browser warning (expected)
- Are NOT suitable for production

### Browser Warning (Expected)

When first accessing `https://localhost:3000`, you'll see a warning about the certificate. This is normal and expected.

**Steps to proceed:**

1. **Chrome/Edge:** Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Firefox:** Click "Advanced" → "Accept the Risk and Continue"
3. **Safari:** The warning appears in a popup - click "Allow"

The browser will remember your choice for future visits.

### How long do they last?

The generated certificates are valid for **365 days**. To regenerate:

```bash
npm run gen-certs
```

---

## 📁 Files Created

```
your-project/
├── certs/                          # NEW - Certificate storage
│   ├── localhost-key.pem          # Private key
│   └── localhost-cert.pem         # Certificate
├── server.js                       # NEW - Custom HTTPS server
├── generate-certs.sh               # NEW - Unix cert generator
├── generate-certs.ps1              # NEW - Windows cert generator
├── shopify.app.toml               # UPDATED - HTTPS URLs
├── package.json                    # UPDATED - HTTPS scripts
└── ... (other files)
```

---

## 🐛 Troubleshooting

### Problem: "SSL certificates not found"

**Solution:** Run one of these:

```bash
# Easiest
npm run dev:https:first-time

# Or step by step
npm run gen-certs
npm run dev:https
```

### Problem: "openssl: command not found"

**Windows:**
```bash
# Install via Chocolatey
choco install openssl -y
```

**macOS:**
```bash
# Install via Homebrew
brew install openssl
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install openssl
```

### Problem: "Port 3000 already in use"

**Solution:** Use a different port:

```bash
PORT=3001 npm run dev:https
```

Then update `shopify.app.toml`:
```toml
application_url = "https://localhost:3001"

[auth]
redirect_urls = [
  "https://localhost:3001/api/auth/callback"
]
```

### Problem: "Permission denied" when running scripts

**On macOS/Linux:**
```bash
chmod +x generate-certs.sh
npm run gen-certs
```

**On Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
powershell -ExecutionPolicy Bypass -File generate-certs.ps1
```

### Problem: Browser still shows HTTP warning

**Solution:** Clear browser cache and reload:
- Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
- Firefox: Ctrl+Shift+Delete
- Safari: Develop menu → Empty Web Storage

---

## 🔄 Workflow Summary

### First Time Setup

```bash
# 1. Generate certificates
npm run gen-certs

# 2. Start HTTPS server
npm run dev:https

# 3. In another terminal, start Shopify CLI
shopify app dev
```

### Regular Development

```bash
# Terminal 1: Start HTTPS server
npm run dev:https

# Terminal 2: Start Shopify CLI
shopify app dev
```

---

## ✅ Verification

### Check HTTPS is Working

1. Open browser to `https://localhost:3000`
2. Accept the certificate warning
3. You should see your app dashboard
4. Check browser console (F12) - no CSP errors
5. Start Shopify CLI - it should connect without issues

### Check CSP Headers

In browser DevTools (F12):

1. Go to **Network** tab
2. Look for any requests
3. In **Response Headers**, verify you see:
   ```
   X-Frame-Options: SAMEORIGIN
   ```

This header allows Shopify to embed your app in an iframe.

---

## 🚀 Next Steps

Once HTTPS is working:

1. ✅ Run `npm run dev:https` in one terminal
2. ✅ Run `shopify app dev` in another terminal
3. ✅ Access your app through Shopify Admin
4. ✅ All CSP/HTTPS errors should be gone!

---

## 📚 Resources

- [Shopify CLI Documentation](https://shopify.dev/docs/apps/tools/cli)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)
- [Self-Signed Certificates Guide](https://devcenter.heroku.com/articles/ssl-certificate-self)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Last Updated:** October 21, 2025
**Status:** ✅ Ready to use
