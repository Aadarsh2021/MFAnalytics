# Portfolio Optimizer - Logic Notes

## Fund Categorization Logic

The system automatically categorizes mutual funds based on keywords in their names. This happens in two layers: **Asset Class** and **Category**.

### 1. Asset Class Classification

Funds are grouped into four primary asset classes:

- **Gold**: Keywords like `gold`, `silver`, `precious metal`, `commodity`.
- **Equity**: Keywords like `equity`, `stock`, `large cap`, `mid cap`, `small cap`, `index`, `nifty`, `sensex`, `etf`, `tax saver`, `elss`.
- **Debt**: Keywords like `bond`, `gilt`, `liquid`, `money market`, `corporate bond`, `duration`, `debt`.
- **Alt**: Any fund that doesn't match the above is categorized as Alternative.

### 2. Sub-Category Classification

Provides granular identification (e.g., `Large Cap`, `Mid Cap`, `Liquid`, `ELSS`). If no specific sub-category keywords match, it defaults to `Other`.

---

## Data Quality Ranking

The system assigns a quality score to each fund to help users select reliable data for optimization:

| Quality | Criteria | Recommendation |
| :--- | :--- | :--- |
| **Excellent** | Asset Class is verified AND Sub-Category is NOT `Other`. | **Best for Optimization**. Highly reliable metadata and history. |
| **Good** | Asset Class is verified (Equity/Debt) but Category is `Other`. | **Safe to use**. Core asset class is known even if specifics are generic. |
| **Poor** | Asset Class is `Alt` or `Unknown`. | **Use with Caution**. Likely has sparse history or unclear classification. |

---

## Auto-Selection Logic (Updated)

The "⚡ Auto" button prioritizes balance and reliability:

1. It looks for **Excellent** and **Good** funds first.
2. It tries to pick up to 4 funds from each asset class to ensure diversification.
3. It only picks **Poor** funds (max 2) if a requested asset class has no high-quality alternatives.

---

## Data Sourcing

- **Default Range**: 3 Years of historical NAV data.
- **Source**: Primarily [MFAPI.in](https://www.mfapi.in/), with [Yahoo Finance](https://finance.yahoo.com/) as a fallback for missing data.
