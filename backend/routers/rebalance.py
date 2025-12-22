"""
Portfolio Rebalancing API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import get_db
from models.database import Portfolio, Fund, NAV
from services.pdf_parser import CASParser
from services.optimizer import PortfolioOptimizer
from config import settings
import json
import os
import tempfile
import numpy as np
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/rebalance", tags=["rebalance"])


class PortfolioAnalysisResponse(BaseModel):
    holdings: List[Dict[str, Any]]
    total_value: float
    asset_allocation: Dict[str, float]
    weights: Dict[int, float]
    unmapped_funds: List[Dict[str, Any]]


class RebalanceRequest(BaseModel):
    portfolio_id: Optional[int] = None
    initial_holdings: Optional[List[Dict[str, Any]]] = None
    target_allocation: Dict[str, float]
    constraints: Dict[str, Any]


class RebalanceResponse(BaseModel):
    current_portfolio: Dict[str, Any]
    optimized_portfolio: Dict[str, Any]
    trades: List[Dict[str, Any]]
    impact_analysis: Dict[str, Any]


@router.post("/upload", response_model=PortfolioAnalysisResponse)
async def upload_portfolio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and parse CAS PDF
    """
    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            parser = CASParser()
            # 1. Extract holdings from PDF
            raw_holdings = parser.parse_pdf(tmp_path)
            
            if not raw_holdings:
                raise HTTPException(status_code=400, detail="No holdings found in PDF. Please ensure it is a valid CAS statement.")
            
            # 2. Map to database funds
            mapped_holdings = parser.map_to_database(raw_holdings, db)
            
            # 3. Calculate metrics
            total_value = sum(h['value'] for h in mapped_holdings)
            asset_allocation = parser.get_asset_allocation(mapped_holdings)
            weights = parser.calculate_weights(mapped_holdings)
            
            unmapped = [h for h in mapped_holdings if h['fund_id'] is None]
            
            return PortfolioAnalysisResponse(
                holdings=mapped_holdings,
                total_value=total_value,
                asset_allocation=asset_allocation,
                weights=weights,
                unmapped_funds=unmapped
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"Rebalance upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize", response_model=RebalanceResponse)
async def optimize_rebalancing(
    request: RebalanceRequest,
    db: Session = Depends(get_db)
):
    """
    Generate rebalancing recommendations
    """
    try:
        current_weights = {}
        fund_ids = []
        
        # 1. Get current portfolio data
        if request.portfolio_id:
            portfolio = db.query(Portfolio).filter(Portfolio.id == request.portfolio_id).first()
            if not portfolio:
                raise HTTPException(status_code=404, detail="Portfolio not found")
            holdings_data = json.loads(portfolio.holdings)
            current_weights = holdings_data.get('weights', {})
        elif request.initial_holdings:
            # Use data passed from /upload
            total_val = sum(h['value'] for h in request.initial_holdings if h['fund_id'])
            for h in request.initial_holdings:
                if h['fund_id']:
                    current_weights[str(h['fund_id'])] = h['value'] / total_val
        else:
            raise HTTPException(status_code=400, detail="Missing portfolio data")
            
        fund_ids = [int(fid) for fid in current_weights.keys()]
        
        if not fund_ids:
            raise HTTPException(status_code=400, detail="No valid funds found for optimization")
            
        # 2. Initialize optimizer
        optimizer = PortfolioOptimizer(
            risk_free_rate=settings.risk_free_rate,
            trading_days=settings.trading_days_per_year
        )
        
        # 3. Fetch NAV data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=3*365)
        
        nav_data = {}
        for fund_id in fund_ids:
            navs = db.query(NAV).filter(
                NAV.fund_id == fund_id,
                NAV.date >= start_date,
                NAV.date <= end_date
            ).order_by(NAV.date).all()
            
            if navs:
                nav_data[fund_id] = [(nav.date.strftime('%Y-%m-%d'), float(nav.nav)) for nav in navs]
        
        if len(nav_data) < 2:
            # Fallback for demo/insufficient data: create mock return data if needed
            # For now, we'll try to use what we have or error
            if not nav_data:
                raise HTTPException(status_code=400, detail="Insufficient price history for the selected funds")

        # 4. Compute metrics
        returns_df = optimizer.compute_returns(nav_data)
        cov_matrix = optimizer.compute_covariance(returns_df)
        expected_returns = optimizer.compute_expected_returns(returns_df)
        
        # Alignment check: Ensure weights follow the same order as returns_df columns
        cols = [int(c.replace('fund_', '')) for c in returns_df.columns]
        current_weights_array = np.array([current_weights.get(str(fid), 0) for fid in cols])
        
        # 5. Run Optimization
        n_assets = len(cols)
        min_weight = request.constraints.get('min_weight_per_fund', 0) / 100
        max_weight = request.constraints.get('max_weight_per_fund', 100) / 100
        
        # Infeasibility Check: If n_assets * max_weight < 1, it's impossible to sum to 1
        if n_assets * max_weight < 1.0:
            print(f"Relaxing max_weight from {max_weight} to {1.0/n_assets + 0.05} for feasibility with {n_assets} assets")
            max_weight = (1.0 / n_assets) + 0.05
            
        opt_constraints = {
            'fund_bounds': (min_weight, max_weight)
        }
        
        try:
            opt_weights, opt_return, opt_vol, opt_sharpe = optimizer.optimize_max_sharpe(
                expected_returns, cov_matrix, opt_constraints
            )
            strategy_name = "Maximum Sharpe Ratio"
        except Exception as e:
            print(f"Max Sharpe optimization failed, falling back to MVP: {e}")
            # Fallback to Minimum Variance Portfolio
            opt_weights, opt_return, opt_vol = optimizer.optimize_mvp(
                cov_matrix, opt_constraints
            )
            opt_sharpe = (opt_return - settings.risk_free_rate) / opt_vol if opt_vol > 0 else 0
            strategy_name = "Minimum Volatility (Fallback)"
        
        # 6. Calc Metrics
        current_metrics = optimizer.compute_portfolio_metrics(
            current_weights_array, returns_df, expected_returns, cov_matrix
        )
        opt_metrics = optimizer.compute_portfolio_metrics(
            opt_weights, returns_df, expected_returns, cov_matrix
        )
        
        # 7. Generate Trades
        trades = []
        for i, fund_id in enumerate(cols):
            cw = current_weights_array[i]
            nw = float(opt_weights[i])
            change = nw - cw
            
            if abs(change) > 0.005:  # 0.5% threshold
                trades.append({
                    'fund_id': fund_id,
                    'current_weight': cw,
                    'new_weight': nw,
                    'change': change,
                    'action': 'BUY' if change > 0 else 'SELL',
                    'change_percent': change * 100
                })
        
        trades.sort(key=lambda x: abs(x['change']), reverse=True)
        
        # 8. Impact
        impact = {
            'return_improvement': opt_metrics['expected_return'] - current_metrics['expected_return'],
            'volatility_reduction': current_metrics['volatility'] - opt_metrics['volatility'],
            'sharpe_improvement': opt_metrics['sharpe_ratio'] - current_metrics['sharpe_ratio'],
            'max_drawdown_improvement': current_metrics['max_drawdown'] - opt_metrics['max_drawdown'],
        }
        
        return RebalanceResponse(
            current_portfolio={
                'weights': {str(cols[i]): current_weights_array[i] for i in range(len(cols))},
                'metrics': current_metrics
            },
            optimized_portfolio={
                'weights': {str(cols[i]): float(opt_weights[i]) for i in range(len(cols))},
                'metrics': opt_metrics
            },
            trades=trades,
            impact_analysis=impact
        )
        
    except Exception as e:
        print(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

