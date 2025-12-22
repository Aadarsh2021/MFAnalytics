import asyncio
from backend.services.yahoo import YahooFinanceService

async def test_yahoo_fallback():
    yahoo = YahooFinanceService()
    
    # Test 1: Known ticker
    fund_name_1 = "Axis Bluechip Fund Direct Plan Growth"
    print(f"\nTesting Known Ticker for: {fund_name_1}")
    ticker_1 = await yahoo.search_ticker(fund_name_1)
    print(f"Ticker: {ticker_1}")
    if ticker_1:
        history = yahoo.get_nav_history(ticker_1, period="1mo")
        print(f"History (last 5): {history[-5:] if history else 'None'}")

    # Test 2: Search based (Unknown ticker)
    fund_name_2 = "Quant Small Cap Fund Direct"
    print(f"\nTesting Search for: {fund_name_2}")
    ticker_2 = await yahoo.search_ticker(fund_name_2)
    print(f"Ticker: {ticker_2}")
    if ticker_2:
        history = yahoo.get_nav_history(ticker_2, period="1mo")
        print(f"History (last 5): {history[-5:] if history else 'None'}")

if __name__ == "__main__":
    asyncio.run(test_yahoo_fallback())
