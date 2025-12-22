"""
Portfolio Optimization API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel
from database import get_db
from models.database import Fund, NAV, Optimization, Portfolio
from services.optimizer import PortfolioOptimizer
from config import settings
import json
from datetime import datetime, timedelta
import numpy as np

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


class OptimizationResponse(BaseModel):
    mvp_weights: Dict[int, float]
    max_sharpe_weights: Dict[int, float]
    mvp_metrics: Dict
    max_sharpe_metrics: Dict
    efficient_frontier: List[Dict]
    monte_carlo_portfolios: List[Dict] = []
    benchmark_metrics: Optional[Dict] = None
    benchmark_name: Optional[str] = None


@router.post("/run", response_model=OptimizationResponse)
async def run_optimization(
    request: OptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Run complete portfolio optimization
    Returns MVP, Max Sharpe, and Efficient Frontier
    """
    try:
        # Log incoming request for debugging
        print(f"Optimization Request:")
        print(f"  Client ID: {request.client_id}")
        print(f"  Selected Funds: {len(request.selected_funds)}")
        print(f"  Fund IDs: {[f.fund_id for f in request.selected_funds]}")
        print(f"  Asset Classes: {[f.asset_class for f in request.selected_funds]}")
        print(f"  Constraints: {request.constraints}")
        print(f"  Mode: {request.mode}")
        
        # Validate minimum number of funds
        if len(request.selected_funds) < 3:
            raise HTTPException(
                status_code=400,
                detail="Please select at least 3 funds for portfolio optimization. Single or dual fund portfolios cannot satisfy asset allocation constraints."
            )
        
        # Initialize optimizer
        optimizer = PortfolioOptimizer(
            risk_free_rate=settings.risk_free_rate,
            trading_days=settings.trading_days_per_year
        )
        
        # Fetch NAV data (DB First -> MFAPI -> Yahoo)
        nav_data = {}
        fund_map = {}  # Map fund_id to index
        
        # Helper to upsert NAVs
        def upsert_navs(fund_id, new_navs):
            # new_navs is list of (date_str, value)
            # Merging is safer.
            existing_dates = {n.date.strftime('%Y-%m-%d') for n in db.query(NAV.date).filter(NAV.fund_id == fund_id).all()}
            
            objects_to_add = []
            for d_str, val in new_navs:
                if d_str not in existing_dates:
                    objects_to_add.append(NAV(fund_id=fund_id, date=d_str, nav=val))
                    existing_dates.add(d_str)
            
            if objects_to_add:
                db.bulk_save_objects(objects_to_add)
                db.commit()
                print(f"  Saved {len(objects_to_add)} new NAV records to DB for fund {fund_id}")

        # Initialize MFAPIService once
        from services.mfapi import MFAPIService
        mfapi = MFAPIService()

        for idx, fund_id in enumerate(fund_ids):
            try:
                fund_name = fund_obj_map[fund_id].name or f"Fund {fund_id}"
                
                # 1. Check DB First
                last_nav = db.query(NAV).filter(NAV.fund_id == fund_id).order_by(NAV.date.desc()).first()
                db_navs = db.query(NAV).filter(NAV.fund_id == fund_id).order_by(NAV.date).all()
                
                # Check if data is fresh enough (e.g., < 2 days old)
                is_stale = True
                if last_nav:
                    days_since = (datetime.now().date() - last_nav.date).days
                    if days_since <= 2:
                        is_stale = False
                
                navs = []
                if db_navs and not is_stale and len(db_navs) > 30:
                    print(f"Fund {fund_id}: ✅ Using cached data from DB ({len(db_navs)} records, last update: {last_nav.date})")
                    navs = [(n.date.strftime('%Y-%m-%d'), float(n.nav)) for n in db_navs]
                
                # 2. If missing or stale, fetch from External API
                if not navs:
                    print(f"Fund {fund_id}: ⚠️ Data missing or stale. Fetching from MFAPI...")
                    try:
                        # Fetch from MFAPI
                        
                        details = await mfapi.get_scheme_details(str(fund_id))
                        
                        if not details or 'data' not in details:
                            raise ValueError("No data from MFAPI")

                        api_navs = []
                        for nav_entry in details['data']:
                            try:
                                d = datetime.strptime(nav_entry['date'], '%d-%m-%Y')
                                api_navs.append((d.strftime('%Y-%m-%d'), float(nav_entry['nav'])))
                            except:
                                continue
                        
                        # Fallback to Yahoo if MFAPI is weak
                        if len(api_navs) < 30:
                            print(f"  Insufficient MFAPI data for {fund_id}. Attempting Yahoo Finance fallback...")
                            from services.yahoo import YahooFinanceService
                            yahoo = YahooFinanceService()
                            
                            meta = details.get('meta', {})
                            scheme_name = meta.get('scheme_name', '')
                            isin = meta.get('isin_code', '')
                            
                            if scheme_name:
                                ticker = await yahoo.search_ticker(scheme_name, isin)
                                if ticker:
                                    print(f"  Fetching history from Yahoo for ticker: {ticker}")
                                    yahoo_navs = yahoo.get_nav_history(ticker)
                                    if len(yahoo_navs) > len(api_navs):
                                        print(f"  ✅ Yahoo Finance returned {len(yahoo_navs)} records.")
                                        api_navs = yahoo_navs

                        if len(api_navs) < 30:
                             raise HTTPException(
                                status_code=400,
                                detail=f"Insufficient historical data for '{fund_name}' (only {len(api_navs)} records). Please remove this fund."
                            )
                        
                        navs = api_navs
                        # Update DB
                        upsert_navs(fund_id, navs)
                        
                    except Exception as e:
                        print(f"  External fetch failed for {fund_id}: {e}")
                        # Final fallback: Use whatever is in DB even if stale
                        if db_navs and len(db_navs) > 30:
                            print(f"  ⚠️ Using stale DB data as fallback.")
                            navs = [(n.date.strftime('%Y-%m-%d'), float(n.nav)) for n in db_navs]
                        else:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Error fetching data for '{fund_name}': {str(e)}"
                            )

                nav_data[fund_id] = navs
                fund_map[fund_id] = idx
                
            except HTTPException:
                raise
            except Exception as e:
                print(f"Error fetching NAV for fund {fund_id}: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Error fetching data for '{fund_name}': {str(e)}"
                )
        
        # Close MFAPI client
        await mfapi.close()
        
        # Find common date range across all funds
        all_dates = []
        for fund_id, navs in nav_data.items():
            dates = set([nav[0] for nav in navs])
            all_dates.append(dates)
        
        # Get intersection of all date sets
        common_dates = set.intersection(*all_dates) if all_dates else set()
        
        if len(common_dates) < 30:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient overlapping data across selected funds: only {len(common_dates)} common dates. Please select funds with overlapping historical data (need 30+ days)."
            )
        
        # Filter nav_data to only include common dates
        filtered_nav_data = {}
        for fund_id, navs in nav_data.items():
            filtered_navs = [(date, nav) for date, nav in navs if date in common_dates]
            # Sort by date
            filtered_navs.sort(key=lambda x: x[0])
            filtered_nav_data[fund_id] = filtered_navs
        
        print(f"✅ Found {len(common_dates)} overlapping dates across all funds")
        
        # Use filtered data for optimization
        nav_data = filtered_nav_data
        
        # Compute returns and covariance
        returns_df = optimizer.compute_returns(nav_data)
        cov_matrix = optimizer.compute_covariance(returns_df)
        expected_returns = optimizer.compute_expected_returns(
            returns_df, 
            mode=request.mode,
            custom_returns=request.custom_returns
        )
        
        # Prepare constraints
        min_w = request.constraints.get('min_weight_per_fund', 0) / 100
        max_w = request.constraints.get('max_weight_per_fund', 100) / 100
        
        # Validation: Ensure max_w * count >= 1.0 for feasibility
        num_funds = len(fund_ids)
        if num_funds * max_w < 1.0:
            new_max = (1.0 / num_funds) + 0.05 # Add 5% buffer
            print(f"  ⚠️ Max weight {max_w:.2f} too low for {num_funds} funds. Adjusting to {new_max:.2f}")
            max_w = new_max
            
        opt_constraints = {
            'fund_bounds': (min_w, max_w)
        }
        
        # Asset class constraints - only apply if we have enough funds AND diversity
        if 'asset_allocation' in request.constraints and len(request.selected_funds) >= 3:
            # Check if we have funds from multiple asset classes
            asset_classes_present = set(f.asset_class for f in request.selected_funds)
            if len(asset_classes_present) >= 2:
                asset_class_bounds = {}
                fund_indices = {}
                for asset_class, allocation in request.constraints['asset_allocation'].items():
                    asset_class_bounds[asset_class] = (max(0, allocation - 20), min(100, allocation + 20))
                    indices = [fund_map[f.fund_id] for f in request.selected_funds if f.asset_class.lower() == asset_class.lower()]
                    if indices: fund_indices[asset_class] = indices
                opt_constraints['asset_class_bounds'] = asset_class_bounds
                opt_constraints['fund_indices'] = fund_indices

        # --- Benchmark & Metrics Section ---
        from models.database import Benchmark
        benchmark_metrics = None
        benchmark_name = "Composite Benchmark"
        composite_return_series = None
        
        try:
            # Get benchmarks for selected funds
            fund_entities = db.query(Fund).filter(Fund.id.in_(fund_ids)).all()
            fund_to_benchmark = {f.id: f.benchmark_id for f in fund_entities if f.benchmark_id}
            unique_bench_ids = set(fund_to_benchmark.values())
            
            if unique_bench_ids:
                benchmarks = db.query(Benchmark).filter(Benchmark.id.in_(unique_bench_ids)).all()
                bench_map = {b.id: b for b in benchmarks}
                bench_returns_all = {}
                
                for b_id, b in bench_map.items():
                    tri_series = b.tri_series # Already a dict
                    b_dates = sorted(tri_series.keys())
                    b_navs = [tri_series[d] for d in b_dates]
                    b_df = pd.DataFrame({'date': pd.to_datetime(b_dates), 'nav': b_navs})
                    b_df.set_index('date', inplace=True)
                    bench_returns_all[b_id] = np.log(b_df / b_df.shift(1)).dropna()
                
                # Combine benchmark returns (Equal weighted or based on base allocation for composite reference)
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
            
            # Retry MVP with relaxed constraints
            try:
                mvp_weights, _, mvp_vol = optimizer.optimize_mvp(cov_matrix, opt_constraints)
                print("  ✅ MVP Feasible with relaxed constraints")
            except Exception as e2:
                 raise HTTPException(status_code=400, detail=f"Optimization infeasible even with relaxed constraints: {str(e2)}")

        mvp_metrics = optimizer.compute_portfolio_metrics(mvp_weights, returns_df, expected_returns, cov_matrix, benchmark_returns=composite_return_series)
        
        # 2. Max Sharpe (with Fallback)
        try:
            ms_weights, ms_ret, ms_vol, ms_sharpe = optimizer.optimize_max_sharpe(expected_returns, cov_matrix, opt_constraints)
        except Exception as e:
            print(f"  ⚠️ Max Sharpe optimization failed ({str(e)}). Falling back to MVP.")
            ms_weights = mvp_weights
            ms_ret, ms_vol = optimizer.compute_portfolio_performance(ms_weights, expected_returns, cov_matrix)
            ms_sharpe = (ms_ret - settings.risk_free_rate) / ms_vol if ms_vol > 0 else 0
        
        ms_metrics = optimizer.compute_portfolio_metrics(ms_weights, returns_df, expected_returns, cov_matrix, benchmark_returns=composite_return_series)
        
        # 3. Frontier
        try:
            frontier = optimizer.generate_efficient_frontier(expected_returns, cov_matrix, n_points=50, constraints=opt_constraints)
        except:
            frontier = []
        
        # Convert weights
        mvp_weights_dict = {fund_ids[i]: float(w) for i, w in enumerate(mvp_weights) if w > 0.001}
        ms_weights_dict = {fund_ids[i]: float(w) for i, w in enumerate(ms_weights) if w > 0.001}
        
        # 4. Monte Carlo Simulation (for chart visualization)
        mongo_carlo_points = []
        try:
            mongo_carlo_points = optimizer.generate_monte_carlo_portfolios(
                expected_returns, 
                cov_matrix, 
                n_simulations=2000, # Sufficient for visualization without bloat
                constraints=opt_constraints
            )
        except Exception as e:
            print(f"⚠️ Monte Carlo simulation failed: {e}")

        # Save optimization results to database
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
            output={
                'mvp': {
                    'weights': mvp_weights_dict,
                    'metrics': mvp_metrics
                },
                'max_sharpe': {
                    'weights': ms_weights_dict,
                    'metrics': ms_metrics
                },
                'frontier': frontier,
                'monte_carlo': mongo_carlo_points
            }
        )
        db.add(optimization)
        db.commit()
        
        return OptimizationResponse(
            mvp_weights=mvp_weights_dict,
            max_sharpe_weights=ms_weights_dict,
            mvp_metrics=mvp_metrics,
            max_sharpe_metrics=ms_metrics,
            efficient_frontier=frontier,
            monte_carlo_portfolios=mongo_carlo_points,
            benchmark_metrics=benchmark_metrics,
            benchmark_name=benchmark_name
        )
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as-is
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        # Log the full error for debugging
        import traceback
        error_details = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        print(f"Optimization Error: {error_details}")
        raise HTTPException(
            status_code=500, 
            detail=f"Optimization failed: {str(e)}"
        )


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
        start_date = end_date - timedelta(days=3*365)
        
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
        raise HTTPException(status_code=500, detail=str(e))
