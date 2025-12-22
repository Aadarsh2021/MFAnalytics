"""
API Testing Script
Tests all endpoints to ensure they work correctly
"""
import requests
import json

BASE_URL = "http://localhost:8001"

def test_health():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_create_client():
    """Test client creation"""
    print("\n=== Testing Client Creation ===")
    data = {
        "name": "Test Client",
        "risk_profile": "Moderate",
        "investment_horizon": 10,
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
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/clients", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        return response.json()['id']
    return None

def test_fund_search():
    """Test fund search"""
    print("\n=== Testing Fund Search ===")
    data = {
        "query": "",
        "limit": 10
    }
    
    response = requests.post(f"{BASE_URL}/api/funds/search", json=data)
    print(f"Status: {response.status_code}")
    print(f"Number of funds: {len(response.json())}")
    
    if response.status_code == 200 and len(response.json()) > 0:
        return [fund['id'] for fund in response.json()[:5]]
    return []

def test_optimization(client_id, fund_ids):
    """Test portfolio optimization"""
    print("\n=== Testing Portfolio Optimization ===")
    data = {
        "client_id": client_id,
        "selected_funds": [{"fund_id": fid, "asset_class": "Equity"} for fid in fund_ids],
        "constraints": {
            "asset_allocation": {"equity": 60, "debt": 30, "gold": 5, "alt": 5},
            "volatility_tolerance": 50,
            "return_expectation": 12,
            "max_weight_per_fund": 20,
            "min_weight_per_fund": 2
        },
        "mode": "emh"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/optimize/run", json=data, timeout=30)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"MVP Return: {result.get('mvp_metrics', {}).get('expected_return', 'N/A')}")
            print(f"Max Sharpe Return: {result.get('max_sharpe_metrics', {}).get('expected_return', 'N/A')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_fund_categories():
    """Test fund categories endpoint"""
    print("\n=== Testing Fund Categories ===")
    response = requests.get(f"{BASE_URL}/api/funds/categories")
    print(f"Status: {response.status_code}")
    print(f"Categories: {response.json()}")
    return response.status_code == 200

def test_fund_asset_classes():
    """Test fund asset classes endpoint"""
    print("\n=== Testing Fund Asset Classes ===")
    response = requests.get(f"{BASE_URL}/api/funds/asset-classes")
    print(f"Status: {response.status_code}")
    print(f"Asset Classes: {response.json()}")
    return response.status_code == 200

def main():
    """Run all tests"""
    print("=" * 60)
    print("Portfolio Optimization API - Test Suite")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Health Check
    results['health'] = test_health()
    
    # Test 2: Fund Categories
    results['categories'] = test_fund_categories()
    
    # Test 3: Fund Asset Classes
    results['asset_classes'] = test_fund_asset_classes()
    
    # Test 4: Fund Search
    fund_ids = test_fund_search()
    results['fund_search'] = len(fund_ids) > 0
    
    # Test 5: Client Creation
    client_id = test_create_client()
    results['client_creation'] = client_id is not None
    
    # Test 6: Optimization (if we have client and funds)
    if client_id and fund_ids:
        results['optimization'] = test_optimization(client_id, fund_ids)
    else:
        results['optimization'] = False
        print("\n⚠️ Skipping optimization test (no client or funds)")
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.ljust(20)}: {status}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed! API is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()
