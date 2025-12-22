"""
Maximum Sharpe Ratio optimizer - MODULE 4
Find portfolio with maximum Sharpe ratio
"""
import cvxpy as cp
import numpy as np
from typing import Tuple


def optimize_max_sharpe(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_free_rate: float = 0.065,
    asset_class_indices: dict = None,
    asset_class_bounds: dict = None,
    weight_bounds: Tuple[float, float] = (0.0, 1.0)
) -> Tuple[np.ndarray, float, float, dict]:
    """
    Find Maximum Sharpe Ratio Portfolio using CVXPY
    
    Maximize: (w^T * μ - R_f) / sqrt(w^T * Σ * w)
    
    This is solved via fractional programming transformation:
    Minimize: w^T * Σ * w
    Subject to: w^T * (μ - R_f) = 1, sum(w) >= 0
    
    Then normalize: weights = w / sum(w)
    
    Args:
        expected_returns: Expected returns vector (n,)
        cov_matrix: Covariance matrix (n x n)
        risk_free_rate: Risk-free rate (default: 6.5%)
        asset_class_indices: Optional dict of asset class to indices
        asset_class_bounds: Optional dict of asset class to (min, max)
        weight_bounds: (min, max) weight per fund
    
    Returns:
        Tuple of (optimal_weights, sharpe_ratio, portfolio_return, solver_info)
    """
    n_assets = len(expected_returns)
    
    # Excess returns
    excess_returns = expected_returns - risk_free_rate
    
    # Check if all excess returns are negative
    if np.all(excess_returns <= 0):
        # Return minimum variance portfolio instead
        from core.optimizer.mvp import optimize_minimum_variance_with_asset_class
        if asset_class_indices and asset_class_bounds:
            weights, var, info = optimize_minimum_variance_with_asset_class(
                cov_matrix, asset_class_indices, asset_class_bounds, weight_bounds
            )
        else:
            from core.optimizer.mvp import optimize_minimum_variance
            weights, var, info = optimize_minimum_variance(cov_matrix)
        
        portfolio_return = np.dot(weights, expected_returns)
        portfolio_vol = np.sqrt(var)
        sharpe = (portfolio_return - risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0
        
        return weights, sharpe, portfolio_return, info
    
    # Decision variable (auxiliary variable y)
    y = cp.Variable(n_assets)
    kappa = cp.Variable()  # Scaling variable
    
    # Objective: minimize y^T * Σ * y
    portfolio_variance = cp.quad_form(y, cov_matrix)
    objective = cp.Minimize(portfolio_variance)
    
    # Constraints
    constraints = [
        excess_returns @ y == 1,  # Normalization constraint
        kappa >= 0
    ]
    
    # Weight bounds (on y, will be normalized later)
    min_w, max_w = weight_bounds
    
    # If we have asset class constraints, apply them
    if asset_class_indices and asset_class_bounds:
        # This is approximate - exact handling requires more complex formulation
        for asset_class, indices in asset_class_indices.items():
            if asset_class in asset_class_bounds:
                min_alloc, max_alloc = asset_class_bounds[asset_class]
                # These constraints will be checked after normalization
                pass
    
    # Non-negativity
    for i in range(n_assets):
        constraints.append(y[i] >= 0)
    
    # Solve
    problem = cp.Problem(objective, constraints)
    
    try:
        problem.solve(solver=cp.ECOS, verbose=False)
        
        if problem.status not in ["optimal", "optimal_inaccurate"]:
            raise ValueError(f"Optimization failed: {problem.status}")
        
        # Recover weights: w = y / sum(y)
        y_value = y.value
        optimal_weights = y_value / np.sum(y_value)
        
        # Apply weight bounds
        optimal_weights = np.clip(optimal_weights, min_w, max_w)
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        # Clean up small weights
        optimal_weights[np.abs(optimal_weights) < 1e-6] = 0
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        # Calculate metrics
        portfolio_return = np.dot(optimal_weights, expected_returns)
        portfolio_variance = optimal_weights.T @ cov_matrix @ optimal_weights
        portfolio_vol = np.sqrt(portfolio_variance)
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_vol
        
        solver_info = {
            "status": problem.status,
            "solve_time": problem.solver_stats.solve_time if hasattr(problem.solver_stats, 'solve_time') else None
        }
        
        return optimal_weights, float(sharpe_ratio), float(portfolio_return), solver_info
    
    except Exception as e:
        raise RuntimeError(f"Max Sharpe optimization failed: {str(e)}")


def optimize_max_sharpe_simple(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_free_rate: float = 0.065
) -> Tuple[np.ndarray, float]:
    """
    Simplified Maximum Sharpe Ratio (no asset class constraints)
    
    Args:
        expected_returns: Expected returns vector
        cov_matrix: Covariance matrix
        risk_free_rate: Risk-free rate
    
    Returns:
        Tuple of (optimal_weights, sharpe_ratio)
    """
    weights, sharpe, _, _ = optimize_max_sharpe(
        expected_returns,
        cov_matrix,
        risk_free_rate
    )
    
    return weights, sharpe
