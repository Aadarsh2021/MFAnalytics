# Regime-Constrained Portfolio Optimization Guide

## Overview

The MFP Portfolio Advisor now supports **Regime-Constrained Optimization**. This advanced feature uses a Bayesian Macro AI engine to detect the current global market regime and automatically apply SEBI-compliant allocation constraints.

## Using the Regime Path

### 1. Choose Your Path

In Step 4, select **"Regime-Constrained Path (Strict)"**. This path is recommended for risk-averse investors or during periods of high macro uncertainty.

### 2. Market Regime Detection

- **Pre-loaded Data**: Use the "Load Pre-loaded US Data" button to use the curated 2002-2025 dataset.
- **Custom Upload**: Upload your own macro indicators (CSV format) to detect the regime for your specific region or date.
- **Indicator Breakdown**: Review the z-scores and probabilities for each of the 4 regimes:
  - **Regime A (Growth)**: Pro-cyclical, high equity exposure.
  - **Regime B (Inflationary Growth)**: Commodities and inflation-linked assets.
  - **Regime C (Fiscal Stress)**: Higher gold and short-duration debt.
  - **Regime D (Crisis)**: Maximum defensiveness and liquidity.

### 3. Allocation Bands

Once a regime is detected, the system will apply specific **SEBI-aligned bands**:

- **Equity**: 0% - 90% (Regime dependent)
- **Gold**: 0% - 20% (Maximized in Regime C/D)
- **Debt**: Short vs Medium duration split based on inflation volatility.

### 4. Historical Backtesting

Before optimizing, run a backtest to see how this specific strategy performed during historical events like the 2008 Lehman collapse or 2020 COVID lockdowns.

---

## Flexible Path (Black-Litterman Alerts)

If you prefer the **Black-Litterman Path**, the system still monitors the macro regime in the background. If your optimized portfolio deviates significantly from the recommended regime allocation, a **Regime Alert Modal** will appear in the Final Report with specific suggestions to rebalance.