@ r o u t e r . g e t ( " / { o p t i m i z a t i o n _ i d } " ,   r e s p o n s e _ m o d e l = O p t i m i z a t i o n R e s p o n s e ) 
 
 d e f   g e t _ o p t i m i z a t i o n _ r e s u l t ( 
 
         o p t i m i z a t i o n _ i d :   i n t , 
 
         d b :   S e s s i o n   =   D e p e n d s ( g e t _ d b ) 
 
 ) : 
 
         " " " 
 
         G e t   s p e c i f i c   o p t i m i z a t i o n   r e s u l t   b y   I D 
 
         " " " 
 
         o p t i m i z a t i o n   =   d b . q u e r y ( O p t i m i z a t i o n ) . f i l t e r ( O p t i m i z a t i o n . i d   = =   o p t i m i z a t i o n _ i d ) . f i r s t ( ) 
 
         
 
         i f   n o t   o p t i m i z a t i o n : 
 
                 r a i s e   H T T P E x c e p t i o n ( s t a t u s _ c o d e = 4 0 4 ,   d e t a i l = " O p t i m i z a t i o n   r e c o r d   n o t   f o u n d " ) 
 
                 
 
         #   R e c o n s t r u c t   r e s p o n s e   f r o m   s t o r e d   J S O N 
 
         #   N o t e :   i n p u t s   a n d   o u t p u t   a r e   s t o r e d   a s   J S O N 
 
         o u t p u t   =   o p t i m i z a t i o n . o u t p u t 
 
         
 
         r e t u r n   O p t i m i z a t i o n R e s p o n s e ( 
 
                 m v p _ w e i g h t s = o u t p u t . g e t ( ' m v p ' ,   { } ) . g e t ( ' w e i g h t s ' ,   { } ) , 
 
                 m a x _ s h a r p e _ w e i g h t s = o u t p u t . g e t ( ' m a x _ s h a r p e ' ,   { } ) . g e t ( ' w e i g h t s ' ,   { } ) , 
 
                 m v p _ m e t r i c s = o u t p u t . g e t ( ' m v p ' ,   { } ) . g e t ( ' m e t r i c s ' ,   { } ) , 
 
                 m a x _ s h a r p e _ m e t r i c s = o u t p u t . g e t ( ' m a x _ s h a r p e ' ,   { } ) . g e t ( ' m e t r i c s ' ,   { } ) , 
 
                 e f f i c i e n t _ f r o n t i e r = o u t p u t . g e t ( ' f r o n t i e r ' ,   [ ] ) , 
 
                 m o n t e _ c a r l o _ p o r t f o l i o s = o u t p u t . g e t ( ' m o n t e _ c a r l o ' ,   [ ] ) , 
 
                 b e n c h m a r k _ m e t r i c s = o u t p u t . g e t ( ' b e n c h m a r k _ m e t r i c s ' ) ,     #   H a n d l e   o l d e r   r e c o r d s 
 
                 b e n c h m a r k _ n a m e = o u t p u t . g e t ( ' b e n c h m a r k _ n a m e ' ) 
 
         ) 
 
 