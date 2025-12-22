import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

email = "advisor@mfanalytics.com"
password = "Admin@123"

print(f"Attempting to create user: {email}")

try:
    # Try signing up
    res = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "full_name": "Test Advisor",
                "is_advisor": True
            }
        }
    })
    
    if res.user:
        print(f"✅ Successfully created/fetched user: {res.user.email}")
        print(f"ID: {res.user.id}")
        
        # Admin Confirm Logic
        try:
             # The key provided is a 'secret' key, which is often a service_role key in Supabase self-hosted or legacy projects.
             # Let's try to update the user attributes to confirm email.
             # Note: standard client might not allow this unless created with service_role key.
             print("Attempting to auto-confirm email via Admin API...")
             
             # Re-initialize with explicit service_role behavior if supported or just hope key is powerful
             # Actually, supabase-py client exposes auth.admin if key allows
             attributes = {"email_confirm": True, "user_metadata": {"email_verified": True}}
             # For some versions, it's admin.update_user_by_id
             admin_res = supabase.auth.admin.update_user_by_id(
                 res.user.id,
                 {"email_confirm": True}
             )
             print("✅ Email Auto-Confirmed via Admin API!")
             
        except Exception as admin_error:
             print(f"⚠️ Could not auto-confirm (Key might not be Service Role): {admin_error}")
             print("Please disable 'Confirm Email' in Supabase Dashboard -> Auth -> Providers -> Email")

    else:
        print("User creation returned no user object.")

except Exception as e:
    print(f"❌ Error: {e}")
