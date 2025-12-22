import requests
import json

# Register user
url = "http://localhost:8001/api/auth/register"
data = {
    "email": "advisor@mfanalytics.com",
    "password": "Admin@123",
    "full_name": "Aadarsh Thakur"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("\n✅ Account created successfully!")
        print(f"Email: {data['email']}")
        print(f"Password: {data['password']}")
    else:
        print(f"\n❌ Error: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
