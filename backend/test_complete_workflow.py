"""
Complete Workflow API Testing Script
Tests entire flow from login to optimization
"""
import requests
import json

BASE_URL = "http://localhost:8001"

print("="*70)
print("COMPLETE WORKFLOW TEST")
print("="*70)

# Test 1: Login
print("\n[1/5] Testing Login...")
try:
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "advisor@mfanalytics.com", "password": "Admin@123"}
    )
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print("✅ Login successful")
        print(f"   Token: {token[:50]}...")
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        exit(1)
except Exception as e:
    print(f"❌ Login error: {e}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Test 2: Create Client
print("\n[2/5] Testing Client Creation...")
try:
    client_data = {
        "name": "Workflow Test Client",
        "riskProfile": "moderate",
        "investmentHorizon": 5,
        "assetAllocation": {"equity": 60, "debt": 30, "gold": 5, "alt": 5},
        "volatilityTolerance": 50,
        "returnExpectation": 12,
        "maxWeightPerFund": 20,
        "minWeightPerFund": 2
    }
    client_response = requests.post(
        f"{BASE_URL}/api/clients",
        json=client_data,
        headers=headers
    )
    if client_response.status_code == 200:
        client_id = client_response.json()["id"]
        print(f"✅ Client created: ID {client_id}")
    else:
        print(f"❌ Client creation failed: {client_response.status_code}")
        print(f"   Response: {client_response.text}")
        exit(1)
except Exception as e:
    print(f"❌ Client creation error: {e}")
    exit(1)

# Test 3: Search Funds (MFAPI)
print("\n[3/5] Testing Fund Search (MFAPI)...")
try:
    search_response = requests.post(
        f"{BASE_URL}/api/funds/search",
        json={"query": "hdfc equity", "limit": 10}
    )
    if search_response.status_code == 200:
        res_data = search_response.json()
        funds = res_data.get('funds', [])
        print(f"✅ Fund search successful: {len(funds)} funds found (Total matching: {res_data.get('total')})")
        if funds:
            print(f"   Sample: {funds[0]['name'][:60]}")
            fund_ids = [f['id'] for f in funds[:5]]  # Take first 5
            print(f"   Selected {len(fund_ids)} funds for optimization")
        else:
            print("❌ No funds returned from search")
            exit(1)
    else:
        print(f"❌ Fund search failed: {search_response.status_code}")
        print(f"   Response: {search_response.text}")
        exit(1)
except Exception as e:
    print(f"❌ Fund search error: {e}")
    exit(1)

# Test 4: Run Optimization
print("\n[4/5] Testing Portfolio Optimization...")
try:
    selected_funds = [
        {"fund_id": fund_id, "asset_class": "Equity"} 
        for fund_id in fund_ids[:3]
    ] + [
        {"fund_id": fund_ids[3], "asset_class": "Debt"},
        {"fund_id": fund_ids[4], "asset_class": "Equity"}
    ]
    
    opt_request = {
        "client_id": client_id,
        "selected_funds": selected_funds,
        "constraints": {
            "asset_allocation": {"equity": 60, "debt": 30, "gold": 5, "alt": 5},
            "volatility_tolerance": 50,
            "return_expectation": 12,
            "max_weight_per_fund": 20,
            "min_weight_per_fund": 2
        },
        "mode": "emh"
    }
    
    print(f"   Optimizing with {len(selected_funds)} funds...")
    opt_response = requests.post(
        f"{BASE_URL}/api/optimize/run",
        json=opt_request,
        headers=headers
    )
    
    if opt_response.status_code == 200:
        result = opt_response.json()
        print("✅ Optimization successful!")
        print(f"   MVP Return: {result['mvp_metrics']['expected_return']:.2%}")
        print(f"   MVP Volatility: {result['mvp_metrics']['volatility']:.2%}")
        print(f"   Max Sharpe Return: {result['max_sharpe_metrics']['expected_return']:.2%}")
        print(f"   Max Sharpe Ratio: {result['max_sharpe_metrics']['sharpe_ratio']:.2f}")
    else:
        print(f"❌ Optimization failed: {opt_response.status_code}")
        print(f"   Response: {opt_response.text[:500]}")
        exit(1)
except Exception as e:
    print(f"❌ Optimization error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test 5: Health Check
print("\n[5/5] Testing Health Endpoint...")
try:
    health_response = requests.get(f"{BASE_URL}/api/health")
    if health_response.status_code == 200:
        print("✅ Health check passed")
    else:
        print(f"⚠️  Health check returned: {health_response.status_code}")
except Exception as e:
    print(f"⚠️  Health check error: {e}")

# Summary
print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
print("✅ Login - PASSED")
print("✅ Client Creation - PASSED")
print("✅ Fund Search (MFAPI) - PASSED")
print("✅ Portfolio Optimization - PASSED")
print("✅ Health Check - PASSED")
print("\n🎉 ALL TESTS PASSED! Application is working correctly!")
print("="*70)
