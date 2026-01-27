# Backend Data Processing Scripts

This directory contains Python and Node.js scripts for fetching, processing, and converting macroeconomic data.

## Scripts

### Python Scripts

- **`fetchIndianData.py`** - Fetches Indian macroeconomic data from FRED API
  - Output: `data/processed/indiaMacroHistorical.json`
  - Data includes: CPI, GDP, Forex Reserves, INR/USD, Repo Rate, G-Sec Yields
  - Coverage: 2002-2025

- **`convertCSVtoJSON.py`** - Converts CSV files to JSON format
  - Processes raw CSV data from `data/raw/us-macro/`
  - Generates structured JSON for use in application

- **`parseAllData.py`** - Consolidates all macro data sources
  - Merges US and Indian macro data
  - Creates unified dataset for analysis

### Node.js Scripts (in `../scripts/`)

See `../scripts/` directory for Node.js-based data processing utilities.

## Usage

Run from project root:

```bash
# Fetch Indian macro data
python backend/data-processing/fetchIndianData.py

# Convert CSV to JSON
python backend/data-processing/convertCSVtoJSON.py

# Parse all data
python backend/data-processing/parseAllData.py
```

## Requirements

- Python 3.x
- `requests` library: `pip install requests`
- FRED API key (already configured in scripts)
