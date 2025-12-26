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
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.database import NAV

router = APIRouter()

# Global MFAPI service instance
mfapi_service = MFAPIService()

# Cache version (Bumping this clears the cache)
CACHE_VERSION = "v3_strict_classification"

# Simple Cache for scheme list
_schemes_cache = {
    "data": [],
    "last_updated": None,
    "version": None
}


@router.post("/search", response_model=FundSearchResponse)
async def search_funds(request: FundSearchRequest, db: Session = Depends(get_db)):
    """
    Search funds directly from MFAPI.in
    
    - **query**: Text search in fund name
    - **limit**: Maximum results to return
    """
    try:
        # Get schemes from cache or MFAPI
        now = datetime.now()
        cache_stale = (
            not _schemes_cache["data"] or 
            not _schemes_cache["last_updated"] or 
            _schemes_cache.get("version") != CACHE_VERSION or
            (now - _schemes_cache["last_updated"]).total_seconds() > 3600
        )
        
        if cache_stale:
            print(f"Fetching all schemes from MFAPI.in (Cache Miss/Version {CACHE_VERSION})...")
            all_schemes = await mfapi_service.get_all_schemes()
            
            # OPTIMIZATION: Pre-calculate classifications
            print("Pre-calculating classifications for cache...")
            for s in all_schemes:
                s['asset_class_cached'] = mfapi_service.classify_asset_class(s['schemeName'])
                s['category_cached'] = mfapi_service.classify_category(s['schemeName'])
                
            _schemes_cache["data"] = all_schemes
            _schemes_cache["last_updated"] = now
            _schemes_cache["version"] = CACHE_VERSION
            print(f"Cached {len(all_schemes)} schemes with classification version {CACHE_VERSION}.")
        else:
            all_schemes = _schemes_cache["data"]
        
        if not all_schemes:
            return FundSearchResponse(funds=[], total=0, offset=request.offset, limit=request.limit)
        
        # Start with all schemes
        filtered_schemes = all_schemes
        
        # Apply search query filter
        if request.query:
            query_lower = request.query.lower()
            filtered_schemes = [
                s for s in filtered_schemes 
                if query_lower in s['schemeName'].lower()
            ]
        
        # Apply asset class filter (Using Cached Value)
        if request.asset_class:
            filtered_schemes = [
                s for s in filtered_schemes 
                if s.get('asset_class_cached') == request.asset_class
            ]
        
        # Apply category filter (Using Cached Value)
        if request.category:
            filtered_schemes = [
                s for s in filtered_schemes 
                if s.get('category_cached') == request.category
            ]

        # Apply plan type filter
        if request.plan_type:
            target_plan = request.plan_type
            # Optimize: check string presence directly
            if target_plan == 'Direct':
                filtered_schemes = [s for s in filtered_schemes if 'direct' in s['schemeName'].lower()]
            else:
                filtered_schemes = [s for s in filtered_schemes if 'direct' not in s['schemeName'].lower()]

        # Apply scheme type filter
        if request.scheme_type:
            target_type = request.scheme_type
            if target_type == 'IDCW':
                filtered_schemes = [s for s in filtered_schemes if 'idcw' in s['schemeName'].lower() or 'dividend' in s['schemeName'].lower()]
            else:
                filtered_schemes = [s for s in filtered_schemes if 'idcw' not in s['schemeName'].lower() and 'dividend' not in s['schemeName'].lower()]
        
        # Total count calculated after deduplication below
        # total_count = len(filtered_schemes)
        
        # Sort schemes by name to ensure consistent order
        # Optimization: Sort only the slice if total is huge? No, must sort all to paginating correctly.
        filtered_schemes.sort(key=lambda x: x['schemeName'])
        
        # DEDUPLICATION: Remove duplicate fund names (keeping the first one found)
        unique_schemes = []
        seen_names = set()
        for scheme in filtered_schemes:
            if scheme['schemeName'] not in seen_names:
                unique_schemes.append(scheme)
                seen_names.add(scheme['schemeName'])
        filtered_schemes = unique_schemes
        
        # Total count (Updated after deduplication)
        total_count = len(filtered_schemes)
        
        # Paginate results based on request
        start = request.offset
        end = start + request.limit
        limited_schemes = filtered_schemes[start:end]
        
        # Bulk fetch inception dates from DB for the limited set
        scheme_codes = [int(s['schemeCode']) for s in limited_schemes]
        inception_dates = {}
        if scheme_codes:
            # Get earliest NAV date from database
            db_results = db.query(
                NAV.fund_id, 
                func.min(NAV.date).label('inception')
            ).filter(NAV.fund_id.in_(scheme_codes)).group_by(NAV.fund_id).all()
            
            for f_id, start_date in db_results:
                inception_dates[f_id] = start_date.strftime("%Y-%m-%d") if start_date else None

        # Convert to FundInfo format
        funds_list = []
        for scheme in limited_schemes:
            s_code = int(scheme['schemeCode'])
            # Use cached values
            funds_list.append(FundInfo(
                id=s_code,
                name=scheme['schemeName'],
                isin=str(scheme['schemeCode']),
                category=scheme.get('category_cached', 'Other'),
                asset_class=scheme.get('asset_class_cached', 'Alt'),
                amc="",
                plan_type="Direct" if 'direct' in scheme['schemeName'].lower() else "Regular",
                scheme_type="IDCW" if ('idcw' in scheme['schemeName'].lower() or 'dividend' in scheme['schemeName'].lower()) else "Growth",
                has_nav_data=True,
                data_quality=(
                    "Excellent" if scheme.get('asset_class_cached') not in ['Alt', 'Unknown'] and scheme.get('category_cached') != 'Other'
                    else "Good" if scheme.get('asset_class_cached') not in ['Alt', 'Unknown']
                    else "Poor"
                ),
                inception_date=inception_dates.get(s_code)
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


@router.post("/{fund_id}/audit")
async def audit_fund(fund_id: int, db: Session = Depends(get_db)):
    """
    Perform deep audit on a fund to discover inception date and history
    """
    try:
        # Fetch scheme details from MFAPI
        details = await mfapi_service.get_scheme_details(str(fund_id))
        
        if not details or 'data' not in details:
            raise HTTPException(status_code=404, detail="Fund data not found on MFAPI")
        
        # Parse NAV data to find earliest date
        nav_entries = []
        earliest_date = None
        
        for nav_entry in details['data']:
            try:
                nav_date = datetime.strptime(nav_entry['date'], '%d-%m-%Y').date()
                nav_value = float(nav_entry['nav'])
                nav_entries.append((nav_date, nav_value))
                if earliest_date is None or nav_date < earliest_date:
                    earliest_date = nav_date
            except:
                continue
        
        # Save to DB (Limited sample or full? Let's do full since it's an audit)
        if earliest_date:
            # Check if fund exists in DB
            from models.database import Fund as DBFund
            meta = details.get('meta', {})
            existing_fund = db.query(DBFund).filter(DBFund.id == fund_id).first()
            if not existing_fund:
                new_fund = DBFund(
                    id=fund_id,
                    name=meta.get('scheme_name', f"Fund {fund_id}"),
                    isin=meta.get('isin_code', f"MFAPI-{fund_id}"),
                    category=meta.get('scheme_category', 'Unknown'),
                    amc=meta.get('fund_house', 'Unknown'),
                    asset_class=mfapi_service.classify_asset_class(meta.get('scheme_name', '')),
                )
                db.add(new_fund)
                db.commit()

            # Save NAVs
            from models.database import NAV
            existing_dates = {n.date for n in db.query(NAV.date).filter(NAV.fund_id == fund_id).all()}
            
            to_add = []
            for d, v in nav_entries:
                if d not in existing_dates:
                    to_add.append(NAV(fund_id=fund_id, date=d, nav=v))
                    existing_dates.add(d)
            
            if to_add:
                db.bulk_save_objects(to_add)
                db.commit()

            return {
                "fund_id": fund_id,
                "inception_date": earliest_date.strftime("%Y-%m-%d"),
                "records_found": len(nav_entries),
                "message": f"Successfully audited {len(nav_entries)} records since {earliest_date}"
            }
        
        return {"error": "No valid NAV data found"}
        
    except Exception as e:
        print(f"Audit failed for fund {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
