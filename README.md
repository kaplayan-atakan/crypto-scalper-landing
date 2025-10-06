# Kripto Scalper Landing

A## 📁 Project Structure

- `src/App.tsx` – Renders `context.md` content with Recharts visualizations and dummy data.
- `src/App.css` – Styles for visual sections, chart cards, halo effects, and responsive behavior.
- `src/index.css` – Global variables, fonts, and base styles.
- `context.md` – Source copy mirrored verbatim on the page.
- `package.json` – Dependencies include `recharts` for chart rendering.

## 📝 Customisation

- Update dummy data arrays (`equityCurve`, `strategyBlend`, `exposureProfile`, etc.) in `App.tsx` to change chart content.
- Tweak colors, gradients, or animations in `App.css` while preserving the design system variables.
- Original text blocks remain unchanged; add visual sections by wrapping them in `.section--visual` layouts.nhanced React + Vite landing page that presents the **Kripto Scalper** trading engine narrative from `context.md` with interactive Recharts visualizations and dummy trade metrics. The original text remains unchanged while charts and visual cards bring the system to life.

## ✨ Visual Features

- **Equity Curve Chart** – LIVE vs SIM cumulative returns over time
- **Strategy Score Bars** – Performance breakdown across strategy types
- **Risk Exposure Line Chart** – Real-time margin utilization vs ceiling
- **Decision Flow Area Chart** – Signal scoring progression
- **Audience Metric Cards** – Dummy stats highlighting user profiles
- **Transparency Grid** – Sharpe ratio, max drawdown, winrate, and fee metrics
- **Animated Halo Effects** – Gradient overlays with subtle pulse animations

## 🚀 Getting Started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173). Press `q` in the terminal to stop it.

## 🧪 Quality Checks

```bash
npm run build
```

## 📁 Project Structure

- `src/App.tsx` – Renders the content from `context.md` in structured sections.
- `src/App.css` – Styles for the textual layout, cards, and responsive behavior.
- `src/index.css` – Global variables, fonts, and base styles.
- `context.md` – Source material mirrored on the landing page.

## � Customisation

- Adjust typography, spacing, or gradients in `App.css` without altering the original copy blocks.
- If the copy changes, update `App.tsx` to match exactly—avoid injecting additional text to preserve fidelity.

## 📄 License

MIT
