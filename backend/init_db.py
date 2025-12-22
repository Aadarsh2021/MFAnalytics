"""
Initialize database tables
"""
from database import engine, Base
from models.database import User, Client, Fund

# Create all tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database tables created successfully!")
