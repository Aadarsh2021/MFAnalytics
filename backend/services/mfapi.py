"""
MFAPI.in Integration Service
Fetches mutual fund data from https://www.mfapi.in/
"""
import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.database import Fund, NAV
import json


class MFAPIService:
    """
    Service to fetch mutual fund data from MFAPI.in
    """
    
    BASE_URL = "https://api.mfapi.in"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_all_schemes(self) -> List[Dict]:
        """
        Get list of all mutual fund schemes
        
        Returns:
            List of scheme dictionaries with schemeCode, schemeName
        """
        try:
            response = await self.client.get(f"{self.BASE_URL}/mf")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching schemes: {e}")
            return []
    
    async def get_scheme_details(self, scheme_code: str) -> Optional[Dict]:
        """
        Get detailed NAV data for a specific scheme
        
        Args:
            scheme_code: Scheme code from MFAPI
            
        Returns:
            Dict with meta (scheme info) and data (NAV history)
        """
        try:
            response = await self.client.get(f"{self.BASE_URL}/mf/{scheme_code}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching scheme {scheme_code}: {e}")
            return None
    
    async def get_latest_nav(self, scheme_code: str) -> Optional[Dict]:
        """
        Get latest NAV for a scheme
        
        Args:
            scheme_code: Scheme code
            
        Returns:
            Dict with latest NAV data
        """
        try:
            response = await self.client.get(f"{self.BASE_URL}/mf/{scheme_code}/latest")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching latest NAV for {scheme_code}: {e}")
            return None
    
    def classify_asset_class(self, scheme_name: str) -> str:
        """
        Classify scheme into asset class based on name
        
        Args:
            scheme_name: Name of the scheme
            
        Returns:
            Asset class: Equity, Debt, Gold, or Alt
        """
        name_lower = scheme_name.lower()
        
        # 1. Gold classification (Most specific)
        gold_keywords = ['gold', 'silver', 'precious metal', 'commodity']
        if any(keyword in name_lower for keyword in gold_keywords):
            return 'Gold'

        # 2. Equity classification (Broadest category)
        # Added: midcap, smallcap, largecap (without spaces), flexicap, multicap, tax saver
        equity_keywords = [
            'equity', 'stock', 
            'large cap', 'largecap',
            'mid cap', 'midcap', 
            'small cap', 'smallcap',
            'multi cap', 'multicap', 
            'flexi cap', 'flexicap', 
            'focused', 'dividend yield',
            'value', 'contra', 'elss', 'tax saver',
            'index', 'nifty', 'sensex', 'bluechip', 'blue chip',
            'opportunities', 'infrastructure', 'pharma', 'tech', 'banking',
            'etf', 'fo f', 'fund of fund', 'nasdaq', 's&p', 'global', 'international', 'us growth',
            'hybrid', 'balanced', 'arbitrage'
        ]
        if any(keyword in name_lower for keyword in equity_keywords):
            return 'Equity'
            
        # 3. Debt classification
        debt_keywords = [
            'debt', 'bond', 'gilt', 'liquid', 'money market', 
            'ultra short', 'short duration', 'medium duration',
            'long duration', 'corporate bond', 'credit risk',
            'banking & psu', 'dynamic bond', 'income',
            'floating rate', 'low duration', 'overnight', 'fixed term',
            'fmp', 'fixed maturity', 'short term', 'ultra short term'
        ]
        if any(keyword in name_lower for keyword in debt_keywords):
            return 'Debt'
            
        # 4. Hybrid/Alternative
        return 'Alt'
    
    def classify_category(self, scheme_name: str) -> str:
        """
        Classify scheme into category
        """
        name_lower = scheme_name.lower()
        
        categories = {
            'Large Cap': ['large cap', 'largecap', 'blue chip', 'bluechip'],
            'Mid Cap': ['mid cap', 'midcap'],
            'Small Cap': ['small cap', 'smallcap'],
            'Multi Cap': ['multi cap', 'multicap', 'flexi cap', 'flexicap'],
            'ELSS': ['elss', 'tax saver'],
            'Index': ['index', 'nifty', 'sensex', 'etf', 'nasdaq', 's&p'],
            'Liquid': ['liquid', 'money market', 'overnight'],
            'Ultra Short': ['ultra short'],
            'Short Duration': ['short duration', 'short term', 'low duration'],
            'Medium Duration': ['medium duration', 'medium term'],
            'Long Duration': ['long duration', 'long term', 'gilt'],
            'Corporate Bond': ['corporate bond'],
            'Dynamic Bond': ['dynamic bond'],
            'Banking & PSU': ['banking & psu', 'psu debt'],
            'Credit Risk': ['credit risk'],
            'Floater': ['floating rate'],
            'Gold': ['gold', 'silver', 'precious metal'],
            'Hybrid': ['hybrid', 'balanced', 'aggressive', 'conservative', 'arbitrage'],
        }
        
        for category, keywords in categories.items():
            if any(keyword in name_lower for keyword in keywords):
                return category
        
        return 'Other'
    
    async def seed_database(
        self, 
        db: Session, 
        limit: Optional[int] = None,
        asset_classes: Optional[List[str]] = None
    ):
        """
        Seed database with mutual fund data from MFAPI
        
        Args:
            db: Database session
            limit: Optional limit on number of schemes to fetch
            asset_classes: Optional list of asset classes to filter
        """
        print("Fetching all schemes from MFAPI.in...")
        all_schemes = await self.get_all_schemes()
        
        if not all_schemes:
            print("No schemes found!")
            return
        
        print(f"Found {len(all_schemes)} schemes")
        
        # Filter by asset class if specified
        if asset_classes:
            filtered_schemes = []
            for scheme in all_schemes:
                asset_class = self.classify_asset_class(scheme['schemeName'])
                if asset_class in asset_classes:
                    filtered_schemes.append(scheme)
            all_schemes = filtered_schemes
            print(f"Filtered to {len(all_schemes)} schemes in {asset_classes}")
        
        # Limit if specified
        if limit:
            all_schemes = all_schemes[:limit]
            print(f"Limited to {limit} schemes")
        
        # Fetch details for each scheme
        for idx, scheme in enumerate(all_schemes):
            try:
                print(f"Processing {idx + 1}/{len(all_schemes)}: {scheme['schemeName'][:50]}...")
                
                # Get scheme details
                details = await self.get_scheme_details(scheme['schemeCode'])
                
                if not details or 'data' not in details:
                    print(f"  Skipping - no data available")
                    continue
                
                # Extract metadata
                meta = details.get('meta', {})
                scheme_name = meta.get('scheme_name', scheme['schemeName'])
                
                # Classify
                asset_class = self.classify_asset_class(scheme_name)
                category = self.classify_category(scheme_name)
                
                # Check if fund already exists
                existing_fund = db.query(Fund).filter(
                    Fund.name == scheme_name
                ).first()
                
                if existing_fund:
                    fund = existing_fund
                    print(f"  Fund exists, updating NAVs...")
                else:
                    # Create new fund
                    fund = Fund(
                        name=scheme_name,
                        isin=meta.get('scheme_code', scheme['schemeCode']),
                        category=category,
                        asset_class=asset_class,
                        amc=meta.get('fund_house', 'Unknown'),
                        expense_ratio=0.0,  # Not available in MFAPI
                        aum=0.0,  # Not available in MFAPI
                    )
                    db.add(fund)
                    db.flush()
                    print(f"  Created fund: {fund.name[:50]}")
                
                # Add NAV data
                nav_data = details['data']
                nav_count = 0
                
                for nav_entry in nav_data:
                    try:
                        nav_date = datetime.strptime(nav_entry['date'], '%d-%m-%Y').date()
                        nav_value = float(nav_entry['nav'])
                        
                        # Check if NAV already exists
                        existing_nav = db.query(NAV).filter(
                            NAV.fund_id == fund.id,
                            NAV.date == nav_date
                        ).first()
                        
                        if not existing_nav:
                            nav = NAV(
                                fund_id=fund.id,
                                date=nav_date,
                                nav=nav_value
                            )
                            db.add(nav)
                            nav_count += 1
                    except Exception as e:
                        continue
                
                db.commit()
                print(f"  Added {nav_count} NAV entries")
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"  Error processing scheme: {e}")
                db.rollback()
                continue
        
        print("\n✅ Database seeding complete!")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


async def seed_sample_funds(db: Session):
    """
    Seed database with a diverse sample of mutual funds
    """
    service = MFAPIService()
    
    try:
        # Seed with top funds from each asset class
        print("Seeding database with sample mutual funds...")
        await service.seed_database(
            db,
            limit=100,  # Get 100 schemes
            asset_classes=['Equity', 'Debt', 'Gold']  # Focus on main asset classes
        )
    finally:
        await service.close()


if __name__ == "__main__":
    # For testing
    from database import SessionLocal
    
    async def main():
        db = SessionLocal()
        try:
            await seed_sample_funds(db)
        finally:
            db.close()
    
    asyncio.run(main())
