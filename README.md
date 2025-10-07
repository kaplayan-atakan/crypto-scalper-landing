# Kripto Scalper Landing 🚀

Modern ve interaktif bir React + TypeScript + Vite projesi. **Kripto Scalper** ticaret motoru için landing page ve canlı veri dashboard'u.

## ✨ Özellikler

### 🏠 Ana Sayfa
- **Equity Curve Chart** – LIVE vs SIM kümülatif getiri grafiği
- **Strategy Score Bars** – Strateji performans dağılımı
- **Risk Exposure Chart** – Gerçek zamanlı marj kullanımı
- **Decision Flow Chart** – Sinyal skorlama ilerlemesi
- **Audience Metrics** – Kullanıcı profil istatistikleri
- **Transparency Grid** – Sharpe ratio, max drawdown, win rate metrikleri
- **Animated Effects** – Gradient overlay'ler ve pulse animasyonları

### ⚡ Live Actions Sayfası
- **Supabase Realtime Integration** – Canlı trade verilerini gösterme
- **Fallback to Dummy Data** – Supabase olmadan da çalışır
- **Interactive Trade Table** – 50+ işlem detayı
- **Performance Charts** – 24 saatlik PnL ve hacim grafikleri
- **Realtime Toggle** – Canlı veri akışını açıp kapama
- **Loading & Error States** – Profesyonel UX

## 🚀 Hızlı Başlangıç

```bash
# Dependencies
npm install

# Dev server
npm run dev

# Production build
npm run build
```

Dev server: [http://localhost:5173/crypto-scalper-landing/](http://localhost:5173/crypto-scalper-landing/)

## � Supabase Entegrasyonu

### Kurulum
1. `.env.local` dosyasını düzenle:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. Detaylı kurulum için: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### Dummy Data Modu
Supabase yapılandırılmamışsa **otomatik olarak dummy data** kullanır:
- ✅ Geliştirme için ideal
- ✅ Production'da çalışır
- ✅ Supabase'e ihtiyaç yok

## 📁 Proje Yapısı

```
src/
├── lib/
│   └── supabase.ts              # Supabase client
├── types/
│   └── supabase.ts              # TypeScript definitions
├── services/
│   └── dataService.ts           # Data fetching + fallback
├── hooks/
│   └── useActions.ts            # React hook
├── components/
│   └── SupActionsChart.tsx      # Chart component
├── pages/
│   ├── LiveActions.tsx          # Live dashboard
└── App.tsx                      # Landing page
```

## 🎨 Customisation

### Dummy Data Değiştirme
`src/services/dataService.ts` içindeki `generateDummyTrades()` ve `generateDummyMetrics()` fonksiyonlarını düzenle.

### Stil Değişiklikleri
- `src/App.css` – Component styles
- `src/index.css` – Global variables
- CSS custom properties ile kolay tema değişimi

### Bot ID Değiştirme
`src/services/dataService.ts`:
```typescript
const TARGET_BOT_ID = 'your_bot_id_here'
```

## 🧪 Tech Stack

- **Vite 7.1.14** – Rolldown bundler ile ultra-hızlı build
- **React 18.3.1** – Modern React features
- **TypeScript 5.6.2** – Type safety
- **Recharts 2.12.7** – Interaktif grafikler
- **Supabase JS** – Realtime database
- **React Router DOM** – Client-side routing

## 📊 Performance

```bash
✓ 668 modules transformed
✓ build time: ~320ms
✓ bundle size: 745 kB (206 kB gzipped)
```

## 🌐 Deployment

GitHub Pages üzerinden otomatik deploy:
- **Live URL**: https://kaplayan-atakan.github.io/crypto-scalper-landing/
- **Workflow**: `.github/workflows/deploy.yml`
- **Auto Deploy**: Her `main` push'ta

## 📝 Environment Variables

```env
# Required for Supabase integration
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# Optional - defaults provided
TARGET_BOT_ID=scalper_core_MOM_1DK_V9_BinanceV7_Live
```

## � Troubleshooting

### Build Errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Supabase Connection Issues
1. Check `.env.local` credentials
2. Verify RLS policies in Supabase
3. Check browser console for errors
4. Fallback to dummy data will work automatically

### Type Errors
```bash
npm install --save-dev @types/node
```

## � Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Vite Documentation](https://vitejs.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Recharts API](https://recharts.org/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Design inspired by modern DeFi platforms
- Charts powered by Recharts
- Realtime data by Supabase
- Fast builds by Vite + Rolldown

- Adjust typography, spacing, or gradients in `App.css` without altering the original copy blocks.
- If the copy changes, update `App.tsx` to match exactly—avoid injecting additional text to preserve fidelity.

## 📄 License

MIT
