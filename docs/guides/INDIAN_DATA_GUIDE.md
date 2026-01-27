# How to Fetch Real Indian Macro Data

## Current Status

⚠️ **The current `indiaMacroHistorical.json` contains SIMULATED data** generated using mathematical models to mimic realistic economic patterns. This is suitable for **development and testing** but should be replaced with actual data for production use.

## Option 1: Manual Download from RBI (Recommended)

### Step-by-Step Guide

1. **Visit RBI Database**
   - Go to: <https://dbie.rbi.org.in>

2. **Download Individual Indicators**

   | Indicator | Navigation Path | Table Code |
   | --- | --- | --- |
   | **Repo Rate** | Statistics → Money Market → Policy Rates | Table 2 |
   | **GDP Growth** | Statistics → National Accounts → GDP | Table 41 |
   | **CPI Inflation** | Statistics → Prices & Inflation → CPI | Table 36 |
   | **WPI Inflation** | Statistics → Prices & Inflation → WPI | Table 38 |
   | **10Y G-Sec Yield** | Statistics → Government Securities Market | Table 19 |
   | **Foreign Reserves** | Statistics → External Sector → Reserves | Table 5 |
   | **INR/USD Rate** | Statistics → External Sector → Exchange Rates | Table 9 |
   | **Bank Credit** | Statistics → Banking → Credit | Table 14 |

3. **Download Format**
   - Select "Excel" or "CSV" option
   - Choose date range: 2002-01-01 to 2025-12-31
   - Download each indicator separately

4. **Place Files**
   - Create folder: `data/india/raw/`
   - Save files as:
     - `RepoRate.csv`
     - `GDP.csv`
     - `CPI.csv`
     - `WPI.csv`
     - `GSec10Y.csv`
     - `ForexReserves.csv`
     - `INRUSD.csv`
     - `BankCredit.csv`

5. **Run Consolidation Script**

   ```bash
   node scripts/consolidateIndianMacro.mjs
   ```

   This will process all CSVs and generate `indiaMacroHistorical.json`

---

## Option 2: Using Trading Economics API (Paid)

### Setup

```bash
npm install tradingeconomics
```

### API Key

- Sign up at: <https://tradingeconomics.com/api>
- Get API key (starts at $150/month)

### Fetch Data

```javascript
const te = require('tradingeconomics');
te.login('YOUR_API_KEY:YOUR_SECRET');

// Fetch indicators
te.getHistoricalData(country='India', indicator='GDP', initDate='2002-01-01')
```

---

## Option 3: Data.gov.in APIs (Free, Limited)

Some indicators are available via Open Government Data platform:

### Examples

- CPI: <https://api.data.gov.in/resource/>...
- Industrial Production: <https://api.data.gov.in/resource/>...

**Limitation**: Not all macro indicators are available via APIs.

---

## Current Simulated Data Features

The sample data includes realistic patterns for:

- **2008-2009**: Financial crisis (GDP drop, rate cuts)
- **2013**: Taper tantrum (INR depreciation)
- **2020**: COVID lockdown (GDP contraction)
- **2022-2023**: RBI tightening cycle (repo rate hikes)

This is useful for **demonstrating the system** but should not be used for actual investment decisions.

---

## Recommendation

For **production deployment**:

1. Download actual RBI data manually (free, but manual effort)
2. Or subscribe to Trading Economics API (automated, but paid)
3. Update `indiaMacroHistorical.json` with real data
4. Re-deploy to Firebase
