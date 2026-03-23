# Supabase Table Setup Guide

## 🎯 Quick Setup (5 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: <https://supabase.com/dashboard/project/aqlomkilvvsvdrfwcspm/sql>
2. Click **"New query"**

### Step 2: Run Migration SQL

1. Open file: `supabase/migrations/create_macro_data_table.sql`
2. Copy all SQL code
3. Paste into Supabase SQL Editor
4. Click **"Run"** button

### Step 3: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM macro_data ORDER BY date DESC LIMIT 5;
```

You should see sample data with India's latest macro indicators.

---

## 📊 Table Structure

**Table Name:** `macro_data`

**Columns:**

- `id` - Auto-increment primary key
- `country` - Country name (e.g., "India")
- `date` - Data date
- `wpi_index` - Wholesale Price Index
- `wpi_inflation` - WPI inflation rate (%)
- `cpi_index` - Consumer Price Index
- `cpi_inflation` - CPI inflation rate (%)
- `repo_rate` - RBI repo rate (%)
- `real_rate` - Real interest rate (%)
- `gsec_yield` - 10-year G-Sec yield (%)
- `nominal_gdp` - Nominal GDP
- `real_gdp` - Real GDP
- `forex_reserves` - Forex reserves ($ billions)
- `inr_usd` - INR/USD exchange rate
- `bank_credit` - Bank credit to private sector
- `updated_at` - Last update timestamp

**Unique Constraint:** `(country, date)` - prevents duplicates

---

## 🔒 Security (RLS Policies)

**Read Access:** Public (anyone can read)  
**Write Access:** Authenticated users only

---

## ✅ After Setup

1. **Test GitHub Actions workflow:**
   - Go to Actions tab
   - Run "Update India Macro Data"
   - Verify Supabase step succeeds

2. **Verify data in Supabase:**

   ```sql
   SELECT * FROM macro_data 
   WHERE country = 'India' 
   ORDER BY date DESC 
   LIMIT 1;
   ```

3. **Check live data in app:**
   - Click "Update Live (API)" button
   - Verify latest data shows correctly

---

## 🎯 Expected Result

After running workflow:

- ✅ Static data updated (JSON file)
- ✅ Live data updated (Supabase table)
- ✅ Both use 3-tier priority
- ✅ Website deployed with latest data

**Total time:** ~2-3 minutes per update  
**Your work:** ZERO (automatic monthly)

---

## 🚨 Troubleshooting

**Error: "table already exists"**

- Table is already created
- Skip to Step 3 (verify)

**Error: "permission denied"**

- Check you're logged into correct Supabase project
- Verify project ID: `aqlomkilvvsvdrfwcspm`

**Error: "column not found"**

- Drop and recreate table:

  ```sql
  DROP TABLE IF EXISTS macro_data CASCADE;
  ```

- Then run migration again

---

## 📞 Quick Reference

**Supabase Project:** aqlomkilvvsvdrfwcspm  
**SQL Editor:** <https://supabase.com/dashboard/project/aqlomkilvvsvdrfwcspm/sql>  
**Table Browser:** <https://supabase.com/dashboard/project/aqlomkilvvsvdrfwcspm/editor>  

**Migration File:** `supabase/migrations/create_macro_data_table.sql`  
**Update Script:** `backend/scripts/updateSupabaseData.mjs`
