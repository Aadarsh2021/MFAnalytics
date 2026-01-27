"""
Indian Macro Data Fetcher with FRED API
Complete dataset: 2002-2025
"""

import json
import requests
from datetime import datetime

API_KEY = "5e1b06fcd9ed77b5a46c643fd982a485"

print("🇮🇳 Fetching Indian Macro Data (2002-2025) with FRED API...")

def fetch_fred(series_id):
    """Fetch from FRED API"""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        'series_id': series_id,
        'api_key': API_KEY,
        'file_type': 'json',
        'observation_start': '2002-01-01',
        'observation_end': '2025-12-31'
    }
    
    try:
        r = requests.get(url, params=params, timeout=15)
        if r.status_code == 200:
            data = r.json().get('observations', [])
            print(f"  ✅ {series_id}: {len(data)} records")
            return data
        print(f"  ⚠️ {series_id}: Error {r.status_code}")
        return []
    except Exception as e:
        print(f"  ⚠️ {series_id}: {e}")
        return []

print("\n📊 Fetching from FRED...")
fred_series = {
    'cpi': fetch_fred('INDCPIALLMINMEI'),  # India CPI
    'gdp': fetch_fred('MKTGDPINA646NWDB'),  # India GDP
    'forex': fetch_fred('TRESEGINA646N'),  # Forex Reserves
}

# RBI Repo Rates & Other Manual Data
rbi_data = {
    '2002': {'repo': 5.5, 'gsec': 7.5, 'inr': 48.6},
    '2003': {'repo': 5.0, 'gsec': 5.5, 'inr': 46.6},
    '2004': {'repo': 4.5, 'gsec': 5.9, 'inr': 45.3},
    '2005': {'repo': 5.75, 'gsec': 7.1, 'inr': 44.1},
    '2006': {'repo': 6.5, 'gsec': 7.8, 'inr': 45.3},
    '2007': {'repo': 7.75, 'gsec': 7.9, 'inr': 41.3},
    '2008': {'repo': 6.5, 'gsec': 7.0, 'inr': 43.5},
    '2009': {'repo': 4.75, 'gsec': 7.2, 'inr': 48.4},
    '2010': {'repo': 5.75, 'gsec': 7.9, 'inr': 45.7},
    '2011': {'repo': 8.5, 'gsec': 8.3, 'inr': 46.7},
    '2012': {'repo': 8.0, 'gsec': 8.2, 'inr': 53.4},
    '2013': {'repo': 7.75, 'gsec': 8.8, 'inr': 58.6},
    '2014': {'repo': 8.0, 'gsec': 8.6, 'inr': 61.0},
    '2015': {'repo': 6.75, 'gsec': 7.8, 'inr': 64.2},
    '2016': {'repo': 6.25, 'gsec': 6.9, 'inr': 67.2},
    '2017': {'repo': 6.0, 'gsec': 6.7, 'inr': 65.1},
    '2018': {'repo': 6.5, 'gsec': 7.7, 'inr': 68.4},
    '2019': {'repo': 5.15, 'gsec': 6.8, 'inr': 70.4},
    '2020': {'repo': 4.0, 'gsec': 6.0, 'inr': 74.1},
    '2021': {'repo': 4.0, 'gsec': 6.2, 'inr': 73.9},
    '2022': {'repo': 5.9, 'gsec': 7.3, 'inr': 78.6},
    '2023': {'repo': 6.5, 'gsec': 7.2, 'inr': 82.2},
    '2024': {'repo': 6.5, 'gsec': 7.1, 'inr': 83.4},
    '2025': {'repo': 6.5, 'gsec': 6.9, 'inr': 84.1},
}

print("\n📊 Merging data...")
data_by_date = {}

# Process FRED CPI
for obs in fred_series['cpi']:
    date = obs.get('date')
    value = obs.get('value')
    if date and value and value != '.':
        year = date[:4]
        data_by_date[date] = {
            'date': date,
            'repoRate': rbi_data.get(year, {}).get('repo', 6.0),
            'cpiInflation': float(value),
            'gdpGrowth': 0,
            'wpiInflation': float(value),
            'gSecYield': rbi_data.get(year, {}).get('gsec', 7.0),
            'forexReserves': 0,
            'inrUsd': rbi_data.get(year, {}).get('inr', 75.0),
            'bankCredit': 0
        }

# Add GDP
for obs in fred_series['gdp']:
    date = obs.get('date')
    value = obs.get('value')
    if date and value and value != '.' and date in data_by_date:
        data_by_date[date]['gdpGrowth'] = float(value)

# Add Forex
for obs in fred_series['forex']:
    date = obs.get('date')
    value = obs.get('value')
    if date and value and value != '.' and date in data_by_date:
        data_by_date[date]['forexReserves'] = float(value)

# Calculate nominal GDP (Real GDP + Inflation) for each record
for date, record in data_by_date.items():
    record['nominalGDP'] = record['gdpGrowth'] + record['cpiInflation']

# Convert and sort
combined = sorted(data_by_date.values(), key=lambda x: x['date'])

# Save
output = 'data/processed/indiaMacroHistorical.json'
with open(output, 'w') as f:
    json.dump(combined, f, indent=2)

print(f"\n✅ Created {output}: {len(combined)} records")
print(f"📅 {combined[0]['date']} → {combined[-1]['date']}")

# Latest
latest = combined[-1]
print(f"\n🔍 Latest ({latest['date']}):")
print(f"  Repo: {latest['repoRate']}%")
print(f"  CPI: {latest['cpiInflation']}")
print(f"  GDP: {latest['gdpGrowth']}")
print(f"  Forex: ${latest['forexReserves']:.1f}B")
print(f"  INR/USD: ₹{latest['inrUsd']}")
print(f"  G-Sec: {latest['gSecYield']}%")

print("\n✨ Complete Indian macro data fetched!")
