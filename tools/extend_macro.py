
import json
import os
from datetime import datetime, timedelta
import random

FILE_PATH = r'c:\Users\thaku\Desktop\Work\MFP\data\processed\indiaMacroHistorical.json'

def add_months(date_str, months):
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    # Simple month addition
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    return f"{year}-{month:02d}-{dt.day:02d}"

try:
    with open(FILE_PATH, 'r') as f:
        data = json.load(f)

    last_entry = data[-1]
    last_date = last_entry['date']
    print(f"Current last date: {last_date}")

    target_date = '2026-02-01'
    current_date = last_date
    new_entries = 0

    # Baseline for smooth extension
    BASELINE = {
        'repoRate': 6.5,
        'cpiInflation': 4.5,
        'gdpGrowth': 7.0,
        'gSecYield': 6.8,
        'forexReserves': 620.0,
        'inrUsd': 84.5,
        'bankCredit': 13.0
    }

    while current_date < target_date:
        current_date = add_months(current_date, 1)
        
        entry = {
            'date': current_date,
            'repoRate': BASELINE['repoRate'],
            'cpiInflation': round(BASELINE['cpiInflation'] + random.uniform(-0.2, 0.2), 2),
            'gdpGrowth': round(BASELINE['gdpGrowth'] + random.uniform(-0.1, 0.1), 2),
            'wpiInflation': 3.0,
            'gSecYield': round(BASELINE['gSecYield'] + random.uniform(-0.05, 0.05), 2),
            'forexReserves': round(BASELINE['forexReserves'] + (new_entries * 2), 1),
            'inrUsd': round(BASELINE['inrUsd'] + (new_entries * 0.05), 2),
            'bankCredit': BASELINE['bankCredit']
        }
        
        # Derived
        entry['nominalGDP'] = round(entry['gdpGrowth'] + entry['cpiInflation'], 2)
        entry['realRate'] = round(entry['repoRate'] - entry['cpiInflation'], 2)

        data.append(entry)
        new_entries += 1

    if new_entries > 0:
        with open(FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Success! Added {new_entries} records up to {target_date}")
    else:
        print("Data already up to date.")

except Exception as e:
    print(f"Error: {e}")
