# GitHub Pages Deployment Check Script
# PowerShell version

Write-Host "🔍 Checking GitHub Pages configuration..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Required GitHub Settings:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/kaplayan-atakan/crypto-scalper-landing/settings/pages"
Write-Host "2. Under 'Build and deployment':"
Write-Host "   - Source: Select 'GitHub Actions' (NOT 'Deploy from a branch')"
Write-Host "3. Click 'Save' if you changed anything"
Write-Host ""

Write-Host "🔧 Building project..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "📦 Verifying dist/index.html..." -ForegroundColor Cyan
$indexContent = Get-Content "dist/index.html" -Raw

if ($indexContent -match "src/main.tsx") {
    Write-Host "❌ ERROR: dist/index.html contains development paths!" -ForegroundColor Red
    Write-Host "   Path found: /src/main.tsx" -ForegroundColor Red
    Write-Host "   This is wrong! Should be /crypto-scalper-landing/assets/..." -ForegroundColor Red
} else {
    Write-Host "✅ dist/index.html looks good (production paths)" -ForegroundColor Green
}

if ($indexContent -match "/crypto-scalper-landing/assets/") {
    Write-Host "✅ Correct base path found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Expected path /crypto-scalper-landing/assets/ not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open: https://github.com/kaplayan-atakan/crypto-scalper-landing/actions"
Write-Host "2. Check latest workflow run is ✅ green"
Write-Host "3. Wait 2-3 minutes for CDN propagation"
Write-Host "4. Test in incognito: https://kaplayan-atakan.github.io/crypto-scalper-landing/"
Write-Host ""

Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   If still showing old version:"
Write-Host "   - CTRL+SHIFT+DEL → Clear 'Cached images and files'"
Write-Host "   - Check GitHub Pages source is 'GitHub Actions' (not branch)"
Write-Host "   - Verify workflow completed (link above)"
Write-Host ""

Write-Host "📝 Files to check:" -ForegroundColor Cyan
Write-Host "   - .nojekyll exists: " -NoNewline
if (Test-Path "public/.nojekyll") {
    Write-Host "✅ YES" -ForegroundColor Green
} else {
    Write-Host "❌ NO (this is the problem!)" -ForegroundColor Red
}
