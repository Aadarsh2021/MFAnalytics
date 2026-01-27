# Portfolio Advisor - Institutional Grade 🏛️

Professional portfolio optimization tool with comprehensive tracking, regime detection, and institutional-grade backtesting.

## ✨ Core Features

### 1. 🛡️ 6-Pillar Regime Detection Engine

A robust macroeconomic scanner that identifies 4 distinct market states (A, B, C, D) using a weighted 6-pillar approach:

- **Volatility Ratio (30%)**: Growth Vol / Inflation Vol (Core Lead Indicator)
- **Debt Stress (20%)**: Credit spreads and funding liquidity
- **Bond-Equity Correlation (15%)**: Hedge effectiveness tracking
- **Real Policy Rates (15%)**: Monetary policy discipline
- **Inflation Volatility (10%)**: Stable pricing vs Loss of Control
- **CB Gold Buying (10%)**: Central Bank safety sentiment

### 2. 🇮🇳 Indian Expression Layer

Translates global macro regimes into actionable Indian market strategies:

- **Equity Bias**: Dynamic shifts between 40-75% based on growth momentum.
- **Debt Strategy**: Automatic switches between Short Duration, Medium Term, and Gilt (DEBT_LONG) funds.
- **Liquidity Constraints**: Integrated SEBI category mapping for Indian Mutual Funds.

### 3. 📊 Advanced Historical Backtest

Comprehensive "Executive Report" generation covering 2002 to Present:

- **Financial Performance**: CAGR, Absolute Gains, and Max Drawdown tracking.
- **Market Transitions**: Year-by-year breakdown of regime states.
- **Debouncing Logic**: Explained hysteresis and "Transition Sensitivity" for model stability.

### 4. ⚖️ View-Integrated Optimization

Enhanced Black-Litterman engine that incorporates user market views as "Tilts" while strictly respecting Regime-Based safety bands.

## 🛠️ Tech Stack

- **React 18 / Vite** - High-performance frontend
- **TailwindCSS** - Premium glassmorphic UI
- **Recharts** - Dynamic financial visualization
- **Lucide React** - Modern iconography
- **Python / Node** - Backend data processing & NAV fetching

## 📐 Project Structure

```plaintext
MFP/
├── backend/
│   ├── data-processing/    # Python & JS logic for Macro/NAV data
│   └── scripts/            # Verification & utility tools
├── data/
│   ├── processed/          # Integrated US & Indian Historical JSONs
│   └── raw/                # Source CSVs for transparency
├── src/
│   ├── components/         # Premium UI Components (SixPillars, BacktestResults)
│   ├── utils/              # Calculation Engines (backtestEngine, regimeDetector)
│   ├── config/             # Regime/Asset Class configurations
│   └── contexts/           # Global state management
├── docs/                   # Architecture and PDF requirements
└── tools/                  # Build and deployment toolkits
```

## 🚀 Getting Started

1. **Install Dependencies**: `npm install`
2. **Run Development**: `npm run dev`
3. **Build Production**: `npm run build`
4. **Deploy**: `firebase deploy`

## 📊 Workflow

1. **Selection**: Choose from 10,000+ Indian Mutual Funds.
2. **Detection**: Run the **6-Pillar Engine** to identify the current market cycle.
3. **View Setting**: Express custom market views (Absolute or Relative).
4. **Optimization**: Run the **Tilt-Engine** to generate the optimal portfolio within regime bands.
5. **Backtest**: Verify the strategy against 23 years of historical data.

## 🔗 Data Sources

- [MFAPI.in](https://www.mfapi.in/) - Real-time Indian NAVs
- RBI DBIE & Federal Reserve - Macroeconomic Indicators

## 🛡️ License

MIT
