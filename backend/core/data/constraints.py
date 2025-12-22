"""
Constraints builder module - MODULE 3
Build optimization constraints
"""
import numpy as np
from typing import List, Dict, Any


def build_fully_invested_constraint(n_assets: int) -> Dict[str, Any]:
    """
    Build constraint: sum of weights = 1
    
    Args:
        n_assets: Number of assets
    
    Returns:
        Constraint dictionary
    """
    return {
        'type': 'eq',
        'fun': lambda w: np.sum(w) - 1.0
    }


def build_no_shorting_constraints(n_assets: int) -> List[Dict[str, Any]]:
    """
    Build constraints: all weights >= 0 (no shorting)
    
    Args:
        n_assets: Number of assets
    
    Returns:
        List of constraint dictionaries
    """
    constraints = []
    for i in range(n_assets):
        constraints.append({
            'type': 'ineq',
            'fun': lambda w, idx=i: w[idx]  # w[i] >= 0
        })
    
    return constraints


def build_weight_bounds(
    n_assets: int,
    min_weight: float = 0.0,
    max_weight: float = 1.0
) -> List[tuple]:
    """
    Build weight bounds for each asset
    
    Args:
        n_assets: Number of assets
        min_weight: Minimum weight per asset (default: 0)
        max_weight: Maximum weight per asset (default: 1)
    
    Returns:
        List of (min, max) tuples for each asset
    """
    return [(min_weight, max_weight) for _ in range(n_assets)]


def build_asset_class_constraints(
    asset_class_map: Dict[int, str],
    allocation_constraints: Dict[str, tuple]
) -> List[Dict[str, Any]]:
    """
    Build asset class allocation constraints
    
    Args:
        asset_class_map: Mapping of fund index to asset class
        allocation_constraints: Dict mapping asset class to (min%, max%)
            Example: {'Equity': (0.4, 0.7), 'Debt': (0.2, 0.5)}
    
    Returns:
        List of constraint dictionaries
    """
    constraints = []
    
    for asset_class, (min_pct, max_pct) in allocation_constraints.items():
        # Find indices of funds in this asset class
        indices = [i for i, ac in asset_class_map.items() if ac == asset_class]
        
        if not indices:
            continue
        
        # Minimum constraint: sum of weights >= min_pct
        constraints.append({
            'type': 'ineq',
            'fun': lambda w, idx=indices, min_val=min_pct: 
                np.sum([w[i] for i in idx]) - min_val
        })
        
        # Maximum constraint: sum of weights <= max_pct
        constraints.append({
            'type': 'ineq',
            'fun': lambda w, idx=indices, max_val=max_pct: 
                max_val - np.sum([w[i] for i in idx])
        })
    
    return constraints


def build_target_return_constraint(
    expected_returns: np.ndarray,
    target_return: float
) -> Dict[str, Any]:
    """
    Build constraint: portfolio return >= target return
    
    Args:
        expected_returns: Array of expected returns
        target_return: Target portfolio return
    
    Returns:
        Constraint dictionary
    """
    return {
        'type': 'ineq',
        'fun': lambda w: np.dot(w, expected_returns) - target_return
    }


def build_target_volatility_constraint(
    cov_matrix: np.ndarray,
    target_volatility: float
) -> Dict[str, Any]:
    """
    Build constraint: portfolio volatility <= target volatility
    
    Args:
        cov_matrix: Covariance matrix
        target_volatility: Target portfolio volatility
    
    Returns:
        Constraint dictionary
    """
    return {
        'type': 'ineq',
        'fun': lambda w: target_volatility**2 - (w.T @ cov_matrix @ w)
    }


def build_all_constraints(
    n_assets: int,
    asset_class_map: Dict[int, str],
    allocation_constraints: Dict[str, tuple],
    min_weight: float = 0.0,
    max_weight: float = 0.20,
    target_return: float = None,
    target_volatility: float = None,
    expected_returns: np.ndarray = None,
    cov_matrix: np.ndarray = None
) -> tuple:
    """
    Build all constraints for optimization
    
    Args:
        n_assets: Number of assets
        asset_class_map: Mapping of fund index to asset class
        allocation_constraints: Asset class min/max allocations
        min_weight: Minimum weight per fund
        max_weight: Maximum weight per fund
        target_return: Optional target return constraint
        target_volatility: Optional target volatility constraint
        expected_returns: Required if target_return is set
        cov_matrix: Required if target_volatility is set
    
    Returns:
        Tuple of (constraints_list, bounds_list)
    """
    constraints = []
    
    # Fully invested
    constraints.append(build_fully_invested_constraint(n_assets))
    
    # Asset class constraints
    if asset_class_map and allocation_constraints:
        constraints.extend(
            build_asset_class_constraints(asset_class_map, allocation_constraints)
        )
    
    # Target return constraint
    if target_return is not None and expected_returns is not None:
        constraints.append(
            build_target_return_constraint(expected_returns, target_return)
        )
    
    # Target volatility constraint
    if target_volatility is not None and cov_matrix is not None:
        constraints.append(
            build_target_volatility_constraint(cov_matrix, target_volatility)
        )
    
    # Weight bounds (no shorting + max weight)
    bounds = build_weight_bounds(n_assets, min_weight, max_weight)
    
    return constraints, bounds
