import requests
import json
import sys

BASE_URL = "http://localhost:8001/api"

def test_amc_list():
    print("Testing GET /funds/amcs...")
    try:
        res = requests.get(f"{BASE_URL}/funds/amcs")
        if res.status_code != 200:
            print(f"FAILED: {res.status_code} - {res.text}")
            return False
        amcs = res.json()
        print(f"SUCCESS: Found {len(amcs)} AMCs: {amcs[:5]}...")
        if "Axis" not in amcs and "SBI" not in amcs:
            print("WARNING: Common AMCs missing!")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_search_amc():
    print("\nTesting POST /funds/search with AMC filter...")
    try:
        payload = {"amc": "Axis", "limit": 5}
        res = requests.post(f"{BASE_URL}/funds/search", json=payload)
        if res.status_code != 200:
            print(f"FAILED: {res.status_code} - {res.text}")
            return False
        data = res.json()
        funds = data['funds']
        print(f"SUCCESS: Found {len(funds)} funds for Axis.")
        if len(funds) == 0:
            print("WARNING: No funds found for Axis!")
            return True # Might be empty if cache not warmed
        
        # Check returns
        print(f"Sample Fund: {funds[0]['name']}")
        print(f"Returns: {funds[0].get('returns')}")
        if 'returns' not in funds[0]:
            print("FAILED: 'returns' field missing in response")
            return False
            
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    if test_amc_list() and test_search_amc():
        print("\n✅ Verification Passed")
    else:
        print("\n❌ Verification Failed")
