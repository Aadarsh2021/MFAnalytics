"""
Fund universe selection router - MODULE 2
Handles fund search, selection, and NAV data retrieval
DIRECTLY from MFAPI.in (no database dependency)
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models.schemas import FundSearchRequest, FundSearchResponse, FundInfo, FundSelectionRequest, NAVData, NavDataRequest
from services.mfapi import MFAPIService
from datetime import datetime, timedelta
import asyncio

router = APIRouter()

# Global MFAPI service instance
mfapi_service = MFAPIService()

# Simple Cache for scheme list (it doesn't change often)
_schemes_cache = {
    "data": [],
    "last_updated": None
}


@router.post("/search", response_model=FundSearchResponse)
async def search_funds(request: FundSearchRequest):
    """
    Search funds directly from MFAPI.in
    
    - **query**: Text search in fund name
    - **limit**: Maximum results to return
    """
    try:
        # Get schemes from cache or MFAPI
        now = datetime.now()
        if not _schemes_cache["data"] or not _schemes_cache["last_updated"] or (now - _schemes_cache["last_updated"]).total_seconds() > 3600:
            print("Fetching all schemes from MFAPI.in (Cache Miss)...")
            all_schemes = await mfapi_service.get_all_schemes()
            _schemes_cache["data"] = all_schemes
            _schemes_cache["last_updated"] = now
        else:
            all_schemes = _schemes_cache["data"]
        
        if not all_schemes:
            return FundSearchResponse(funds=[], total=0, offset=request.offset, limit=request.limit)
        
        # Filter schemes based on search query
        filtered_schemes = all_schemes
        
        # Apply search query filter
        if request.query:
            query_lower = request.query.lower()
            filtered_schemes = [
                s for s in filtered_schemes 
                if query_lower in s['schemeName'].lower()
            ]
        
        # Apply asset class filter
        if request.asset_class:
            temp_filtered = []
            for scheme in filtered_schemes:
                asset_class = mfapi_service.classify_asset_class(scheme['schemeName'])
                if asset_class == request.asset_class:
                    temp_filtered.append(scheme)
            filtered_schemes = temp_filtered
        
        # Apply category filter
        if request.category:
            temp_filtered = []
            for scheme in filtered_schemes:
                category = mfapi_service.classify_category(scheme['schemeName'])
                if category == request.category:
                    temp_filtered.append(scheme)
            filtered_schemes = temp_filtered

        # Apply plan type filter
        if request.plan_type:
            temp_filtered = []
            for scheme in filtered_schemes:
                name_lower = scheme['schemeName'].lower()
                is_direct = 'direct' in name_lower
                plan = 'Direct' if is_direct else 'Regular'
                if plan == request.plan_type:
                    temp_filtered.append(scheme)
            filtered_schemes = temp_filtered

        # Apply scheme type filter
        if request.scheme_type:
            temp_filtered = []
            for scheme in filtered_schemes:
                name_lower = scheme['schemeName'].lower()
                is_idcw = 'idcw' in name_lower or 'dividend' in name_lower
                scheme_type = 'IDCW' if is_idcw else 'Growth'
                if scheme_type == request.scheme_type:
                    temp_filtered.append(scheme)
            filtered_schemes = temp_filtered
        
        # Total count
        total_count = len(filtered_schemes)
        
        # Sort schemes by name to ensure consistent order
        filtered_schemes.sort(key=lambda x: x['schemeName'])
        
        # Paginate results based on request
        start = request.offset
        end = start + request.limit
        limited_schemes = filtered_schemes[start:end]
        
        # Convert to FundInfo format
        funds_list = []
        for scheme in limited_schemes:
            asset_class = mfapi_service.classify_asset_class(scheme['schemeName'])
            category = mfapi_service.classify_category(scheme['schemeName'])
            
            # Classify Plan and Scheme Type
            name_lower = scheme['schemeName'].lower()
            plan_type = 'Direct' if 'direct' in name_lower else 'Regular'
            scheme_type = 'IDCW' if ('idcw' in name_lower or 'dividend' in name_lower) else 'Growth'
            
            funds_list.append(FundInfo(
                id=int(scheme['schemeCode']),  # Use scheme code as ID
                name=scheme['schemeName'],
                isin=str(scheme['schemeCode']),  # Convert to string for ISIN
                category=category,
                asset_class=asset_class,
                amc="",  # Will be fetched when needed
                plan_type=plan_type,
                scheme_type=scheme_type,
                has_nav_data=True,  # MFAPI always has NAV data
                data_quality="unknown"  # Data availability verified only on selection
            ))
        
        return FundSearchResponse(
            funds=funds_list,
            total=total_count,
            offset=request.offset,
            limit=request.limit
        )
        
    except Exception as e:
        print(f"Error searching funds: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching funds: {str(e)}")


@router.post("/nav", response_model=List[NAVData])
async def get_nav_data(
    request: NavDataRequest
):
    """
    Fetch NAV history for selected funds directly from MFAPI
    """
    try:
        # Default to last 3 years if not specified
        end_date = request.end_date
        start_date = request.start_date

        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=3*365)).strftime("%Y-%m-%d")
        
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        result = []
        
        for scheme_code in request.fund_ids:
            try:
                # Fetch scheme details from MFAPI
                details = await mfapi_service.get_scheme_details(str(scheme_code))
                
                if not details or 'data' not in details:
                    continue
                
                # Parse NAV data
                nav_series = []
                for nav_entry in details['data']:
                    try:
                        nav_date = datetime.strptime(nav_entry['date'], '%d-%m-%Y').date()
                        
                        # Filter by date range
                        if start_dt <= nav_date <= end_dt:
                            nav_series.append({
                                "date": nav_date.strftime("%Y-%m-%d"),
                                "nav": float(nav_entry['nav'])
                            })
                    except:
                        continue
                
                # Get fund name from meta
                meta = details.get('meta', {})
                fund_name = meta.get('scheme_name', f'Fund {scheme_code}')
                
                result.append(NAVData(
                    fund_id=scheme_code,
                    fund_name=fund_name,
                    nav_series=nav_series
                ))
                
            except Exception as e:
                print(f"Error fetching NAV for {scheme_code}: {e}")
                continue
        
        return result
        
    except Exception as e:
        print(f"Error in get_nav_data: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching NAV data: {str(e)}")


@router.get("/categories")
async def get_categories():
    """Get list of all fund categories from MFAPI data"""
    try:
        mfapi_service = MFAPIService()
        
        # Get sample of schemes to extract categories
        all_schemes = await mfapi_service.get_all_schemes()
        
        # Extract unique categories from scheme names
        categories = set()
        for scheme in all_schemes[:1000]:  # Sample first 1000 for performance
            category = mfapi_service.classify_category(scheme['schemeName'])
            if category and category != 'Other':
                categories.add(category)
        
        await mfapi_service.close()
        
        # Return sorted list
        return sorted(list(categories))
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        # Fallback to common categories
        return [
            "Large Cap", "Mid Cap", "Small Cap", "Multi Cap", 
            "ELSS", "Index", "Liquid", "Ultra Short", 
            "Short Duration", "Medium Duration", "Long Duration",
            "Corporate Bond", "Gold", "Hybrid"
        ]


@router.get("/asset-classes")
async def get_asset_classes():
    """Get list of all asset classes"""
    # Asset classes are well-defined, no need to fetch dynamically
    return ["Equity", "Debt", "Gold", "Alt"]
