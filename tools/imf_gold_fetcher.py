import requests
import pandas as pd
from datetime import datetime

def fetch_from_imf(country_code, start_year):
    """Primary Source: IMF Official API"""
    base_url = "https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/IFS"
    # Indicator: 1G_GOLD_OZ_T (Gold, Million Fine Troy Ounces)
    series = f"M.{country_code}.1G_GOLD_OZ_T"
    url = f"{base_url}/{series}?startPeriod={start_year}"
    
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    data = response.json()
    
    observations = data['CompactData']['DataSet']['Series']['Obs']
    return [observations] if isinstance(observations, dict) else observations

def fetch_from_dbnomics(country_code, start_year):
    """Fallback Source: DBnomics (Multiple series IDs)"""
    # Attempting two common indicator codes for Gold Reserves in IFS
    for indicator in ["RAXG_OZT", "1G_GOLD_OZ_T"]:
        try:
            series_code = f"IMF/IFS/M.{country_code}.{indicator}"
            url = f"https://api.db.nomics.world/v22/series/{series_code}?observations=1"
            print(f"Trying DBnomics with indicator {indicator}...")
            
            response = requests.get(url, timeout=20)
            if response.status_code == 200:
                data = response.json()
                docs = data['series']['docs'][0]['observations']
                return [{'@TIME_PERIOD': d[0], '@OBS_VALUE': d[1]} for d in docs if d[1] != 'NA']
        except Exception:
            continue
    return None

def fetch_gold_data(country_code='IN', start_year=2023):
    print(f"--- Global Gold Reserves Data Fetcher (Country: {country_code}) ---")
    
    observations = None
    
    # 1. Try IMF
    try:
        print("1. Attempting IMF Official API...")
        observations = fetch_from_imf(country_code, start_year)
    except Exception as e:
        print(f"   ! IMF API issue: {e}")
        
        # 2. Try DBnomics
        try:
            print("2. Attempting DBnomics Fallback...")
            observations = fetch_from_dbnomics(country_code, start_year)
        except Exception as e2:
            print(f"   ! DBnomics issue: {e2}")

    if observations is None:
        print("\n[FAIL] All automated API attempts failed.")
        print("-" * 50)
        print("STABLE MANUAL OPTION:")
        print("World Gold Council (WGC) is the best source for manual check.")
        print("Download the 'Changes in World Official Gold Reserves' Excel here:")
        print("https://www.gold.org/goldhub/data/monthly-central-bank-statistics")
        print("-" * 50)
        return None

    # Process observations
    df = pd.DataFrame(observations)
    df.columns = ['Period', 'Million_Ounces']
    df['Million_Ounces'] = pd.to_numeric(df['Million_Ounces'])
    
    # 1 Million Ounces ≈ 31.1035 Tonnes
    df['Total_Tonnes'] = (df['Million_Ounces'] * 31.1035).round(2)
    df['Monthly_Change_Tonnes'] = df['Total_Tonnes'].diff().round(2)
    
    return df

if __name__ == "__main__":
    df = fetch_gold_data('IN', 2023)
    if df is not None:
        print("\n--- India's Gold Position (Latest) ---")
        print(df.tail(12).to_string(index=False))
        print("\nNOTE: 1 Million Troy Ounces = 31.1 Tonnes approx.")
    else:
        print("\nPlease check your internet connection or try again later.")
