"""
Database seeding script
Run this to populate the database with mutual fund data from MFAPI.in
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from database import SessionLocal, engine, Base
from services.mfapi import seed_sample_funds


async def main():
    """
    Main seeding function
    """
    print("=" * 60)
    print("Portfolio Optimizer - Database Seeding")
    print("=" * 60)
    print()
    
    # Create tables if they don't exist
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created\n")
    
    # Seed database
    db = SessionLocal()
    try:
        await seed_sample_funds(db)
        print("\n" + "=" * 60)
        print("✅ Database seeding completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
