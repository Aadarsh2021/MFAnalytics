"""
Fund universe selection router - MODULE 2
Handles fund search, selection, and NAV data retrieval
DIRECTLY from MFAPI.in (no database dependency)
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models.schemas import FundSearchRequest, FundSearchResponse, FundInfo, FundSelectionRequest, NAVData, NavDataRequest
from services.mfapi import MFAPIService
from datetime import datetime, timedelta, date
import math
import asyncio
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.database import NAV, Fund, Benchmark
from services.yahoo import YahooFinanceService
import pandas as pd
import numpy as np

router = APIRouter()

# Global MFAPI service instance
mfapi_service = MFAPIService()
yahoo_service = YahooFinanceService()

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
                s['amc_cached'] = await mfapi_service.classify_amc(s['schemeName'])
                
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
            
        # Apply AMC filter (Using Cached Value)
        if request.amc:
            filtered_schemes = [
                s for s in filtered_schemes 
                if s.get('amc_cached') == request.amc
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
        # Bulk fetch inception dates and Returns
        scheme_codes = [int(s['schemeCode']) for s in limited_schemes]
        inception_dates = {}
        fund_returns = {}
        
        if scheme_codes:
            # 1. Inception Dates
            db_results = db.query(
                NAV.fund_id, 
                func.min(NAV.date).label('inception')
            ).filter(NAV.fund_id.in_(scheme_codes)).group_by(NAV.fund_id).all()
            
            for f_id, start_date in db_results:
                inception_dates[f_id] = start_date.strftime("%Y-%m-%d") if start_date else None

            # 2. Bulk Returns (1Y, 3Y, 5Y)
            try:
                # Helper to get specific date NAVs
                def get_navs_for_date(target_date, ids):
                    # Look for NAVs on or before target_date (within 7 days padding)
                    window_start = target_date - timedelta(days=7)
                    
                    subq = db.query(
                        NAV.fund_id,
                        func.max(NAV.date).label('max_date')
                    ).filter(
                        NAV.fund_id.in_(ids),
                        NAV.date <= target_date,
                        NAV.date >= window_start
                    ).group_by(NAV.fund_id).subquery()
                    
                    q = db.query(NAV.fund_id, NAV.nav).join(
                        subq, 
                        (NAV.fund_id == subq.c.fund_id) & (NAV.date == subq.c.max_date)
                    ).all()
                    return {r[0]: r[1] for r in q}

                today = date.today()
                dt_1y = today - timedelta(days=365)
                dt_3y = today - timedelta(days=3*365)
                dt_5y = today - timedelta(days=5*365)
                
                # Fetch reference NAVs
                current_navs = get_navs_for_date(today, scheme_codes)
                navs_1y = get_navs_for_date(dt_1y, scheme_codes)
                navs_3y = get_navs_for_date(dt_3y, scheme_codes)
                navs_5y = get_navs_for_date(dt_5y, scheme_codes)
                
                for f_id in scheme_codes:
                    curr = current_navs.get(f_id)
                    returns = {}
                    
                    if curr:
                        # 1Y
                        if f_id in navs_1y and navs_1y[f_id] > 0:
                            ret = ((curr / navs_1y[f_id]) - 1) * 100
                            returns['1Y'] = round(ret, 2)
                            
                        # 3Y CAGR
                        if f_id in navs_3y and navs_3y[f_id] > 0:
                            ret = (math.pow(curr / navs_3y[f_id], 1/3) - 1) * 100
                            returns['3Y'] = round(ret, 2)
                            
                        # 5Y CAGR
                        if f_id in navs_5y and navs_5y[f_id] > 0:
                            ret = (math.pow(curr / navs_5y[f_id], 1/5) - 1) * 100
                            returns['5Y'] = round(ret, 2)
                            
                    fund_returns[f_id] = returns
            except Exception as e:
                print(f"Error calculating bulk returns: {e}")

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
                inception_date=inception_dates.get(s_code),
                returns=fund_returns.get(s_code, {})
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



@router.get("/amcs", response_model=List[str])
async def get_amcs():
    """
    Get list of available AMCs from cache
    """
    # Ensure cache is populated
    if not _schemes_cache["data"]:
        # Trigger minimal search to populate cache
        await search_funds(FundSearchRequest(limit=1))
        
    all_schemes = _schemes_cache["data"]
    if not all_schemes:
        return []
        
    # Extract unique AMCs
    amcs = set()
    for s in all_schemes:
        amc = s.get('amc_cached', 'Other')
        if amc != 'Other':
            amcs.add(amc)
            
    return sorted(list(amcs))


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
            start_date = (datetime.now() - timedelta(days=10*365)).strftime("%Y-%m-%d")
        
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
@router.get("/{fund_id}/metrics")
async def get_fund_metrics(
    fund_id: int,
    db: Session = Depends(get_db)
):
    """
    Calculate risk metrics (Alpha, Beta, Sharpe, Std Dev) for a fund.
    """
    try:
        # 1. Fetch Fund and Benchmark
        fund = db.query(Fund).filter(Fund.id == fund_id).first()
        if not fund:
            raise HTTPException(status_code=404, detail="Fund not found")
            
        benchmark_name = "NIFTY 50" # Default
        if fund.benchmark_id:
            benchmark = db.query(Benchmark).filter(Benchmark.id == fund.benchmark_id).first()
            if benchmark:
                benchmark_name = benchmark.name
        
        benchmark = db.query(Benchmark).filter(Benchmark.name == benchmark_name).first()
        if not benchmark:
            # Fallback to NIFTY 50 if named benchmark not found
            benchmark = db.query(Benchmark).filter(Benchmark.name == "NIFTY 50").first()
            
        # 2. Fetch NAV Data (last 10 years)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=10*365)
        
        navs = db.query(NAV).filter(
            NAV.fund_id == fund_id,
            NAV.date >= start_date
        ).order_by(NAV.date).all()
        
        if not navs or len(navs) < 30:
            # Try to audit if data is missing
            from routers.funds import audit_fund
            await audit_fund(fund_id, db)
            navs = db.query(NAV).filter(
                NAV.fund_id == fund_id,
                NAV.date >= start_date
            ).order_by(NAV.date).all()
            
        if not navs or len(navs) < 10:
             return {"error": "Insufficient data"}

        # 3. Process Fund Returns
        fund_df = pd.DataFrame([{"date": n.date, "nav": float(n.nav)} for n in navs])
        fund_df['date'] = pd.to_datetime(fund_df['date'])
        fund_df.set_index('date', inplace=True)
        fund_df = fund_df.sort_index()
        fund_ret = np.log(fund_df / fund_df.shift(1)).dropna()
        
        # 4. Process Benchmark Returns
        if not benchmark:
             return {"error": "Benchmark data missing"}
             
        bench_df = pd.DataFrame([
            {"date": datetime.strptime(d, '%Y-%m-%d').date(), "nav": v} 
            for d, v in benchmark.tri_series.items()
        ])
        bench_df['date'] = pd.to_datetime(bench_df['date'])
        bench_df.set_index('date', inplace=True)
        bench_df = bench_df.sort_index()
        bench_ret = np.log(bench_df / bench_df.shift(1)).dropna()
        
        # 5. Align returns
        common_dates = fund_ret.index.intersection(bench_ret.index)
        if len(common_dates) < 10:
             return {"error": "Insufficient overlapping history with benchmark"}
             
        fund_ret_aligned = fund_ret.loc[common_dates]
        bench_ret_aligned = bench_ret.loc[common_dates]
        
        # 6. Calculate Metrics
        risk_free_rate = 0.07 # 7% 
        trading_days = 252
        
        # Annualized Returns
        ann_fund_ret = float(np.exp(fund_ret_aligned.mean() * trading_days) - 1)
        ann_bench_ret = float(np.exp(bench_ret_aligned.mean() * trading_days) - 1)
        
        # Volatility
        vol = float(fund_ret_aligned.std() * np.sqrt(trading_days))
        
        # Beta
        covariance = np.cov(fund_ret_aligned.iloc[:, 0], bench_ret_aligned.iloc[:, 0])[0][1]
        variance = np.var(bench_ret_aligned.iloc[:, 0])
        beta = float(covariance / variance) if variance > 0 else 1.0
        
        # Alpha
        alpha = float(ann_fund_ret - (risk_free_rate + beta * (ann_bench_ret - risk_free_rate)))
        
        # Sharpe Ratio
        sharpe = (ann_fund_ret - risk_free_rate) / vol if vol > 0 else 0
        
        # 7. Fetch Yahoo Metadata
        ticker = await yahoo_service.search_ticker(fund.name, fund.isin)
        metadata = {}
        if ticker:
            metadata = yahoo_service.get_fund_metadata(ticker)
            
        return {
            "fund_id": fund_id,
            "fund_name": fund.name,
            "benchmark_name": benchmark_name,
            "cagr_10y": ann_fund_ret,
            "volatility": vol,
            "beta": beta,
            "alpha": alpha,
            "sharpe_ratio": sharpe,
            "expense_ratio": metadata.get("expense_ratio"),
            "yield": metadata.get("yield"),
            "pe_ratio": metadata.get("trailing_pe"),
            "pb_ratio": metadata.get("price_to_book"),
            "ticker": ticker
        }
        
    except Exception as e:
        print(f"Error calculating metrics for fund {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
