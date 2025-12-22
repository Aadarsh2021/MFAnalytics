"""
Efficient Frontier generator - MODULE 4
Generate efficient frontier portfolios
"""
import cvxpy as cp
import numpy as np
from typing import List, Tuple, Dict
from core.optimizer.mvp import optimize_minimum_variance


def generate_efficient_frontier(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    num_points: int = 40,
    asset_class_indices: dict = None,
    asset_class_bounds: dict = None,
    weight_bounds: Tuple[float, float] = (0.0, 1.0)
) -> List[Dict]:
    """
    Generate efficient frontier by varying target return
    
    For each target return level:
    Minimize: w^T * Σ * w
    Subject to: w^T * μ >= target_return, sum(w) = 1, w >= 0
    
    Args:
        expected_returns: Expected returns vector
        cov_matrix: Covariance matrix
        num_points: Number of points on frontier (default: 40)
        asset_class_indices: Optional dict of asset class to indices
        asset_class_bounds: Optional dict of asset class to (min, max)
        weight_bounds: (min, max) weight per fund
    
    Returns:
        List of dicts with keys: weights, return, volatility, sharpe
    """
    n_assets = len(expected_returns)
    
    # Find minimum and maximum possible returns
    # Minimum: MVP return
    mvp_weights, mvp_var, _ = optimize_minimum_variance(cov_matrix)
    min_return = np.dot(mvp_weights, expected_returns)
    
    # Maximum: highest single asset return (respecting constraints)
    max_return = np.max(expected_returns)
    
    # Generate target returns
    target_returns = np.linspace(min_return, max_return, num_points)
    
    frontier_portfolios = []
    
    for target_return in target_returns:
        try:
            # Optimize for this target return
            weights, variance = optimize_for_target_return(
                expected_returns,
                cov_matrix,
                target_return,
                asset_class_indices,
                asset_class_bounds,
                weight_bounds
            )
            
            if weights is not None:
                portfolio_return = np.dot(weights, expected_returns)
                portfolio_vol = np.sqrt(variance)
                sharpe = (portfolio_return - 0.065) / portfolio_vol if portfolio_vol > 0 else 0
                
                frontier_portfolios.append({
                    "weights": weights.tolist(),
                    "return": float(portfolio_return),
                    "volatility": float(portfolio_vol),
                    "sharpe": float(sharpe)
                })
        
        except Exception:
            # Skip infeasible points
            continue
    
    return frontier_portfolios


def optimize_for_target_return(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    target_return: float,
    asset_class_indices: dict = None,
    asset_class_bounds: dict = None,
    weight_bounds: Tuple[float, float] = (0.0, 1.0)
) -> Tuple[np.ndarray, float]:
    """
    Optimize portfolio for a specific target return
    
    Args:
        expected_returns: Expected returns vector
        cov_matrix: Covariance matrix
        target_return: Target portfolio return
        asset_class_indices: Optional dict of asset class to indices
        asset_class_bounds: Optional dict of asset class to (min, max)
        weight_bounds: (min, max) weight per fund
    
    Returns:
        Tuple of (optimal_weights, portfolio_variance)
    """
    n_assets = len(expected_returns)
    
    # Decision variable
    w = cp.Variable(n_assets)
    
    # Objective: minimize variance
    portfolio_variance = cp.quad_form(w, cov_matrix)
    objective = cp.Minimize(portfolio_variance)
    
    # Constraints
    constraints = [
        cp.sum(w) == 1,  # Fully invested
        expected_returns @ w >= target_return  # Target return
    ]
    
    # Weight bounds
    min_w, max_w = weight_bounds
    for i in range(n_assets):
        constraints.append(w[i] >= min_w)
        constraints.append(w[i] <= max_w)
    
    # Asset class constraints
    if asset_class_indices and asset_class_bounds:
        for asset_class, indices in asset_class_indices.items():
            if asset_class in asset_class_bounds:
                min_alloc, max_alloc = asset_class_bounds[asset_class]
                asset_class_sum = cp.sum([w[i] for i in indices])
                constraints.append(asset_class_sum >= min_alloc)
                constraints.append(asset_class_sum <= max_alloc)
    
    # Solve
    problem = cp.Problem(objective, constraints)
    
    try:
        problem.solve(solver=cp.ECOS, verbose=False)
        
        if problem.status not in ["optimal", "optimal_inaccurate"]:
            return None, None
        
        optimal_weights = w.value
        optimal_variance = portfolio_variance.value
        
        # Clean up weights
        optimal_weights = optimal_weights / optimal_weights.sum()
        optimal_weights[np.abs(optimal_weights) < 1e-6] = 0
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        return optimal_weights, float(optimal_variance)
    
    except Exception:
        return None, None


def find_tangency_portfolio(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_free_rate: float = 0.065
) -> Dict:
    """
    Find tangency portfolio (maximum Sharpe ratio)
    
    This is a wrapper around the Max Sharpe optimizer
    
    Args:
        expected_returns: Expected returns vector
        cov_matrix: Covariance matrix
        risk_free_rate: Risk-free rate
    
    Returns:
        Dict with weights, return, volatility, sharpe
    """
    from core.optimizer.sharpe import optimize_max_sharpe_simple
    
    weights, sharpe = optimize_max_sharpe_simple(
        expected_returns,
        cov_matrix,
        risk_free_rate
    )
    
    portfolio_return = np.dot(weights, expected_returns)
    portfolio_variance = weights.T @ cov_matrix @ weights
    portfolio_vol = np.sqrt(portfolio_variance)
    
    return {
        "weights": weights.tolist(),
        "return": float(portfolio_return),
        "volatility": float(portfolio_vol),
        "sharpe": float(sharpe)
    }
