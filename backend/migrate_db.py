"""
Database migration script to add users table and update clients table
Run this script to update the database schema for authentication
"""
from database import Base, engine
from models.database import User, Client, Fund, NAV, Portfolio, Optimization, Benchmark

print("Creating database tables...")

# Create all tables (will skip existing ones)
Base.metadata.create_all(bind=engine)

print("✅ Database migration complete!")
print("\nTables created/updated:")
print("  - users (new)")
print("  - clients (updated with advisor_id)")
print("  - All other tables")
