# 🔧 GitHub Pages Deployment Fix

## ❌ Sorun

GitHub Pages'de şu hatalar alınıyordu:

```
GET https://kaplayan-atakan.github.io/src/main.tsx net::ERR_ABORTED 404 (Not Found)
GET https://kaplayan-atakan.github.io/vite.svg 404 (Not Found)
```

**Neden:** Sayfa development dosyalarını aramaya çalışıyordu, production build'deki dosyaları bulamıyordu.

## 🔍 Kök Neden

GitHub Pages varsayılan olarak **Jekyll** static site generator kullanır. Jekyll:
1. `_` (underscore) ile başlayan dosyaları ignore eder
2. Vite'ın oluşturduğu `assets/` klasörünü ve diğer dosyaları düzgün serve etmez
3. SPA routing için özel yapılandırma gerektirir

## ✅ Çözüm

### 1. `.nojekyll` Dosyası Ekledik

```bash
# public/.nojekyll dosyası oluşturuldu (boş dosya)
touch public/.nojekyll
```

Bu dosya GitHub Pages'e "Jekyll kullanma, dosyaları olduğu gibi serve et" der.

### 2. Vite Yapılandırması

`vite.config.ts` zaten doğru yapılandırılmış:

```typescript
export default defineConfig({
  base: '/crypto-scalper-landing/', // ✅ GitHub Pages subpath
  plugins: [react()]
})
```

### 3. GitHub Actions Workflow

`.github/workflows/deploy.yml` zaten doğru:

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist  # ✅ Build output klasörü
```

## 📋 Kontrol Listesi

Deployment sorunları için şunları kontrol edin:

- [x] **`.nojekyll` dosyası** - `public/.nojekyll` mevcut
- [x] **Vite base path** - `vite.config.ts` içinde `base: '/repo-name/'`
- [x] **GitHub Actions** - Workflow `dist/` klasörünü upload ediyor
- [x] **Build başarılı** - `npm run build` hatasız çalışıyor
- [x] **Dist index.html** - Doğru asset path'leri içeriyor
- [x] **Repository Settings** - GitHub Pages "GitHub Actions" source seçili

## 🔬 Debug Adımları

### 1. Local Build Kontrolü

```bash
npm run build
cat dist/index.html  # Asset path'lerini kontrol et
```

Beklenen output:
```html
<script type="module" src="/crypto-scalper-landing/assets/index-XXX.js"></script>
<link rel="stylesheet" href="/crypto-scalper-landing/assets/index-XXX.css">
```

❌ Olmaması gereken:
```html
<script type="module" src="/src/main.tsx"></script>
```

### 2. GitHub Actions Log Kontrolü

1. GitHub repository → Actions tab
2. En son workflow run'ı aç
3. "build" job'ı kontrol et
4. "Upload artifact" step'inde `dist/` klasörünün upload edildiğini doğrula

### 3. GitHub Pages Settings

1. Repository → Settings → Pages
2. **Source:** "GitHub Actions" seçili olmalı
3. **Branch:** Yok (Actions kullanıldığında)
4. **Custom domain:** Boş (subdomain kullanılmıyorsa)

### 4. Cache Temizleme

Tarayıcı cache'i temizle:
- Chrome: `Ctrl+Shift+Del` → "Cached images and files"
- Veya: `Ctrl+F5` (hard refresh)
- Veya: Incognito/Private mode'da test et

## 🎯 Sonuç

✅ Deployment başarılı olmalı!

**Live URL:** https://kaplayan-atakan.github.io/crypto-scalper-landing/

**Beklenen davranış:**
- Ana sayfa yükleniyor
- Assets (JS, CSS) doğru load ediliyor
- React app çalışıyor
- Live Actions sayfası erişilebilir

## 📚 İlgili Dosyalar

- `public/.nojekyll` - Jekyll'i devre dışı bırakır
- `vite.config.ts` - Base path yapılandırması
- `.github/workflows/deploy.yml` - Otomatik deployment
- `dist/index.html` - Build output

## 🐛 Hala Sorun Varsa

### Sorun: Assets yüklenmiyor

**Çözüm:**
1. Browser cache temizle
2. GitHub Actions workflow'un başarıyla tamamlandığını kontrol et
3. `dist/index.html` içinde asset path'lerini doğrula

### Sorun: 404 - Page not found

**Çözüm:**
1. GitHub Pages "GitHub Actions" source kullanıyor mu kontrol et
2. Workflow permissions doğru mu: `contents: read, pages: write`
3. Repository public mu? (Private repolarda Pages için plan gerekir)

### Sorun: Old version görünüyor

**Çözüm:**
1. Hard refresh: `Ctrl+F5`
2. Incognito mode'da test et
3. GitHub Actions'da yeni deployment tamamlandı mı kontrol et
4. 2-3 dakika bekle (CDN propagation süresi)

## 📝 Notlar

- **Build süresi:** ~30 saniye
- **Deployment süresi:** ~1 dakika
- **CDN propagation:** 2-5 dakika
- **Otomatik trigger:** Her `main` branch push'ta

Artık her `git push` sonrası otomatik olarak deploy olacak! 🚀
