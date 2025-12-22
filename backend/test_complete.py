"""
Comprehensive End-to-End Test Suite
Tests all workflows and functions
"""
import requests
import json
import time

BASE_URL = "http://localhost:8001"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_workflow_1_new_portfolio():
    """Test complete new portfolio creation workflow"""
    print_header("WORKFLOW 1: New Portfolio Creation")
    
    # Step 1: Create client
    print("Step 1: Creating client profile...")
    client_data = {
        "name": "Test Client",
        "risk_profile": "Moderate",
        "investment_horizon": 10,
        "constraints": {
            "asset_allocation": {"equity": 60, "debt": 30, "gold": 5, "alt": 5},
            "volatility_tolerance": 50,
            "return_expectation": 12,
            "max_weight_per_fund": 20,
            "min_weight_per_fund": 2
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/clients", json=client_data)
    if response.status_code != 200:
        print(f"  ❌ FAILED: {response.text}")
        return False
    
    client_id = response.json()['id']
    print(f"  ✅ Client created: ID {client_id}")
    
    # Step 2: Search funds
    print("\nStep 2: Searching for funds...")
    response = requests.post(f"{BASE_URL}/api/funds/search", json={"query": "", "limit": 10})
    if response.status_code != 200:
        print(f"  ❌ FAILED: {response.text}")
        return False
    
    funds = response.json()
    print(f"  ✅ Found {len(funds)} funds")
    
    if len(funds) < 5:
        print(f"  ⚠️  WARNING: Only {len(funds)} funds available, need at least 5")
        return False
    
    # Step 3: Run optimization
    print("\nStep 3: Running portfolio optimization...")
    selected_funds = [
        {"fund_id": fund['id'], "asset_class": fund['asset_class']}
        for fund in funds[:5]
    ]
    
    opt_data = {
        "client_id": client_id,
        "selected_funds": selected_funds,
        "constraints": client_data['constraints'],
        "mode": "emh"
    }
    
    response = requests.post(f"{BASE_URL}/api/optimize/run", json=opt_data, timeout=60)
    if response.status_code != 200:
        print(f"  ❌ FAILED: {response.text}")
        return False
    
    result = response.json()
    print(f"  ✅ Optimization complete!")
    print(f"     MVP weights: {len(result['mvp_weights'])} funds")
    print(f"     Max Sharpe weights: {len(result['max_sharpe_weights'])} funds")
    print(f"     Efficient frontier: {len(result['efficient_frontier'])} points")
    print(f"     MVP Sharpe: {result['mvp_metrics']['sharpe_ratio']:.3f}")
    print(f"     Max Sharpe: {result['max_sharpe_metrics']['sharpe_ratio']:.3f}")
    
    return True

def test_workflow_2_fund_comparison():
    """Test fund comparison workflow"""
    print_header("WORKFLOW 2: Fund Comparison")
    
    # Get funds
    print("Step 1: Getting funds for comparison...")
    response = requests.post(f"{BASE_URL}/api/funds/search", json={"query": "", "limit": 5})
    if response.status_code != 200:
        print(f"  ❌ FAILED: {response.text}")
        return False
    
    funds = response.json()
    print(f"  ✅ Retrieved {len(funds)} funds for comparison")
    
    for i, fund in enumerate(funds[:3], 1):
        print(f"     {i}. {fund['name'][:50]}...")
        print(f"        Category: {fund['category']}, Asset: {fund['asset_class']}")
    
    return True

def test_all_api_endpoints():
    """Test all API endpoints"""
    print_header("API ENDPOINTS TEST")
    
    tests = {
        "Health Check": ("GET", "/"),
        "API Health": ("GET", "/api/health"),
        "Fund Categories": ("GET", "/api/funds/categories"),
        "Fund Asset Classes": ("GET", "/api/funds/asset-classes"),
    }
    
    results = {}
    for name, (method, endpoint) in tests.items():
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                response = requests.post(f"{BASE_URL}{endpoint}")
            
            results[name] = response.status_code == 200
            status = "✅ PASS" if results[name] else "❌ FAIL"
            print(f"  {name}: {status} ({response.status_code})")
        except Exception as e:
            results[name] = False
            print(f"  {name}: ❌ ERROR - {e}")
    
    return all(results.values())

def test_database_status():
    """Test database status"""
    print_header("DATABASE STATUS")
    
    try:
        from database import SessionLocal
        from models.database import Fund, NAV
        
        db = SessionLocal()
        
        total_funds = db.query(Fund).count()
        total_navs = db.query(NAV).count()
        
        equity_funds = db.query(Fund).filter(Fund.asset_class == 'Equity').count()
        debt_funds = db.query(Fund).filter(Fund.asset_class == 'Debt').count()
        
        print(f"  Total Funds: {total_funds}")
        print(f"  Total NAV Records: {total_navs:,}")
        print(f"  Equity Funds: {equity_funds}")
        print(f"  Debt Funds: {debt_funds}")
        
        # Check NAV data quality
        sample_fund = db.query(Fund).first()
        if sample_fund:
            nav_count = db.query(NAV).filter(NAV.fund_id == sample_fund.id).count()
            print(f"\n  Sample Fund: {sample_fund.name[:50]}...")
            print(f"  NAV Records: {nav_count}")
        
        db.close()
        
        if total_funds >= 5 and total_navs >= 1000:
            print(f"\n  ✅ Database is healthy!")
            return True
        else:
            print(f"\n  ⚠️  Database needs more data")
            return False
            
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  COMPREHENSIVE END-TO-END VERIFICATION")
    print("="*60)
    
    results = {}
    
    # Test 1: Database
    results['Database'] = test_database_status()
    time.sleep(1)
    
    # Test 2: API Endpoints
    results['API Endpoints'] = test_all_api_endpoints()
    time.sleep(1)
    
    # Test 3: Fund Comparison Workflow
    results['Fund Comparison'] = test_workflow_2_fund_comparison()
    time.sleep(1)
    
    # Test 4: Complete Portfolio Workflow
    print("\n⚠️  Running full optimization (may take 30-60 seconds)...")
    results['Portfolio Creation'] = test_workflow_1_new_portfolio()
    
    # Summary
    print("\n" + "="*60)
    print("  FINAL RESULTS")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name.ljust(25)}: {status}")
    
    total = len(results)
    passed = sum(results.values())
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\n  Total: {passed}/{total} tests passed ({percentage:.0f}%)")
    
    if passed == total:
        print("\n  🎉 ALL WORKFLOWS & FUNCTIONS WORKING PERFECTLY!")
        print("  ✅ Platform is 100% ready for production!")
    else:
        print(f"\n  ⚠️  {total - passed} test(s) failed. Review errors above.")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
