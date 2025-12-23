from routers.funds import search_funds
from models.schemas import FundSearchRequest
import asyncio

async def test_search():
    # Mock request
    req = FundSearchRequest(
        query="IDFC FMP",
        asset_class="Equity",
        limit=10,
        offset=0
    )
    
    print("Testing Search with Query='IDFC FMP' and Asset='Equity'")
    try:
        response = await search_funds(req)
        print(f"Found {len(response.funds)} funds.")
        for f in response.funds:
            print(f" - {f.name} ({f.asset_class})")
            
        if len(response.funds) > 0:
            print("FAIL: Should have found 0 funds (IDFC FMP is Alt, not Equity)")
        else:
            print("SUCCESS: Filtered out correctly.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_search())
