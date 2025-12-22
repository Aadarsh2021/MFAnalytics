"""
Minimum Variance Portfolio (MVP) optimizer - MODULE 4
Find portfolio with minimum variance
"""
import cvxpy as cp
import numpy as np
from typing import Tuple, Optional


def optimize_minimum_variance(
    cov_matrix: np.ndarray,
    constraints_list: list = None,
    bounds: list = None
) -> Tuple[np.ndarray, float, dict]:
    """
    Find Minimum Variance Portfolio using CVXPY
    
    Minimize: w^T * Σ * w
    Subject to: sum(w) = 1, w >= 0, other constraints
    
    Args:
        cov_matrix: Covariance matrix (n x n)
        constraints_list: Optional list of additional constraints
        bounds: Optional list of (min, max) tuples for each weight
    
    Returns:
        Tuple of (optimal_weights, portfolio_variance, solver_info)
    """
    n_assets = cov_matrix.shape[0]
    
    # Decision variable
    w = cp.Variable(n_assets)
    
    # Objective: minimize portfolio variance
    portfolio_variance = cp.quad_form(w, cov_matrix)
    objective = cp.Minimize(portfolio_variance)
    
    # Constraints
    constraints = [
        cp.sum(w) == 1,  # Fully invested
        w >= 0  # No shorting
    ]
    
    # Add weight bounds if provided
    if bounds:
        for i, (min_w, max_w) in enumerate(bounds):
            constraints.append(w[i] >= min_w)
            constraints.append(w[i] <= max_w)
    
    # Add custom constraints if provided
    if constraints_list:
        # Note: Custom constraints need to be in CVXPY format
        # This is a simplified version
        pass
    
    # Solve
    problem = cp.Problem(objective, constraints)
    
    try:
        problem.solve(solver=cp.ECOS, verbose=False)
        
        if problem.status not in ["optimal", "optimal_inaccurate"]:
            raise ValueError(f"Optimization failed: {problem.status}")
        
        optimal_weights = w.value
        optimal_variance = portfolio_variance.value
        
        # Ensure weights sum to 1 (numerical precision)
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        # Round very small weights to zero
        optimal_weights[np.abs(optimal_weights) < 1e-6] = 0
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        solver_info = {
            "status": problem.status,
            "solve_time": problem.solver_stats.solve_time if hasattr(problem.solver_stats, 'solve_time') else None,
            "num_iters": problem.solver_stats.num_iters if hasattr(problem.solver_stats, 'num_iters') else None
        }
        
        return optimal_weights, float(optimal_variance), solver_info
    
    except Exception as e:
        raise RuntimeError(f"MVP optimization failed: {str(e)}")


def optimize_minimum_variance_with_asset_class(
    cov_matrix: np.ndarray,
    asset_class_indices: dict,
    asset_class_bounds: dict,
    weight_bounds: Tuple[float, float] = (0.0, 1.0)
) -> Tuple[np.ndarray, float, dict]:
    """
    Minimum Variance Portfolio with asset class constraints
    
    Args:
        cov_matrix: Covariance matrix
        asset_class_indices: Dict mapping asset class to list of indices
            Example: {'Equity': [0, 1, 2], 'Debt': [3, 4]}
        asset_class_bounds: Dict mapping asset class to (min, max) allocation
            Example: {'Equity': (0.4, 0.7), 'Debt': (0.2, 0.5)}
        weight_bounds: (min, max) weight per fund
    
    Returns:
        Tuple of (optimal_weights, portfolio_variance, solver_info)
    """
    n_assets = cov_matrix.shape[0]
    
    # Decision variable
    w = cp.Variable(n_assets)
    
    # Objective
    portfolio_variance = cp.quad_form(w, cov_matrix)
    objective = cp.Minimize(portfolio_variance)
    
    # Constraints
    constraints = [
        cp.sum(w) == 1,  # Fully invested
    ]
    
    # Weight bounds
    min_w, max_w = weight_bounds
    for i in range(n_assets):
        constraints.append(w[i] >= min_w)
        constraints.append(w[i] <= max_w)
    
    # Asset class constraints
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
            raise ValueError(f"Optimization failed: {problem.status}")
        
        optimal_weights = w.value
        optimal_variance = portfolio_variance.value
        
        # Clean up weights
        optimal_weights = optimal_weights / optimal_weights.sum()
        optimal_weights[np.abs(optimal_weights) < 1e-6] = 0
        optimal_weights = optimal_weights / optimal_weights.sum()
        
        solver_info = {
            "status": problem.status,
            "solve_time": problem.solver_stats.solve_time if hasattr(problem.solver_stats, 'solve_time') else None
        }
        
        return optimal_weights, float(optimal_variance), solver_info
    
    except Exception as e:
        raise RuntimeError(f"MVP optimization failed: {str(e)}")
