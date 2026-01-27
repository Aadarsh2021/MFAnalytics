# Macro Data Format Specification

The Regime Detection engine expects CSV files with at least two columns: **date** and **value**. The system automatically consolidates multiple files based on their filename indicator.

## Required Indicators & Filename Patterns

To use custom data, name your CSV files matching these patterns:

| Indicator | Expected Filename Pattern | Description |
| --- | --- | --- |
| Real Rate | `FEDFUNDS.csv` / `RealRate.csv` | Real interest rates (inflation-adjusted) |
| Growth | `GDPC1.csv` / `GDP.csv` | Real GDP or Growth proxy |
| Inflation | `CPIAUCSL.csv` / `PCE.csv` | Consumer Price Index or PCE |
| Volatility | `VIXCLS.csv` / `SP500.csv` | VIX index or S&P 500 (for realized vol) |
| Debt | `WALCL.csv` / `Debt.csv` | Central Bank Balance Sheet or Debt/GDP |
| Yield Curve | `T10Y2Y.csv` | 10-Year vs 2-Year Treasury spread |

## Data Consolidation Logic

1. **Alignment**: All data is frequency-aligned to a monthly series using forward-fill.
2. **Normalization**: The engine calculates **rolling z-scores** (default 60-month window).
3. **Derived Metrics**:
   - `volatilityRatio`: Month-over-month change in realized volatility.
   - `realRate`: Nominal rate minus inflation expectations.
   - `debtStress`: Percentage change in central bank assets.

## CSV Format Example

```csv
observation_date,value
2024-01-01,2.5
2024-02-01,2.6
2024-03-01,2.4
```

*Note: Date formats supported: `YYYY-MM-DD`, `DD-MM-YYYY`, and `MM/DD/YYYY`.*
