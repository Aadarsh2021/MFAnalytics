from services.mfapi import MFAPIService
import asyncio

async def test_classification():
    service = MFAPIService()
    
    test_names = [
        "(IDFC FMP - MS - 30 - DIVIDEND",
        "1. Benchmark Short Term Fund - Growth Option",
        "360 ONE Balanced Hybrid Fund - Direct Plan",
        "ICICI Prudential Mid Cap Fund"
    ]
    
    print(f"{'Fund Name':<50} | {'Asset Class':<15} | {'Category':<15}")
    print("-" * 85)
    
    for name in test_names:
        asset = service.classify_asset_class(name)
        category = service.classify_category(name)
        print(f"{name[:50]:<50} | {asset:<15} | {category:<15}")
        
        # Debug why it might be Equity
        name_lower = name.lower()
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
            'opportunities', 'infrastructure', 'pharma', 'tech', 'banking'
        ]
        
        matches = [k for k in equity_keywords if k in name_lower]
        if matches:
            print(f"  -> Matches Equity keywords: {matches}")

if __name__ == "__main__":
    asyncio.run(test_classification())
