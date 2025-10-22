# Quick start script for HTTPS development on Windows
# Usage: powershell -ExecutionPolicy Bypass -File start-https.ps1

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║   🔐 Shopify App HTTPS Development Setup                ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if certs exist
$certPath = ".\certs\localhost-cert.pem"
$keyPath = ".\certs\localhost-key.pem"

if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Host "✅ SSL certificates found" -ForegroundColor Green
} else {
    Write-Host "❌ SSL certificates not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Generating certificates..." -ForegroundColor Cyan
    npm run gen-certs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Certificate generation failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Try manually:" -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File generate-certs.ps1"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting HTTPS server..." -ForegroundColor Cyan
Write-Host ""

npm run dev:https

Write-Host ""
Write-Host "Server stopped" -ForegroundColor Yellow
Write-Host ""
