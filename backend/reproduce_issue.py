from services.mfapi import MFAPIService
import asyncio

async def reproduce():
    service = MFAPIService()
    print("Fetching all schemes...")
    all_schemes = await service.get_all_schemes()
    print(f"Total schemes: {len(all_schemes)}")
    
    # Simulate the filter
    request_asset_class = "Equity"
    filtered_schemes = []
    
    print(f"Filtering for '{request_asset_class}'...")
    
    for scheme in all_schemes:
        name = scheme['schemeName']
        asset_class = service.classify_asset_class(name)
        
        # Check specific suspect
        if "IDFC FMP - MS - 30 - DIVIDEND" in name:
            print(f"Found Suspect: {name}")
            print(f"  Classified as: '{asset_class}'")
            if asset_class == request_asset_class:
                print("  -> LEAK! It matches Equity!")
            else:
                print("  -> Correctly ignored.")
        
        if asset_class == request_asset_class:
            filtered_schemes.append(scheme)
            
    print(f"Filtered count: {len(filtered_schemes)}")

if __name__ == "__main__":
    asyncio.run(reproduce())
