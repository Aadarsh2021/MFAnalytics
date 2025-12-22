"""
Improved MFAPI.in Database Seeder
Fetches real mutual fund data from https://api.mfapi.in
"""
import httpx
import asyncio
from datetime import datetime
from database import SessionLocal, Base, engine
from models.database import Fund, NAV

# Create tables
Base.metadata.create_all(bind=engine)

class MFAPISeeder:
    BASE_URL = "https://api.mfapi.in"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def classify_asset_class(self, scheme_name: str) -> str:
        """Classify fund into asset class"""
        name_lower = scheme_name.lower()
        
        equity_keywords = ['equity', 'stock', 'large cap', 'mid cap', 'small cap', 
                          'multi cap', 'flexi cap', 'focused', 'elss', 'index', 'nifty', 'sensex']
        debt_keywords = ['debt', 'bond', 'gilt', 'liquid', 'money market', 
                        'ultra short', 'short duration', 'corporate bond', 'income']
        gold_keywords = ['gold', 'silver']
        
        if any(k in name_lower for k in gold_keywords):
            return 'Gold'
        elif any(k in name_lower for k in equity_keywords):
            return 'Equity'
        elif any(k in name_lower for k in debt_keywords):
            return 'Debt'
        else:
            return 'Alt'
    
    def classify_category(self, scheme_name: str) -> str:
        """Classify fund into category"""
        name_lower = scheme_name.lower()
        
        categories = {
            'Large Cap': ['large cap', 'blue chip'],
            'Mid Cap': ['mid cap'],
            'Small Cap': ['small cap'],
            'Multi Cap': ['multi cap', 'flexi cap'],
            'ELSS': ['elss', 'tax saver'],
            'Index': ['index', 'nifty', 'sensex'],
            'Liquid': ['liquid'],
            'Debt': ['debt', 'bond', 'gilt'],
            'Gold': ['gold'],
            'Hybrid': ['hybrid', 'balanced'],
        }
        
        for category, keywords in categories.items():
            if any(k in name_lower for k in keywords):
                return category
        
        return 'Other'
    
    async def get_all_schemes(self):
        """Fetch all schemes from MFAPI"""
        try:
            response = await self.client.get(f"{self.BASE_URL}/mf")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching schemes: {e}")
            return []
    
    async def get_scheme_details(self, scheme_code: str):
        """Fetch scheme details with NAV history"""
        try:
            response = await self.client.get(f"{self.BASE_URL}/mf/{scheme_code}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching scheme {scheme_code}: {e}")
            return None
    
    async def seed_database(self, db, limit=50):
        """Seed database with mutual funds"""
        print(f"\n{'='*60}")
        print("Fetching Mutual Funds from MFAPI.in")
        print(f"{'='*60}\n")
        
        # Get all schemes
        print("Step 1: Fetching all schemes...")
        all_schemes = await self.get_all_schemes()
        
        if not all_schemes:
            print("❌ No schemes found!")
            return
        
        print(f"✅ Found {len(all_schemes)} total schemes")
        
        # Filter for popular funds (Direct Growth plans)
        print("\nStep 2: Filtering for Direct Growth plans...")
        direct_growth = [s for s in all_schemes if 'direct' in s['schemeName'].lower() and 'growth' in s['schemeName'].lower()]
        print(f"✅ Found {len(direct_growth)} Direct Growth plans")
        
        # Limit
        schemes_to_process = direct_growth[:limit]
        print(f"\nStep 3: Processing {len(schemes_to_process)} funds...\n")
        
        success_count = 0
        
        for idx, scheme in enumerate(schemes_to_process):
            try:
                scheme_name = scheme['schemeName']
                scheme_code = scheme['schemeCode']
                
                print(f"[{idx+1}/{len(schemes_to_process)}] {scheme_name[:60]}...")
                
                # Get details
                details = await self.get_scheme_details(scheme_code)
                
                if not details or 'data' not in details:
                    print("  ⚠️  No data available, skipping")
                    continue
                
                # Extract metadata
                meta = details.get('meta', {})
                fund_house = meta.get('fund_house', 'Unknown')
                
                # Classify
                asset_class = self.classify_asset_class(scheme_name)
                category = self.classify_category(scheme_name)
                
                # Check if exists
                existing = db.query(Fund).filter(Fund.isin == scheme_code).first()
                
                if existing:
                    print(f"  ℹ️  Already exists, skipping")
                    continue
                
                # Create fund
                fund = Fund(
                    name=scheme_name,
                    isin=scheme_code,
                    category=category,
                    asset_class=asset_class,
                    amc=fund_house
                )
                db.add(fund)
                db.flush()
                
                # Add NAV data
                nav_data = details['data']
                nav_count = 0
                
                for nav_entry in nav_data[:1095]:  # Last 3 years
                    try:
                        nav_date = datetime.strptime(nav_entry['date'], '%d-%m-%Y').date()
                        nav_value = float(nav_entry['nav'])
                        
                        nav = NAV(
                            fund_id=fund.id,
                            date=nav_date,
                            nav=nav_value
                        )
                        db.add(nav)
                        nav_count += 1
                    except:
                        continue
                
                db.commit()
                success_count += 1
                print(f"  ✅ Added with {nav_count} NAVs | {asset_class} | {category}")
                
                # Small delay
                await asyncio.sleep(0.3)
                
            except Exception as e:
                print(f"  ❌ Error: {e}")
                db.rollback()
                continue
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully added {success_count} mutual funds!")
        print(f"{'='*60}\n")
    
    async def close(self):
        await self.client.aclose()


async def main():
    db = SessionLocal()
    seeder = MFAPISeeder()
    
    try:
        # Seed with 50 popular funds
        await seeder.seed_database(db, limit=50)
        
        # Show summary
        total_funds = db.query(Fund).count()
        equity_funds = db.query(Fund).filter(Fund.asset_class == 'Equity').count()
        debt_funds = db.query(Fund).filter(Fund.asset_class == 'Debt').count()
        
        print("\n📊 Database Summary:")
        print(f"   Total Funds: {total_funds}")
        print(f"   Equity: {equity_funds}")
        print(f"   Debt: {debt_funds}")
        print(f"   Others: {total_funds - equity_funds - debt_funds}")
        
    finally:
        await seeder.close()
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
