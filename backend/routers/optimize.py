"""
Portfolio Optimization API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Tuple, Any
from pydantic import BaseModel
from database import get_db
from models.database import Fund, NAV, Optimization, Portfolio
from services.optimizer import PortfolioOptimizer
from services.excel_exporter import OptimizationExcelExporter
from config import settings
import json
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import asyncio
from services.backtester import PortfolioBacktester

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


class FundSelection(BaseModel):
    fund_id: int
    asset_class: str
    name: Optional[str] = None


class OptimizationRequest(BaseModel):
    client_id: int
    selected_funds: List[FundSelection]
    constraints: Dict
    mode: str = 'emh'  # 'emh' or 'custom'
    custom_returns: Optional[Dict[str, float]] = None
    views: Optional[Dict[int, float]] = None # fund_id -> expected_return_decimal


class OptimizationResponse(BaseModel):
    mvp_weights: Dict[int, float]
    max_sharpe_weights: Dict[int, float]
    mvp_metrics: Dict
    max_sharpe_metrics: Dict
    efficient_frontier: List[Dict]
    monte_carlo_portfolios: List[Dict] = []
    benchmark_metrics: Optional[Dict] = None
    benchmark_name: Optional[str] = None
    bl_weights: Optional[Dict[int, float]] = None
    bl_metrics: Optional[Dict] = None

class SimulationRequest(BaseModel):
    weights: Dict[int, float]
    expected_return: float
    volatility: float
    horizon_years: int = 5
    initial_value: float = 100000

class BacktestRequest(BaseModel):
    fund_ids: List[int]
    weights: Dict[int, float]
    initial_value: float = 100000


async def core_optimization_logic(
    request: OptimizationRequest,
    db: Session,
    save_to_db: bool = True
) -> Tuple[OptimizationResponse, Dict[str, Any]]:
    """
    Core Logic extracted for reusability.
    Returns: (OptimizationResponse, DebugArtifacts)
    """
    # Artifacts collection
    artifacts = {
        'input_params': request.dict(),
        'fund_info': [],
        'fetch_audit': []
    }
    
    # Log incoming request for debugging
    print(f"Optimization Request: Client {request.client_id}, Funds: {len(request.selected_funds)}")
    
    # Validate minimum number of funds
    if len(request.selected_funds) < 3:
        raise ValueError("Please select at least 3 funds for portfolio optimization.")
    
    # Initialize optimizer
    optimizer = PortfolioOptimizer(
        risk_free_rate=settings.risk_free_rate,
        trading_days=settings.trading_days_per_year
    )
    
    fund_ids = [f.fund_id for f in request.selected_funds]
    fund_obj_map = {f.fund_id: f for f in request.selected_funds}
    
    # Artifact: Fund Info
    for f in request.selected_funds:
        artifacts['fund_info'].append({
            'id': f.fund_id, 
            'name': f.name, 
            'asset_class': f.asset_class
        })

    # Fetch NAV data (DB First -> MFAPI -> Yahoo)
    nav_data = {}
    fund_map = {}  # Map fund_id to index
    
    # Helper to upsert NAVs
    def upsert_navs(fund_id, new_navs):
        existing_dates = {n.date.strftime('%Y-%m-%d') for n in db.query(NAV.date).filter(NAV.fund_id == fund_id).all()}
        objects_to_add = []
        for d_str, val in new_navs:
            if d_str not in existing_dates:
                objects_to_add.append(NAV(fund_id=fund_id, date=d_str, nav=val))
                existing_dates.add(d_str)
        if objects_to_add:
            db.bulk_save_objects(objects_to_add)
            db.commit()

    # Initialize MFAPIService once
    from services.mfapi import MFAPIService
    mfapi = MFAPIService()

    # Step 1: Check DB for all funds
    funds_to_fetch = [] 
    
    for idx, fund_id in enumerate(fund_ids):
        fund_obj = fund_obj_map[fund_id]
        fund_map[fund_id] = idx
        
        last_date = db.query(NAV.date).filter(NAV.fund_id == fund_id).order_by(NAV.date.desc()).first()
        
        is_stale = True
        if last_date:
            days_since = (datetime.now().date() - last_date[0]).days
            if days_since <= 2:
                is_stale = False
        
        if not is_stale:
            db_navs = db.query(NAV.date, NAV.nav).filter(NAV.fund_id == fund_id).order_by(NAV.date).all()
            if db_navs and len(db_navs) > 30:
                # Cache Hit
                nav_data[fund_id] = [(d.strftime('%Y-%m-%d'), float(n)) for d, n in db_navs]
                artifacts['fetch_audit'].append({
                    'fund_id': fund_id, 'source': 'DB_CACHE', 'status': 'HIT', 
                    'records': len(db_navs), 'last_date': str(last_date[0])
                })
            else:
                is_stale = True # Fallback if empty
        
        if is_stale:
            # Cache Miss - Needs Fetch
            funds_to_fetch.append((idx, fund_id, fund_obj))
            artifacts['fetch_audit'].append({
                'fund_id': fund_id, 'source': 'DB', 'status': 'STALE/MISSING', 
                'records': 0, 'reason': f"Last date: {last_date[0] if last_date else 'None'}"
            })

    # Step 2: Parallel Fetch for missing funds
    if funds_to_fetch:
        print(f"🚀 Launching parallel fetch for {len(funds_to_fetch)} funds...")
        
        async def fetch_single_fund_live(f_idx, f_id, f_obj):
            try:
                # MFAPI Fetch
                details = await mfapi.get_scheme_details(str(f_id))
                
                if not details or 'data' not in details:
                    raise ValueError("No data from MFAPI")

                api_navs = []
                for nav_entry in details['data']:
                    try:
                        d = datetime.strptime(nav_entry['date'], '%d-%m-%Y')
                        api_navs.append((d.strftime('%Y-%m-%d'), float(nav_entry['nav'])))
                    except:
                        continue

                # Fallback to Yahoo
                source = "MFAPI"
                if len(api_navs) < 30:
                    from services.yahoo import YahooFinanceService
                    yahoo = YahooFinanceService()
                    meta = details.get('meta', {})
                    t_name = meta.get('scheme_name', '')
                    t_isin = meta.get('isin_code', '')
                    if t_name:
                        ticker = await yahoo.search_ticker(t_name, t_isin)
                        if ticker:
                            y_navs = yahoo.get_nav_history(ticker)
                            if len(y_navs) > len(api_navs):
                                api_navs = y_navs
                                source = "YAHOO"

                if len(api_navs) < 30:
                    raise ValueError(f"Insufficient history ({len(api_navs)} records)")

                return (f_id, api_navs, details, source, None) 
            except Exception as e:
                 return (f_id, None, None, "FAILED", str(e)) 

        # Execute Parallel Tasks
        tasks = [fetch_single_fund_live(i, fid, fobj) for i, fid, fobj in funds_to_fetch]
        results = await asyncio.gather(*tasks)
        
        for fund_id, fetched_navs, details, source, error in results:
            if fetched_navs:
                nav_data[fund_id] = fetched_navs
                
                # Update Audit
                for item in artifacts['fetch_audit']:
                    if item['fund_id'] == fund_id and item['status'] == 'STALE/MISSING':
                         item['fetched_source'] = source
                         item['fetched_records'] = len(fetched_navs)
                
                # Update Fund Info in DB if needed
                meta = details.get('meta', {})
                existing_fund = db.query(Fund).filter(Fund.id == fund_id).first()
                if not existing_fund:
                    try:
                        scheme_name = meta.get('scheme_name') or fund_obj_map[fund_id].name
                        category = meta.get('scheme_category', 'Unknown')
                        amc = meta.get('fund_house', 'Unknown')
                        isin = meta.get('isin_code', f"MFAPI-{fund_id}")
                        
                        if db.query(Fund).filter(Fund.isin == isin).first():
                            isin = f"{isin}-{fund_id}"
                            
                        new_fund = Fund(
                            id=fund_id, 
                            name=scheme_name, 
                            category=category, 
                            amc=amc, 
                            asset_class=fund_obj_map[fund_id].asset_class, 
                            isin=isin
                        )
                        db.add(new_fund)
                        db.commit()
                    except:
                            db.rollback()
                
                upsert_navs(fund_id, fetched_navs)
                
            else:
                # Failed to fetch - try DB fallback
                db_fallback = db.query(NAV.date, NAV.nav).filter(NAV.fund_id == fund_id).order_by(NAV.date).all()
                if db_fallback and len(db_fallback) > 30:
                    nav_data[fund_id] = [(d.strftime('%Y-%m-%d'), float(n)) for d, n in db_fallback]
                    for item in artifacts['fetch_audit']:
                        if item['fund_id'] == fund_id:
                             item['status'] = 'FALLBACK_DB'
                else:
                    error_msg = f"Insufficient history for fund {fund_id}: {error}"
                    raise ValueError(error_msg)
    
    await mfapi.close()
    
    # Compute returns and covariance
    returns_df = optimizer.compute_returns(nav_data)
    artifacts['nav_df'] = pd.DataFrame.from_dict({k: dict(v) for k, v in nav_data.items()}, orient='index').transpose() # Rough approximation for debug
    artifacts['returns_df'] = returns_df
    
    cov_matrix = optimizer.compute_covariance(returns_df)
    artifacts['cov_matrix'] = cov_matrix
    
    expected_returns = optimizer.compute_expected_returns(
        returns_df, 
        mode=request.mode,
        custom_returns=request.custom_returns
    )
    artifacts['expected_returns'] = expected_returns
    
    # Prepare constraints
    min_w = request.constraints.get('min_weight_per_fund', 0) / 100
    max_w = request.constraints.get('max_weight_per_fund', 100) / 100
    
    num_funds = len(fund_ids)
    if num_funds * max_w < 1.0:
        new_max = (1.0 / num_funds) + 0.05 
        max_w = new_max
        
    opt_constraints = {
        'fund_bounds': (min_w, max_w)
    }
    
    if 'asset_allocation' in request.constraints and len(request.selected_funds) >= 3:
        asset_classes_present = set(f.asset_class for f in request.selected_funds)
        if len(asset_classes_present) >= 2:
            asset_class_bounds = {}
            fund_indices = {}
            
            aa_constraints = request.constraints['asset_allocation']
            target_classes = ["Equity", "Debt", "Gold", "Alt"]
            
            for ac in target_classes:
                ac_lower = ac.lower()
                min_key = f"{ac_lower}_min"
                max_key = f"{ac_lower}_max"
                
                if min_key in aa_constraints and max_key in aa_constraints:
                    low = float(aa_constraints[min_key]) / 100.0
                    high = float(aa_constraints[max_key]) / 100.0
                    
                    asset_class_bounds[ac] = (low, high)
                    
                    indices = [fund_map[f.fund_id] for f in request.selected_funds if f.asset_class.lower() == ac_lower]
                    if indices:
                        fund_indices[ac] = indices
                        
            if asset_class_bounds and fund_indices:
                opt_constraints['asset_class_bounds'] = asset_class_bounds
                opt_constraints['fund_indices'] = fund_indices

    # Artifact: Constraints
    artifacts['constraints'] = opt_constraints

    # --- Benchmark & Metrics Section ---
    from models.database import Benchmark
    benchmark_metrics = None
    benchmark_name = "Composite Benchmark"
    composite_return_series = None
    
    try:
        fund_entities = db.query(Fund).filter(Fund.id.in_(fund_ids)).all()
        fund_to_benchmark = {f.id: f.benchmark_id for f in fund_entities if f.benchmark_id}
        unique_bench_ids = set(fund_to_benchmark.values())
        
        if unique_bench_ids:
            benchmarks = db.query(Benchmark).filter(Benchmark.id.in_(unique_bench_ids)).all()
            bench_map = {b.id: b for b in benchmarks}
            bench_returns_all = {}
            
            for b_id, b in bench_map.items():
                tri_series = b.tri_series 
                b_dates = sorted(tri_series.keys())
                b_navs = [tri_series[d] for d in b_dates]
                b_df = pd.DataFrame({'date': pd.to_datetime(b_dates), 'nav': b_navs})
                b_df.set_index('date', inplace=True)
                bench_returns_all[b_id] = np.log(b_df / b_df.shift(1)).dropna()
            
            base_weight = 1.0 / len(fund_ids)
            for f_id in fund_ids:
                b_id = fund_to_benchmark.get(f_id)
                if b_id and b_id in bench_returns_all:
                    b_ret = bench_returns_all[b_id]
                    common_dates = returns_df.index.intersection(b_ret.index)
                    b_ret_aligned = b_ret.loc[common_dates]
                    if composite_return_series is None:
                        composite_return_series = b_ret_aligned * base_weight
                    else:
                        overlap = composite_return_series.index.intersection(b_ret_aligned.index)
                        composite_return_series = composite_return_series.loc[overlap] + b_ret_aligned.loc[overlap] * base_weight
            
            if composite_return_series is not None:
                bench_vol = float(composite_return_series.std() * np.sqrt(settings.trading_days_per_year))
                bench_ret = float(np.exp(composite_return_series.mean() * settings.trading_days_per_year) - 1)
                bench_names = [bench_map[b_id].name for b_id in unique_bench_ids if b_id in bench_map]
                benchmark_name = f"Blended ({', '.join(bench_names[:3])})" if len(bench_names) <= 3 else f"Blended ({len(bench_names)} indices)"
                benchmark_metrics = {'expected_return': bench_ret, 'volatility': bench_vol, 'sharpe_ratio': (bench_ret - settings.risk_free_rate) / bench_vol if bench_vol > 0 else 0, 'name': benchmark_name}
    except Exception as e:
        print(f"Error computing composite benchmark: {e}")

    # --- Run Optimizations ---
    # 1. MVP
    try:
        mvp_weights, _, mvp_vol = optimizer.optimize_mvp(cov_matrix, opt_constraints)
    except Exception as e:
        print(f"  ⚠️ MVP Optimization Failed ({str(e)}). Relaxing constraints...")
        # Relax: remove asset class bounds
        if 'asset_class_bounds' in opt_constraints:
            del opt_constraints['asset_class_bounds']
        if 'fund_indices' in opt_constraints:
            del opt_constraints['fund_indices']
        
        try:
            mvp_weights, _, mvp_vol = optimizer.optimize_mvp(cov_matrix, opt_constraints)
        except Exception as e2:
                raise ValueError(f"Optimization infeasible: {str(e2)}")

    mvp_metrics = optimizer.compute_portfolio_metrics(mvp_weights, returns_df, expected_returns, cov_matrix, benchmark_returns=composite_return_series)
    
    # 2. Max Sharpe
    try:
        ms_weights, ms_ret, ms_vol, ms_sharpe = optimizer.optimize_max_sharpe(expected_returns, cov_matrix, opt_constraints)
    except Exception as e:
        print(f"  ⚠️ Max Sharpe optimization failed. Falling back to MVP.")
        ms_weights = mvp_weights
        ms_ret, ms_vol = optimizer.compute_portfolio_performance(ms_weights, expected_returns, cov_matrix)
        ms_sharpe = (ms_ret - settings.risk_free_rate) / ms_vol if ms_vol > 0 else 0
    
    ms_metrics = optimizer.compute_portfolio_metrics(ms_weights, returns_df, expected_returns, cov_matrix, benchmark_returns=composite_return_series)
    
    # 2.5 Black-Litterman
    bl_weights_dict = None
    bl_metrics = None
    if request.views:
            try:
                valid_views = {fund_map[fid]: val for fid, val in request.views.items() if fid in fund_map}
                if valid_views:
                    bl_weights, bl_ret, bl_vol = optimizer.optimize_black_litterman(
                        expected_returns, 
                        cov_matrix, 
                        valid_views, 
                        [str(fid) for fid in fund_ids]
                    )
                    bl_weights_dict = {fund_ids[i]: float(w) for i, w in enumerate(bl_weights)}
                    bl_metrics = optimizer.compute_portfolio_metrics(bl_weights, returns_df, expected_returns, cov_matrix, benchmark_returns=composite_return_series)
            except Exception as e:
                print(f"  ⚠️ BL Optimization Skipped: {e}")

    # 3. Frontier
    try:
        frontier = optimizer.generate_efficient_frontier(expected_returns, cov_matrix, n_points=50, constraints=opt_constraints)
    except:
        frontier = []
    
    mvp_weights_dict = {fund_ids[i]: float(w) for i, w in enumerate(mvp_weights)}
    ms_weights_dict = {fund_ids[i]: float(w) for i, w in enumerate(ms_weights)}
    
    # 4. Monte Carlo
    mongo_carlo_points = []
    try:
        mongo_carlo_points = optimizer.generate_monte_carlo_portfolios(
            expected_returns, 
            cov_matrix, 
            n_simulations=2000, 
            constraints=opt_constraints
        )
    except Exception as e:
        print(f"⚠️ Monte Carlo simulation failed: {e}")

    # Build Response
    response = OptimizationResponse(
        mvp_weights=mvp_weights_dict,
        max_sharpe_weights=ms_weights_dict,
        mvp_metrics=mvp_metrics,
        max_sharpe_metrics=ms_metrics,
        efficient_frontier=frontier,
        monte_carlo_portfolios=mongo_carlo_points,
        benchmark_metrics=benchmark_metrics,
        benchmark_name=benchmark_name,
        bl_weights=bl_weights_dict,
        bl_metrics=bl_metrics
    )
    
    # Update Artifacts
    artifacts['results'] = response.dict()
    
    if save_to_db:
        try:
            portfolio = Portfolio(
                client_id=request.client_id,
                source='manual',
                holdings={
                    'fund_ids': fund_ids,
                    'selected_funds': [f.dict() for f in request.selected_funds]
                }
            )
            db.add(portfolio)
            db.flush()
            
            optimization = Optimization(
                portfolio_id=portfolio.id,
                inputs={
                    'constraints': request.constraints,
                    'mode': request.mode,
                    'fund_count': len(fund_ids)
                },
                output=response.dict()
            )
            db.add(optimization)
            db.commit()
        except Exception as e:
            print(f"Error saving optimization to DB: {e}")
            
    return response, artifacts


@router.post("/run", response_model=OptimizationResponse)
async def run_optimization(
    request: OptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Run complete portfolio optimization
    """
    try:
        response, _ = await core_optimization_logic(request, db, save_to_db=True)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        print(f"Optimization Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/debug-excel")
