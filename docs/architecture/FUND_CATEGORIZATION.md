# Fund Categorization System

## Overview

This document describes the automatic fund categorization system that classifies mutual funds into **Equity**, **Debt**, and **Hybrid** categories. As requested, **Alternative funds** (Gold, International, ETF, etc.) are categorized as **Hybrid**.

---

## Categories

### 1. **Equity Funds** 📈

Funds that primarily invest in stocks/equities.

**Keywords Detected:**

- equity, stock
- large cap, mid cap, small cap, multi cap, flexi cap
- focused, sectoral, thematic
- infrastructure, banking, pharma, technology, consumption, manufacturing, energy, auto, fmcg, healthcare, financial services
- index, nifty, sensex, bse
- elss, tax saver
- dividend yield, value, growth, momentum, quality, alpha, contra, opportunities
- bluechip, top 100, top 200, top 250, midcap 150, smallcap 250, multicap 250

**Examples:**

- HDFC Top 100 Fund - Direct Plan - Growth
- SBI Large & Midcap Fund - Regular Plan - Growth
- Axis Midcap Fund - Direct Plan - Growth
- Parag Parikh Flexi Cap Fund - Direct Plan - Growth
- Axis ELSS Tax Saver Fund - Direct Plan - Growth
- UTI Nifty 50 Index Fund - Direct Plan - Growth

---

### 2. **Debt Funds** 🛡️

Funds that primarily invest in fixed-income securities.

**Keywords Detected:**

- debt, bond, income
- gilt, liquid, money market
- ultra short, low duration, short duration, medium duration, long duration
- dynamic bond, corporate bond, credit risk
- banking & psu, overnight, treasury
- government securities, g-sec
- constant maturity, floater
- fixed maturity, fmp, capital protection
- savings, arbitrage, conservative, accrual, credit opportunities

**Examples:**

- HDFC Corporate Bond Fund - Direct Plan - Growth
- ICICI Prudential Liquid Fund - Direct Plan - Growth
- SBI Magnum Gilt Fund - Direct Plan - Growth
- Axis Short Duration Fund - Direct Plan - Growth
- Kotak Banking & PSU Debt Fund - Direct Plan - Growth
- UTI Ultra Short Duration Fund - Direct Plan - Growth

---

### 3. **Hybrid Funds** 💼

Funds that invest in a mix of equity and debt, OR **Alternative funds**.

**Keywords Detected:**

#### Traditional Hybrid

- hybrid, balanced
- aggressive hybrid, conservative hybrid
- dynamic asset allocation, multi asset
- equity savings, balanced advantage, asset allocation
- monthly income, mip
- children, retirement, solution oriented

#### Alternative Funds (Categorized as Hybrid)

- alternative
- gold, silver, commodity
- real estate, reit, invit
- fund of funds, fof
- international, global, overseas, foreign
- emerging markets, developed markets
- china, us equity, nasdaq
- etf

**Examples:**

- HDFC Balanced Advantage Fund - Direct Plan - Growth
- ICICI Prudential Equity & Debt Fund - Direct Plan - Growth
- SBI Equity Savings Fund - Direct Plan - Growth
- Kotak Multi Asset Allocation Fund - Direct Plan - Growth
- **HDFC Gold Fund - Direct Plan - Growth** (Alternative → Hybrid)
- **ICICI Prudential US Bluechip Equity Fund - Direct Plan - Growth** (Alternative → Hybrid)
- **Nippon India ETF Gold BeES** (Alternative → Hybrid)
- **Motilal Oswal Nasdaq 100 Fund of Fund - Direct Plan - Growth** (Alternative → Hybrid)

---

## Categorization Logic

The system uses keyword matching with the following priority:

1. **If fund name matches both Equity AND (Debt OR Hybrid) keywords** → **Hybrid**
   - Example: "Balanced Equity Fund" → Hybrid

2. **If fund name matches only Equity keywords** → **Equity**
   - Example: "Large Cap Fund" → Equity

3. **If fund name matches only Debt keywords** → **Debt**
   - Example: "Liquid Fund" → Debt

4. **If fund name matches only Hybrid keywords** → **Hybrid**
   - Example: "Gold Fund" → Hybrid (Alternative)

5. **If no keywords match** → **Unknown**
   - Requires manual review

---

## Files Created

### 1. **`src/utils/fundCategorization.js`**

Core utility with the following functions:

```javascript
// Categorize a single fund
categorizeFund(fundName) → 'Equity' | 'Debt' | 'Hybrid' | 'Unknown'

// Categorize multiple funds
categorizeFunds(funds) → Array of funds with 'category' property

// Group funds by category
groupFundsByCategory(funds) → { Equity: [], Debt: [], Hybrid: [], Unknown: [] }

// Get statistics
getCategoryStats(funds) → { total, Equity: {count, percentage}, ... }

// Get color codes for UI
getCategoryColor(category) → { bg, text, border, badge, hex }

// Validate categorization
validateCategorization(fundName, expectedCategory) → boolean
```

