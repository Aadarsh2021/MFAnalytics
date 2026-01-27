# MFAnalytics: Institutional-Grade Portfolio Intelligence 🏛️📈

A state-of-the-art portfolio advisory and optimization platform designed for the Indian Mutual Fund ecosystem. It combines macroeconomic regime detection, Quant-based optimization (Black-Litterman), and professional-grade historical backtesting.

## 🚀 A to Z Feature List

### 🔍 1. Discovery & Data Acquisition

- **Live Mutual Fund Search**: Search across 10,000+ Indian Mutual Funds using the [MFAPI.in](https://www.mfapi.in/) gateway.
- **Automated NAV Fetching**: One-click historical NAV retrieval for multi-fund comparison.
- **Data Quality Scoring**: Integrated validation for missing dates, data gaps, and dividend adjustments.
- **CSV Data Import**: Support for custom fund data and benchmark indices.

### 🛡️ 2. Macro Regime Intelligence (The 6-Pillar Engine)

- **Dynamic Regime Detection**: Identifies 4 distinct market states (A: Normal, B: Overheated, C: Crisis, D: Recovery).
- **Multi-Pillar Scoring**:
  - **Volatility Ratio (Lead)**: Rolling Growth Vol vs. Inflation Vol.
  - **Credit Stress Tracker**: Tracking yields and credit spreads.
  - **Bond-Equity Correlation**: Analyzing the effectiveness of debt as a hedge.
  - **Real Policy Rates**: Monetary discipline monitor.
  - **Inflation Trajectory**: Consumer price stability index.
  - **Institutional Sentiment**: Monitoring Central Bank gold reserves.
- **Hysteresis & Debouncing**: 3-month smoothing logic to prevent "whipsaw" transitions in portfolio restructuring.

### 🇮🇳 3. Indian Expression Layer

- **SEBI-Aligned Strategy**: Translates global macro signals into India-specific asset class targets.
- **Dynamic Equity Bias**: Shifts equity exposure between 40% and 75% based on growth/inflation dynamics.
- **Smart Debt Sourcing**:
  - **DEBT_SHORT**: Liquidity, Overnight, and Low Duration funds for defensive play.
  - **DEBT_MEDIUM**: Short Term and Corporate Bond funds for yield harvesting.
  - **DEBT_LONG**: Gilt and Long Duration funds for duration-based returns in falling rate regimes.
- **Gold & Hybrid Integration**: Automatic inclusion for inflation protection and balanced stability.

### ⚖️ 4. Advanced Portfolio Optimization

- **MVP (Mean-Variance) Suite**: Support for SQP, Convex, and Critical Line optimization methods.
- **Black-Litterman Engine**: Combines market equilibrium with active "User Views".
- **View-Integrated Tilting**:
  - **Absolute Views**: High confidence annual return targets for specific funds.
  - **Relative Views**: Outperformance/Underperformance views (e.g., Fund A vs Fund B).
- **Regime-Constrained Bands**: Tilt-engine strictly respects safety floor (min) and ceiling (max) weights defined by the current market regime.

### 📊 5. Executive Backtesting Suite

- **23-Year Historical Simulation**: Backtest strategies from 2002 to present using unified US/India macro data.
- **Performance Narrative**: Detailed breakdown of CAGR, Absolute Gains, and Sharpe Ratio.
- **Regime Transition Report**: Detailed timeline of every regime shift in history (2008 GFC, 2020 COVID, etc.).
- **Capital Growth Simulation**: Precision compounding of daily returns for a realistic $100k capital growth visualization.
- **State Count Analysis**: Frequency of various regimes during annual rebalancing points.

### 🎨 6. Premium UI/UX Features

- **Six Pillars Dashboard**: Real-time visualization of individual macro scores.
- **Glassmorphic Design**: Modern, clean, and intuitive dark-themed interface.
- **Interactive Recharts**: Dynamic, hover-enabled performance charts with historical markers.
- **Responsive Navigation**: Step-by-step workflow (Setup → Macro → Views → Optimize → Report).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Visualization**: Recharts, Lucide Icons
- **Calculations**: Matrix Algebra (Internal), Python (Pre-processing)
- **Deployment**: Firebase Hosting
- **Repository**: GitHub (CI/CD Ready)

## 📐 Project Architecture

```plaintext
MFAnalytics/
├── src/
│   ├── components/       # Dashboard, Backtest, Pillar visualizations
│   ├── utils/            # Calculation Engines (Regimes, BL, Backtest)
│   ├── config/           # Regime bands, Asset class mapping
│   └── data/             # Processed Historical Macro JSONs
├── backend/
│   ├── data-processing/  # NAV Fetching & Macro cleaning scripts
│   └── scripts/          # Sanity & verification suites
└── docs/                 # Original PDF requirements & architecture
```

## 🚀 Getting Started

1. `npm install`
2. `npm run dev`
3. `npm run build`
4. `firebase deploy`

---

## 🔗 Data Citations

- NAV Data: [MFAPI](https://www.mfapi.in/)
- US Macro: Federal Reserve (FRED)
- Indian Macro: RBI DBIE

## 🛡️ License

MIT - Developed for Professional Asset Management.
