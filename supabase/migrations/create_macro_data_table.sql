-- Supabase Table Setup for India Macro Data
-- Run this SQL in Supabase SQL Editor: https://supabase.com/dashboard/project/aqlomkilvvsvdrfwcspm/sql

-- Drop existing table if it exists (optional - only if you want fresh start)
-- DROP TABLE IF EXISTS macro_data;

-- Create macro_data table with all required columns
CREATE TABLE IF NOT EXISTS macro_data (
  id BIGSERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Inflation Indicators
  wpi_index DECIMAL(10, 2),
  wpi_inflation DECIMAL(10, 2),
  cpi_index DECIMAL(10, 2),
  cpi_inflation DECIMAL(10, 2),
  
  -- Interest Rates
  repo_rate DECIMAL(10, 2),
  real_rate DECIMAL(10, 2),
  gsec_yield DECIMAL(10, 2),
  
  -- GDP Indicators
  nominal_gdp DECIMAL(15, 2),
  real_gdp DECIMAL(15, 2),
  
  -- External Sector
  forex_reserves DECIMAL(15, 2),
  inr_usd DECIMAL(10, 4),
  
  -- Credit
  bank_credit DECIMAL(15, 2),
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on country and date
  UNIQUE(country, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_macro_data_country_date ON macro_data(country, date DESC);
CREATE INDEX IF NOT EXISTS idx_macro_data_updated_at ON macro_data(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE macro_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON macro_data
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated insert/update
CREATE POLICY "Allow authenticated insert" ON macro_data
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON macro_data
  FOR UPDATE
  USING (true);

-- Insert sample data (optional - for testing)
INSERT INTO macro_data (
  country, date, 
  wpi_index, wpi_inflation, 
  cpi_index, cpi_inflation,
  repo_rate, real_rate,
  nominal_gdp, real_gdp,
  gsec_yield, forex_reserves,
  inr_usd, bank_credit
) VALUES (
  'India', '2026-01-02',
  142.5, 0.83,
  138.2, -0.14,
  5.15, 5.29,
  NULL, NULL,
  NULL, 581.19,
  NULL, NULL
)
ON CONFLICT (country, date) 
DO UPDATE SET
  wpi_index = EXCLUDED.wpi_index,
  wpi_inflation = EXCLUDED.wpi_inflation,
  cpi_index = EXCLUDED.cpi_index,
  cpi_inflation = EXCLUDED.cpi_inflation,
  repo_rate = EXCLUDED.repo_rate,
  real_rate = EXCLUDED.real_rate,
  updated_at = NOW();

-- Verify table creation
SELECT * FROM macro_data ORDER BY date DESC LIMIT 5;
