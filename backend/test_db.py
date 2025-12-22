from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {db_url.split('@')[1] if '@' in db_url else 'Invalid URL'}")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("✅ Successfully connected to Supabase Postgres!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
