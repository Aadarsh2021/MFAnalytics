import httpx
import asyncio
import json

async def check():
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    queries = ['HDFC Top 100', '0P00005W02.BO', 'HDFCTOP100.BO', 'HDFC Mutual Fund']
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    async with httpx.AsyncClient() as client:
        for q in queries:
            print(f"Checking: {q}")
            params = {'q': q, 'quotesCount': 5}
            r = await client.get(url, params=params, headers=headers)
            print(json.dumps(r.json(), indent=2))
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