async def generate_debug_excel(
    request: OptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Run optimization and return a detailed Excel file with all intermediate steps.
    """
    try:
        # Run logic (don't fail if DB save fails, we want the excel)
        response, artifacts = await core_optimization_logic(request, db, save_to_db=False)
        
        # Determine filename
        filename = f"Optimization_Debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        # Generate Excel
        excel_stream = OptimizationExcelExporter.generate_debug_excel(artifacts)
        
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        print(f"Excel Generation Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recalculate")
async def recalculate_portfolio(
    weights: Dict[int, float],
    db: Session = Depends(get_db)
):
    """
    Recalculate metrics for custom weights
    """
    try:
        optimizer = PortfolioOptimizer(
            risk_free_rate=settings.risk_free_rate,
            trading_days=settings.trading_days_per_year
        )
        
        fund_ids = list(weights.keys())
        
        # Fetch NAV data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=10*365)
        
        nav_data = {}
        for fund_id in fund_ids:
            navs = db.query(NAV).filter(
                NAV.fund_id == fund_id,
                NAV.date >= start_date,
                NAV.date <= end_date
            ).order_by(NAV.date).all()
            
            nav_data[fund_id] = [(nav.date.strftime('%Y-%m-%d'), float(nav.nav)) for nav in navs]
        
        # Compute returns and covariance
        returns_df = optimizer.compute_returns(nav_data)
        cov_matrix = optimizer.compute_covariance(returns_df)
        expected_returns = optimizer.compute_expected_returns(returns_df)
        
        # Convert weights dict to array
        weights_array = np.array([weights[fid] for fid in fund_ids])
        
        # Compute custom benchmark return series
        benchmark_metrics = None
        benchmark_name = "Composite Benchmark"
        composite_return_series = None
        try:
            fund_entities = db.query(Fund).filter(Fund.id.in_(fund_ids)).all()
            fund_to_benchmark = {f.id: f.benchmark_id for f in fund_entities if f.benchmark_id}
            unique_bench_ids = set(fund_to_benchmark.values())
            
            if unique_bench_ids:
                from models.database import Benchmark
                benchmarks = db.query(Benchmark).filter(Benchmark.id.in_(unique_bench_ids)).all()
                bench_map = {b.id: b for b in benchmarks}
                
                for fid in fund_ids:
                    weight = weights[fid]
                    b_id = fund_to_benchmark.get(fid)
                    if weight > 0 and b_id and b_id in bench_map:
                        tri_series = bench_map[b_id].tri_series # Already dict
                        b_dates = sorted(tri_series.keys())
                        b_navs = [tri_series[d] for d in b_dates]
                        b_df = pd.DataFrame({'date': pd.to_datetime(b_dates), 'nav': b_navs})
                        b_df.set_index('date', inplace=True)
                        b_ret = np.log(b_df / b_df.shift(1)).dropna()
                        
                        common_dates = returns_df.index.intersection(b_ret.index)
                        b_ret_aligned = b_ret.loc[common_dates]
                        
                        if composite_return_series is None:
                            composite_return_series = b_ret_aligned * weight
                        else:
                            overlap = composite_return_series.index.intersection(b_ret_aligned.index)
                            composite_return_series = composite_return_series.loc[overlap] + b_ret_aligned.loc[overlap] * weight
                
                if composite_return_series is not None:
                    bench_vol = float(composite_return_series.std() * np.sqrt(settings.trading_days_per_year))
                    bench_ret = float(np.exp(composite_return_series.mean() * settings.trading_days_per_year) - 1)
                    bench_names = [bench_map[b_id].name for b_id in unique_bench_ids if b_id in bench_map]
                    benchmark_name = f"Blended ({', '.join(bench_names[:3])})" if len(bench_names) <= 3 else f"Blended ({len(bench_names)} indices)"
                    benchmark_metrics = {'expected_return': bench_ret, 'volatility': bench_vol, 'sharpe_ratio': (bench_ret - settings.risk_free_rate) / bench_vol if bench_vol > 0 else 0, 'name': benchmark_name}
        except Exception as e:
            print(f"Recalculate benchmark error: {e}")

        # Compute metrics with benchmark returns
        metrics = optimizer.compute_portfolio_metrics(
            weights_array, returns_df, expected_returns, cov_matrix, 
            benchmark_returns=composite_return_series
        )

        return {
            'metrics': metrics,
            'weights': weights,
            'benchmark_metrics': benchmark_metrics,
            'benchmark_name': benchmark_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)    )
    
@router.post("/simulate")
async def simulate_portfolio(request: SimulationRequest):
    """
    Run Monte Carlo simulation for a portfolio
    """
    optimizer = PortfolioOptimizer(trading_days=settings.trading_days_per_year)
    results = optimizer.simulate_projections(
        weights=np.array(list(request.weights.values())),
        expected_return=request.expected_return,
        volatility=request.volatility,
        horizon_years=request.horizon_years,
        initial_value=request.initial_value
    )
    return results

@router.post("/backtest")
async def backtest_portfolio(
    request: BacktestRequest,
    db: Session = Depends(get_db)
):
    """
    Run historical backtest
    """
    optimizer = PortfolioOptimizer(trading_days=settings.trading_days_per_year)
    backtester = PortfolioBacktester(trading_days=settings.trading_days_per_year)
    
    # Fetch NAV data for backtest
    nav_data = {}
    end_date = datetime.now()
    start_date = end_date - timedelta(days=10*365)
    
    for fid in request.fund_ids:
        navs = db.query(NAV).filter(
            NAV.fund_id == fid,
            NAV.date >= start_date
        ).order_by(NAV.date).all()
        nav_data[fid] = [(n.date.strftime('%Y-%m-%d'), float(n.nav)) for n in navs]
        
    returns_df = optimizer.compute_returns(nav_data)
    
    # Weights array
    w_array = np.array([request.weights[fid] for fid in request.fund_ids])
    
    # Benchmark returns (NIFTY 50 default)
    from models.database import Benchmark
    bench = db.query(Benchmark).filter(Benchmark.name == "NIFTY 50").first()
    bench_ret = None
    if bench:
        b_dates = sorted(bench.tri_series.keys())
        b_navs = [bench.tri_series[d] for d in b_dates]
        b_df = pd.DataFrame({'date': pd.to_datetime(b_dates), 'nav': b_navs})
        b_df.set_index('date', inplace=True)
        bench_ret = np.log(b_df / b_df.shift(1)).dropna().iloc[:, 0]
        
    results = backtester.run_backtest(
        weights=w_array,
        returns_df=returns_df,
        initial_value=request.initial_value,
        benchmark_returns=bench_ret
    )
    
    return results

@router.get("/{optimization_id}", response_model=OptimizationResponse)
def get_optimization_result(
    optimization_id: int,
    db: Session = Depends(get_db)
):
    """
    Get specific optimization result by ID
    """
    optimization = db.query(Optimization).filter(Optimization.id == optimization_id).first()
    
    if not optimization:
        raise HTTPException(status_code=404, detail="Optimization record not found")
        
    # Reconstruct response from stored JSON
    # Note: inputs and output are stored as JSON
    output = optimization.output
    
    return OptimizationResponse(
        mvp_weights=output.get('mvp', {}).get('weights', {}),
        max_sharpe_weights=output.get('max_sharpe', {}).get('weights', {}),
        mvp_metrics=output.get('mvp', {}).get('metrics', {}),
        max_sharpe_metrics=output.get('max_sharpe', {}).get('metrics', {}),
        efficient_frontier=output.get('frontier', []),
        monte_carlo_portfolios=output.get('monte_carlo', []),
        benchmark_metrics=output.get('benchmark_metrics'),  # Handle older records
        benchmark_name=output.get('benchmark_name')
    )