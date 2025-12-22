import asyncio
from services.yahoo import YahooFinanceService

async def test_yahoo():
    service = YahooFinanceService()
    
    # Test 1: Search for a known fund
    fund_name = "HDFC Top 100 Fund"
    print(f"Searching for: {fund_name}")
    ticker = await service.search_ticker(fund_name)
    print(f"Result: {ticker}")
    
    if ticker:
        # Test 2: Fetch data
        print(f"Fetching history for {ticker}...")
        history = service.get_nav_history(ticker, period="1mo") # Short period for speed
        print(f"Fetched {len(history)} records")
        if history:
            print(f"Sample: {history[0]}")
    else:
        print("Ticker not found")

if __name__ == "__main__":
    asyncio.run(test_yahoo())
