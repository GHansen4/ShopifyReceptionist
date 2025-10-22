/**
 * Custom HTTPS Server for Next.js + Shopify App Development
 * 
 * This server:
 * - Runs Next.js over HTTPS using self-signed certificates
 * - Enables Shopify embedded apps to work in local development
 * - Automatically skips certificate verification for localhost
 * 
 * Usage: node server.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Paths to certificates
const certPath = path.join(__dirname, 'certs', 'localhost-cert.pem');
const keyPath = path.join(__dirname, 'certs', 'localhost-key.pem');
const pfxPath = path.join(__dirname, 'certs', 'localhost.pfx');

// Check if certificates exist (PEM or PFX format)
let options;

if (fs.existsSync(pfxPath)) {
  // Windows-style PFX certificate
  console.log('📦 Using PFX certificate (Windows format)');
  options = {
    pfx: fs.readFileSync(pfxPath),
    passphrase: 'temp',
  };
} else if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  // Standard PEM certificates
  console.log('📦 Using PEM certificates');
  options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} else {
  console.error('❌ SSL certificates not found!');
  console.error('');
  console.error('Please run one of these commands first:');
  console.error('');
  console.error('On Windows (PowerShell):');
  console.error('  npm run gen-certs');
  console.error('  OR run this PowerShell command:');
  console.error('  $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation cert:\\CurrentUser\\My -NotAfter (Get-Date).AddYears(1)');
  console.error('  Export-PfxCertificate -Cert $cert -FilePath certs\\localhost.pfx -Password (ConvertTo-SecureString -String "temp" -Force -AsPlainText)');
  console.error('');
  console.error('On macOS/Linux:');
  console.error('  bash generate-certs.sh');
  process.exit(1);
}

app.prepare().then(() => {
  https.createServer(options, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│                                                         │');
    console.log('│  🚀  Next.js + Shopify App Dev Server Ready            │');
    console.log('│                                                         │');
    console.log(`│  🔐  HTTPS: https://${hostname}:${port}                          │`);
    console.log('│                                                         │');
    console.log('│  📝  Note: This uses a self-signed certificate.         │');
    console.log('│     Your browser will show a warning - this is normal.  │');
    console.log('│     Click "Advanced" and "Proceed" to continue.         │');
    console.log('│                                                         │');
    console.log('│  🛑  To stop: Press Ctrl+C                             │');
    console.log('│                                                         │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('App is ready to be accessed in Shopify Admin!');
    console.log('');
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('');
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
