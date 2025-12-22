"""
Test optimization endpoint directly
"""
import requests
import json

# Test data
data = {
    "client_id": 1,
    "selected_funds": [
        {"fund_id": 1, "asset_class": "Equity"},
        {"fund_id": 2, "asset_class": "Equity"},
        {"fund_id": 3, "asset_class": "Equity"},
        {"fund_id": 4, "asset_class": "Equity"},
        {"fund_id": 5, "asset_class": "Equity"}
    ],
    "constraints": {
        "asset_allocation": {
            "equity": 60,
            "debt": 30,
            "gold": 5,
            "alt": 5
        },
        "volatility_tolerance": 50,
        "return_expectation": 12,
        "max_weight_per_fund": 20,
        "min_weight_per_fund": 2
    },
    "mode": "emh"
}

print("Testing optimization endpoint...")
print(f"URL: http://localhost:8001/api/optimize/run")
print(f"Data: {json.dumps(data, indent=2)}\n")

try:
    response = requests.post(
        "http://localhost:8001/api/optimize/run",
        json=data,
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ SUCCESS!")
        print(f"MVP Weights: {len(result.get('mvp_weights', {}))} funds")
        print(f"Max Sharpe Weights: {len(result.get('max_sharpe_weights', {}))} funds")
        print(f"Frontier Points: {len(result.get('efficient_frontier', []))}")
    else:
        print(f"\n❌ ERROR!")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n❌ EXCEPTION: {e}")
