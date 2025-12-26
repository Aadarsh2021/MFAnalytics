import httpx
import asyncio
from typing import List, Dict, Optional

class QualityCalculator:
    def classify_asset_class(self, scheme_name: str) -> str:
        name_lower = scheme_name.lower()
        
        # 1. Gold classification
        gold_keywords = ['gold', 'silver', 'precious metal', 'commodity']
        if any(keyword in name_lower for keyword in gold_keywords):
            return 'Gold'

        # 2. Equity classification
        equity_keywords = [
            'equity', 'stock', 'large cap', 'largecap', 'mid cap', 'midcap', 
            'small cap', 'smallcap', 'multi cap', 'multicap', 'flexi cap', 'flexicap', 
            'focused', 'dividend yield', 'value', 'contra', 'elss', 'tax saver',
            'index', 'nifty', 'sensex', 'bluechip', 'blue chip', 'opportunities', 
            'infrastructure', 'pharma', 'tech', 'banking', 'etf', 'fo f', 
            'fund of fund', 'nasdaq', 's&p', 'global', 'international', 
            'us growth', 'hybrid', 'balanced', 'arbitrage'
        ]
        if any(keyword in name_lower for keyword in equity_keywords):
            return 'Equity'
            
        # 3. Debt classification
        debt_keywords = [
            'debt', 'bond', 'gilt', 'liquid', 'money market', 'ultra short', 
            'short duration', 'medium duration', 'long duration', 'corporate bond', 
            'credit risk', 'banking & psu', 'dynamic bond', 'income',
            'floating rate', 'low duration', 'overnight', 'fixed term',
            'fmp', 'fixed maturity', 'short term', 'ultra short term'
        ]
        if any(keyword in name_lower for keyword in debt_keywords):
            return 'Debt'
            
        return 'Alt'
    
    def classify_category(self, scheme_name: str) -> str:
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

async def main():
    print("Fetching all funds from MFAPI.in...")
    calc = QualityCalculator()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get("https://api.mfapi.in/mf")
        response.raise_for_status()
        all_schemes = response.json()
    
    total = len(all_schemes)
    print(f"Total funds found: {total}")
    
    counts = {
        "Excellent": 0,
        "Good": 0,
        "Poor": 0
    }
    
    for scheme in all_schemes:
        name = scheme['schemeName']
        asset_class = calc.classify_asset_class(name)
        category = calc.classify_category(name)
        
        # Quality Logic from routers/funds.py
        if asset_class not in ['Alt', 'Unknown'] and category != 'Other':
            quality = "Excellent"
        elif asset_class not in ['Alt', 'Unknown']:
            quality = "Good"
        else:
            quality = "Poor"
            
        counts[quality] += 1
        
    print("\n--- Breakdown ---")
    for q, count in counts.items():
        percentage = (count / total) * 100
        print(f"{q}: {count} ({percentage:.2f}%)")

if __name__ == "__main__":
    asyncio.run(main())
