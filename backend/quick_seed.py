"""
Quick database seeder with sample funds
"""
from database import SessionLocal, Base, engine
from models.database import Fund, NAV
from datetime import datetime, timedelta
import random

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Sample funds
sample_funds = [
    {"name": "HDFC Equity Fund - Direct Plan - Growth", "isin": "INF179KA1239", "category": "Large Cap", "asset_class": "Equity", "amc": "HDFC Mutual Fund"},
    {"name": "ICICI Prudential Bluechip Fund - Direct Plan - Growth", "isin": "INF109K01VF5", "category": "Large Cap", "asset_class": "Equity", "amc": "ICICI Prudential Mutual Fund"},
    {"name": "SBI Equity Hybrid Fund - Direct Plan - Growth", "isin": "INF200K01VK3", "category": "Hybrid", "asset_class": "Equity", "amc": "SBI Mutual Fund"},
    {"name": "Axis Bluechip Fund - Direct Plan - Growth", "isin": "INF846K01EW2", "category": "Large Cap", "asset_class": "Equity", "amc": "Axis Mutual Fund"},
    {"name": "Kotak Emerging Equity Fund - Direct Plan - Growth", "isin": "INF174K01492", "category": "Mid Cap", "asset_class": "Equity", "amc": "Kotak Mahindra Mutual Fund"},
    {"name": "Mirae Asset Large Cap Fund - Direct Plan - Growth", "isin": "INF769K01EY1", "category": "Large Cap", "asset_class": "Equity", "amc": "Mirae Asset Mutual Fund"},
    {"name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "isin": "INF769K01EZ8", "category": "Flexi Cap", "asset_class": "Equity", "amc": "PPFAS Mutual Fund"},
    {"name": "HDFC Liquid Fund - Direct Plan - Growth", "isin": "INF179K01AD0", "category": "Liquid", "asset_class": "Debt", "amc": "HDFC Mutual Fund"},
    {"name": "ICICI Prudential Liquid Fund - Direct Plan - Growth", "isin": "INF109K01LX6", "category": "Liquid", "asset_class": "Debt", "amc": "ICICI Prudential Mutual Fund"},
    {"name": "SBI Magnum Gilt Fund - Direct Plan - Growth", "isin": "INF200K01VL1", "category": "Gilt", "asset_class": "Debt", "amc": "SBI Mutual Fund"},
]

print("Adding sample funds...")

for fund_data in sample_funds:
    # Check if fund exists
    existing = db.query(Fund).filter(Fund.isin == fund_data["isin"]).first()
    
    if not existing:
        fund = Fund(
            name=fund_data["name"],
            isin=fund_data["isin"],
            category=fund_data["category"],
            asset_class=fund_data["asset_class"],
            amc=fund_data["amc"]
        )
        db.add(fund)
        db.flush()
        
        # Add sample NAV data (last 3 years)
        base_nav = 100.0
        start_date = datetime.now() - timedelta(days=10*365)
        
        for i in range(3650):  # 10 years of daily NAVs
            nav_date = start_date + timedelta(days=i)
            # Simulate NAV growth with some randomness
            nav_value = base_nav * (1 + 0.12 * (i/3650) + random.uniform(-0.02, 0.02))
            
            nav = NAV(
                fund_id=fund.id,
                date=nav_date.date(),
                nav=round(nav_value, 4)
            )
            db.add(nav)
        
        print(f"Added: {fund.name[:50]}... with 3650 NAVs")

db.commit()
print(f"\n✅ Added {len(sample_funds)} funds with NAV data!")
print(f"Total funds in database: {db.query(Fund).count()}")
db.close()
