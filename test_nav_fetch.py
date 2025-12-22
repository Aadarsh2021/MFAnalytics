import asyncio
import httpx

async def get_scheme_details(scheme_code: str):
    url = f"https://api.mfapi.in/mf/{scheme_code}"
    print(f"Fetching {url}...")
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Meta:", data.get('meta'))
            nav_data = data.get('data', [])
            print(f"NAV Records: {len(nav_data)}")
            if nav_data:
                print("First NAV:", nav_data[0])
                print("Last NAV:", nav_data[-1])
        else:
            print("Failed to fetch data")

if __name__ == "__main__":
    asyncio.run(get_scheme_details("100052"))
