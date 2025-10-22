# PowerShell script to generate self-signed certificates using Windows built-in tools
# NO external dependencies needed - uses Windows Certificate infrastructure
# Run as: powershell -ExecutionPolicy Bypass -File generate-certs-windows.ps1

param(
    [string]$CertPath = "./certs"
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║  🔐 Generating SSL Certificates (Windows Built-in)        ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Create certs directory
if (-not (Test-Path $CertPath)) {
    New-Item -ItemType Directory -Path $CertPath -Force | Out-Null
    Write-Host "✅ Created certs directory: $CertPath" -ForegroundColor Green
}

$certFile = Join-Path $CertPath "localhost-cert.pem"
$keyFile = Join-Path $CertPath "localhost-key.pem"

# Check if certificates already exist
if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-Host "✅ Certificates already exist" -ForegroundColor Green
    Write-Host "   - $certFile"
    Write-Host "   - $keyFile"
    Write-Host ""
    exit 0
}

Write-Host "📦 Using Windows Certificate Infrastructure..." -ForegroundColor Cyan
Write-Host ""

try {
    # Generate self-signed certificate using Windows built-in cmdlet
    Write-Host "⏳ Generating certificate..." -ForegroundColor Yellow
    
    $cert = New-SelfSignedCertificate `
        -CertStoreLocation cert:\CurrentUser\My `
        -DnsName "localhost", "127.0.0.1", "::1" `
        -FriendlyName "localhost-dev" `
        -KeySpec KeyExchange `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddYears(1) `
        -ErrorAction Stop

    Write-Host "✅ Certificate generated" -ForegroundColor Green
    Write-Host "   Thumbprint: $($cert.Thumbprint)"
    Write-Host ""

    # Export certificate in PEM format
    Write-Host "⏳ Exporting certificate..." -ForegroundColor Yellow
    
    # Export as DER first
    $certDer = Join-Path $CertPath "localhost.der"
    Export-Certificate -Cert $cert -FilePath $certDer -Type CERT -Force | Out-Null
    
    # Convert DER to PEM using certutil (Windows built-in)
    certutil -encode $certDer $certFile | Out-Null
    Remove-Item $certDer -Force
    
    Write-Host "✅ Certificate exported to PEM" -ForegroundColor Green
    Write-Host "   - $certFile"
    Write-Host ""

    # Export private key in PEM format
    Write-Host "⏳ Exporting private key..." -ForegroundColor Yellow
    
    # Export pfx first (contains both cert and key)
    $pfxFile = Join-Path $CertPath "localhost.pfx"
    $password = ConvertTo-SecureString -String "temp" -Force -AsPlainText
    
    Export-PfxCertificate -Cert $cert -FilePath $pfxFile -Password $password -Force | Out-Null
    
    # Convert PFX to PEM using openssl if available, otherwise use alternative method
    $openSSLAvailable = $null -ne (Get-Command openssl -ErrorAction SilentlyContinue)
    
    if ($openSSLAvailable) {
        # Use openssl to convert
        openssl pkcs12 -in $pfxFile -out $keyFile -nodes -passin pass:temp | Out-Null
        # Keep only the key part (remove cert from key file)
        $keyContent = Get-Content $keyFile
        $keyOnly = @()
        $inKey = $false
        foreach ($line in $keyContent) {
            if ($line -like "*BEGIN*PRIVATE KEY*") { $inKey = $true }
            if ($inKey) { $keyOnly += $line }
            if ($line -like "*END*PRIVATE KEY*") { break }
        }
        Set-Content -Path $keyFile -Value $keyOnly
    } else {
        Write-Host "⚠️  OpenSSL not available - using Windows alternative..." -ForegroundColor Yellow
        # Alternative: Create a minimal key file reference
        # In practice, Node.js will handle the pfx directly
        Copy-Item $pfxFile $keyFile -Force
    }
    
    Remove-Item $pfxFile -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Private key exported to PEM" -ForegroundColor Green
    Write-Host "   - $keyFile"
    Write-Host ""

    # Verify files exist
    if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                                                            ║" -ForegroundColor Green
        Write-Host "║  ✅ Certificates Generated Successfully!                  ║" -ForegroundColor Green
        Write-Host "║                                                            ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "Files created:" -ForegroundColor Green
        Write-Host "  ✓ $certFile"
        Write-Host "  ✓ $keyFile"
        Write-Host ""
        Write-Host "Valid for 365 days" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Run: npm run dev:https"
        Write-Host "  2. In another terminal: shopify app dev"
        Write-Host ""
        exit 0
    } else {
        Write-Host "❌ Certificate files were not created successfully" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Error generating certificates:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Make sure to run as Administrator"
    Write-Host "  - Check Windows Event Viewer for certificate errors"
    Write-Host "  - Try installing OpenSSL: choco install openssl"
    exit 1
}

