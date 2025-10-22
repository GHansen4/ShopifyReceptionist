# PowerShell script to generate self-signed certificates for HTTPS localhost development
# Run as Administrator

param(
    [string]$CertPath = "./certs"
)

# Create certs directory
if (-not (Test-Path $CertPath)) {
    New-Item -ItemType Directory -Path $CertPath | Out-Null
    Write-Host "✅ Created certs directory"
}

$certFile = Join-Path $CertPath "localhost-cert.pem"
$keyFile = Join-Path $CertPath "localhost-key.pem"

# Check if certificates already exist
if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-Host "✅ Certificates already exist at $CertPath"
    Write-Host "  - $certFile"
    Write-Host "  - $keyFile"
    exit 0
}

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    Write-Host "❌ OpenSSL not found. Please install it:" -ForegroundColor Red
    Write-Host ""
    Write-Host "Option 1: Using Chocolatey (recommended)"
    Write-Host "  choco install openssl -y"
    Write-Host ""
    Write-Host "Option 2: Using Windows Subsystem for Linux (WSL)"
    Write-Host "  Run this script from WSL bash"
    Write-Host ""
    Write-Host "Option 3: Download from https://slproweb.com/products/Win32OpenSSL.html"
    exit 1
}

Write-Host "🔐 Generating self-signed certificates..." -ForegroundColor Cyan

# Generate private key
openssl genrsa -out $keyFile 2048 2>$null

# Generate certificate
openssl req -new -x509 -key $keyFile -out $certFile -days 365 `
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>$null

if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-Host ""
    Write-Host "✅ SSL certificates generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:"
    Write-Host "  - $certFile"
    Write-Host "  - $keyFile"
    Write-Host ""
    Write-Host "These certificates will be used for HTTPS development."
} else {
    Write-Host "❌ Failed to generate certificates" -ForegroundColor Red
    exit 1
}
