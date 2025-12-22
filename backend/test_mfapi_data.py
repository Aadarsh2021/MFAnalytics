"""
Test MFAPI data availability
Check which funds have sufficient NAV data
"""
import asyncio
import httpx
from datetime import datetime, timedelta

async def test_fund_data():
    client = httpx.AsyncClient(timeout=30.0)
    
    # Get all schemes
    print("Fetching all schemes...")
    response = await client.get("https://api.mfapi.in/mf")
    all_schemes = response.json()
    
    # Filter for HDFC equity funds
    hdfc_equity = [
        s for s in all_schemes 
        if 'hdfc' in s['schemeName'].lower() and 'equity' in s['schemeName'].lower()
    ][:10]
    
    print(f"\nTesting {len(hdfc_equity)} HDFC Equity funds...\n")
    
    three_years_ago = datetime.now() - timedelta(days=3*365)
    
    for scheme in hdfc_equity:
        scheme_code = scheme['schemeCode']
        scheme_name = scheme['schemeName'][:60]
        
        # Get details
        details_response = await client.get(f"https://api.mfapi.in/mf/{scheme_code}")
        details = details_response.json()
        
        if 'data' not in details:
            print(f"❌ {scheme_name}: No data")
            continue
        
        # Count NAVs in last 3 years
        recent_navs = 0
        for nav_entry in details['data']:
            try:
                nav_date = datetime.strptime(nav_entry['date'], '%d-%m-%Y')
                if nav_date >= three_years_ago:
                    recent_navs += 1
            except:
                continue
        
        status = "✅" if recent_navs >= 30 else "❌"
        print(f"{status} {scheme_name}")
        print(f"   Code: {scheme_code}, NAVs (3yr): {recent_navs}")
        
        await asyncio.sleep(0.3)
    
    await client.aclose()

if __name__ == "__main__":
    asyncio.run(test_fund_data())
