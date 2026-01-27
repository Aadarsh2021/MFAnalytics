import json
import csv
from datetime import datetime

def parse_csv(filepath):
    """Parse CSV and return list of dicts"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return [row for row in reader if any(row.values())]
    except Exception as e:
        print(f"⚠️  Error reading {filepath}: {e}")
        return []

print("📂 Reading ALL CSV files from Data_For_Model...")

# Parse ALL CSV files
fed_funds = parse_csv('Data_For_Model/FED FUNDS EFFECTIVE RATE.csv')
real_gdp = parse_csv('Data_For_Model/Real GDP Raw Data.csv')
sp500 = parse_csv('Data_For_Model/S&P 500 Historical Data.csv')
bond_10y = parse_csv('Data_For_Model/United States 10-Year Bond Yield Historical Data.csv')
real_policy_rate = parse_csv('Data_For_Model/USD Real Policy Rate- 1.csv')
cpi_volatility = parse_csv('Data_For_Model/US CPI Inflation Volatility.csv')
fed_interest_exp = parse_csv('Data_For_Model/US FED Interest Expenses Data.csv')
debt_gdp = parse_csv('Data_For_Model/FED DEBT to GDP.csv')
pcepi = parse_csv('Data_For_Model/PCEPI.csv')

print(f"✅ FED Funds: {len(fed_funds)} records")
print(f"✅ Real GDP: {len(real_gdp)} records")
print(f"✅ S&P 500: {len(sp500)} records")
print(f"✅ 10Y Bond Yield: {len(bond_10y)} records")
print(f"✅ Real Policy Rate: {len(real_policy_rate)} records")
print(f"✅ CPI Volatility: {len(cpi_volatility)} records")
print(f"✅ FED Interest Exp: {len(fed_interest_exp)} records")
print(f"✅ Debt/GDP: {len(debt_gdp)} records")
print(f"✅ PCEPI: {len(pcepi)} records")

# Helper to find matching record by date
def find_by_date(data_list, target_date, date_field='Date', tolerance_days=90):
    """Find closest matching record within tolerance"""
    if not data_list:
        return None
    
    target_dt = datetime.strptime(target_date, '%Y-%m-%d')
    closest = None
    min_diff = float('inf')
    
    for row in data_list:
        date_str = row.get(date_field, '')
        if not date_str:
            continue
        
        try:
            # Try different date formats
            if '-' in date_str:
                parts = date_str.split('-')
                if len(parts) == 3:
                    # Check if MM-DD-YYYY or YYYY-MM-DD
                    if len(parts[0]) == 4:
                        row_dt = datetime.strptime(date_str, '%Y-%m-%d')
                    else:
                        row_dt = datetime.strptime(date_str, '%m-%d-%Y')
                else:
                    continue
            else:
                continue
            
            diff = abs((target_dt - row_dt).days)
            if diff < min_diff:
                min_diff = diff
                closest = row
        except:
            continue
    
    return closest if min_diff <= tolerance_days else None

# Create combined data
combined = []

for row in fed_funds:
    date_str = row.get('Date', '')
    if not date_str:
        continue
    
    # Parse date: 01-01-2002 → 2002-01-01
    parts = date_str.split('-')
    if len(parts) != 3:
        continue
    
    month, day, year = parts
    iso_date = f"{year}-{month.zfill(2)}-01"
    
    # Base entry from FED Funds
    entry = {
        "date": iso_date,
        "repoRate": float(row.get('FEDFUNDS') or 0),
        "cpiInflation": float(row.get('CPIAUCSL') or 0),
        "gdpGrowth": 0,
        "wpiInflation": float(row.get('CPIAUCSL') or 0),
        "gSecYield": 0,
        "forexReserves": 0,
        "inrUsd": 0,
        "bankCredit": 0
    }
    
    # GDP Growth (quarterly)
    gdp_match = find_by_date(real_gdp, iso_date, 'observation_date')
    if gdp_match:
        entry['gdpGrowth'] = float(gdp_match.get('GDPC1') or 0)
    
    # S&P 500
    sp_match = find_by_date(sp500, iso_date)
    if sp_match:
        price_str = (sp_match.get('Price') or sp_match.get('Close') or '0').replace(',', '')
        entry['sp500Close'] = float(price_str) if price_str else 0
    
    # 10Y Bond Yield
    bond_match = find_by_date(bond_10y, iso_date)
    if bond_match:
        bond_val = bond_match.get('Price') or bond_match.get('Close') or '0'
        if isinstance(bond_val, str):
            bond_val = bond_val.replace('%', '').replace(',', '')
        entry['gSecYield'] = float(bond_val) if bond_val else 0
    
    # Real Policy Rate
    rpr_match = find_by_date(real_policy_rate, iso_date)
    if rpr_match:
        entry['realPolicyRate'] = float(rpr_match.get('USD Real Policy Rate') or 0)
    
    # Debt to GDP
    debt_match = find_by_date(debt_gdp, iso_date)
    if debt_match:
        debt_val = debt_match.get('GFDEGDQ188S') or debt_match.get('Value') or 0
        entry['debtToGDP'] = float(debt_val) if debt_val else 0
    
    # PCEPI (inflation alternative)
    pce_match = find_by_date(pcepi, iso_date)
    if pce_match:
        pce_val = pce_match.get('PCEPI') or pce_match.get('Value') or 0
        entry['pceInflation'] = float(pce_val) if pce_val else 0
    
    combined.append(entry)

# Remove duplicates and sort
seen_dates = set()
unique_combined = []
for entry in combined:
    if entry['date'] not in seen_dates:
        seen_dates.add(entry['date'])
        unique_combined.append(entry)

unique_combined.sort(key=lambda x: x['date'])

# Write JSON
output_path = 'src/data/usMacroHistorical.json'
with open(output_path, 'w') as f:
    json.dump(unique_combined, f, indent=2)

print(f"\n✅ Created {output_path}")
print(f"📊 Total unique records: {len(unique_combined)}")
if unique_combined:
    print(f"📅 Date range: {unique_combined[0]['date']} to {unique_combined[-1]['date']}")
print(f"\n✨ Done! ALL {9} CSV files integrated into US macro data!")

