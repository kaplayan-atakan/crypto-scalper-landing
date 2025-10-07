#!/bin/bash

# GitHub Pages Deployment Script
# Bu script GitHub Pages için doğru ayarları kontrol eder

echo "🔍 Checking GitHub Pages configuration..."
echo ""

echo "📋 Required Settings:"
echo "1. Go to: https://github.com/kaplayan-atakan/crypto-scalper-landing/settings/pages"
echo "2. Under 'Build and deployment':"
echo "   - Source: 'GitHub Actions' (NOT 'Deploy from a branch')"
echo "3. Save if changed"
echo ""

echo "🔧 Current local build status:"
npm run build

echo ""
echo "✅ Build completed!"
echo ""
echo "📦 Verifying dist/index.html..."
if grep -q "src/main.tsx" dist/index.html; then
    echo "❌ ERROR: dist/index.html still contains development paths!"
    echo "   This should not happen. Check vite.config.ts"
else
    echo "✅ dist/index.html looks good (production paths)"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Commit and push any changes"
echo "2. Check Actions tab: https://github.com/kaplayan-atakan/crypto-scalper-landing/actions"
echo "3. Wait 2-3 minutes for deployment"
echo "4. Test in incognito: https://kaplayan-atakan.github.io/crypto-scalper-landing/"
echo ""
echo "💡 If still not working:"
echo "   - Clear browser cache completely"
echo "   - Check GitHub Pages settings (link above)"
echo "   - Verify Actions completed successfully"