### 2. **`src/components/FundCategoryPanel.jsx`**

React component that displays fund categorization visually:

- Statistics cards for each category
- Detailed breakdown with color coding
- Icons for each category
- Responsive design

### 3. **`tests/fundCategorizationTest.js`**

Comprehensive test suite with sample funds from all categories.

---

## Integration Guide

### Option 1: Add to Step 1 (Search & Select Funds)

```jsx
import FundCategoryPanel from './FundCategoryPanel';

// Inside Step1SearchFunds component, after selected funds display:
<FundCategoryPanel selectedFunds={selectedFunds} />
```

### Option 2: Add to App.jsx (Global View)

```jsx
import FundCategoryPanel from './components/FundCategoryPanel';

// Inside App.jsx, in the sidebar or main content area:
{selectedFunds.length > 0 && (
    <FundCategoryPanel selectedFunds={selectedFunds} />
)}
```

### Option 3: Add Category Badges to Fund List

```jsx
import { categorizeFund, getCategoryColor } from '../utils/fundCategorization';

// Inside fund mapping:
{selectedFunds.map(fund => {
    const category = categorizeFund(fund.name);
    const colors = getCategoryColor(category);
    
    return (
        <div key={fund.code}>
            <span className={`${colors.badge} text-white px-2 py-1 rounded text-xs`}>
                {category}
            </span>
            {fund.name}
        </div>
    );
})}
```

---

## Testing

Run the test suite to verify categorization:

```bash
node tests/fundCategorizationTest.js
```

Expected output:

- Individual fund categorization
- Batch categorization results
- Grouped funds by category
- Statistics (count and percentage)
- Validation tests
- Color codes for UI

---

## Customization

### Adding New Keywords

Edit `src/utils/fundCategorization.js`:

```javascript
const EQUITY_KEYWORDS = [
    // ... existing keywords
    'your-new-keyword',
];
```

### Changing Category Colors

Edit the `getCategoryColor()` function:

```javascript
Equity: {
    bg: 'bg-blue-100',      // Background color
    text: 'text-blue-800',  // Text color
    border: 'border-blue-300', // Border color
    badge: 'bg-blue-500',   // Badge background
    hex: '#3B82F6'          // Hex color code
}
```

### Handling Unknown Funds

Funds categorized as "Unknown" should be reviewed manually. You can:

1. Add missing keywords to the appropriate category
2. Create a custom mapping for specific fund names
3. Use the validation function to test changes

---

## Database Integration (Optional)

To store categories in Supabase:

### 1. Add Category Column to `fund_master` Table

```sql
ALTER TABLE public.fund_master 
ADD COLUMN category text;

-- Create index for faster queries
CREATE INDEX idx_fund_master_category ON public.fund_master(category);
```

### 2. Update Categories on Fund Selection

```javascript
import { categorizeFund } from '../utils/fundCategorization';
import { supabase } from '../utils/supabase';

const updateFundCategory = async (schemeCode, schemeName) => {
    const category = categorizeFund(schemeName);
    
    await supabase
        .from('fund_master')
        .upsert({
            scheme_code: schemeCode,
            scheme_name: schemeName,
            category: category
        });
};
```

### 3. Query Funds by Category

```javascript
const getEquityFunds = async () => {
    const { data } = await supabase
        .from('fund_master')
        .select('*')
        .eq('category', 'Equity');
    
    return data;
};
```

---

## API Response Enhancement

You can enhance the API responses to include categories:

```javascript
import { categorizeFund } from './utils/fundCategorization';

// When fetching funds from MFAPI
const enrichedFunds = funds.map(fund => ({
    ...fund,
    category: categorizeFund(fund.schemeName)
}));
```

---

## Performance Considerations

- **Keyword matching is case-insensitive** and uses `String.includes()`
- **Time complexity:** O(n × m) where n = number of funds, m = number of keywords
- **For large datasets (>10,000 funds):** Consider caching results or using a database column

---

## Future Enhancements

1. **Machine Learning Classification**
   - Train a model on historical fund data
   - Improve accuracy for edge cases

2. **SEBI Category Mapping**
   - Map to official SEBI fund categories
   - Use fund metadata from AMFI

3. **Sub-category Classification**
   - Equity: Large Cap, Mid Cap, Small Cap, etc.
   - Debt: Liquid, Short Duration, Long Duration, etc.

4. **Risk Profiling**
   - Assign risk levels (Low, Medium, High)
   - Based on category and historical volatility

---

## Support

For questions or issues:

1. Check the test suite for examples
2. Review keyword lists in `fundCategorization.js`
3. Use `validateCategorization()` to debug specific funds

---

## Summary

✅ **Equity Funds:** Stock-based investments  
✅ **Debt Funds:** Fixed-income securities  
✅ **Hybrid Funds:** Mixed allocation + **Alternative Funds**  
✅ **Alternative Funds → Hybrid:** Gold, International, ETF, FoF  

The system is ready to use and can be integrated into any component of your application!
