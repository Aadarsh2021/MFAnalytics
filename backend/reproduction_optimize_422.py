import requests
import json

BASE_URL = "http://localhost:8001"

def test_optimize_run():
    # 1. Login
    login_data = {"username": "advisor@mfanalytics.com", "password": "Admin@123"}
    login_response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Get a client ID (use the one we just created in the other test or look it up)
    # For now, let's assume client_id 1 exists or look for any
    client_response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
    clients = client_response.json()
    if not clients:
        print("No clients found, please run reproduction_422.py first.")
        return
    client_id = clients[0]["id"]
    print(f"Using Client ID: {client_id}")

    # 3. Try to run optimization with the structure from funds/page.tsx
    # We'll use some dummy but existing fund IDs
    # I'll use IDs that are likely to exist (1, 2, 3)
    payload = {
        "client_id": client_id,
        "selected_funds": [
            {"fund_id": 141240, "asset_class": "Equity"},
            {"fund_id": 150000, "asset_class": "Debt"},
            {"fund_id": 160000, "asset_class": "Gold"}
        ],
        "constraints": {
            "risk_level": "moderate",
            "investment_horizon": 5,
            "asset_allocation": {
                "equity_min": 50, "equity_max": 70,
                "debt_min": 20, "debt_max": 40,
                "gold_min": 0, "gold_max": 10,
                "alt_min": 0, "alt_max": 10
            }
        },
        "mode": "emh"
    }

    print("\nAttempting to run optimization...")
    response = requests.post(f"{BASE_URL}/api/optimize/run", json=payload, headers=headers)
    
    print(f"STATUS_CODE: {response.status_code}")
    print("RESPONSE_BODY:")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    test_optimize_run()
