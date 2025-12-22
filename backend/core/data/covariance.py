"""
Covariance matrix calculation module - MODULE 3
Build covariance matrix with optional shrinkage
"""
import pandas as pd
import numpy as np
from typing import Tuple
from sklearn.covariance import LedoitWolf


def build_covariance_matrix(
    returns: pd.DataFrame,
    shrinkage: bool = True,
    annualize: bool = True,
    trading_days: int = 252
) -> Tuple[np.ndarray, float]:
    """
    Build covariance matrix from returns
    
    Args:
        returns: DataFrame with returns (funds as columns)
        shrinkage: Whether to apply Ledoit-Wolf shrinkage (default: True)
        annualize: Whether to annualize the covariance (default: True)
        trading_days: Number of trading days per year (default: 252)
    
    Returns:
        Tuple of (covariance_matrix, shrinkage_intensity)
    """
    if shrinkage:
        # Ledoit-Wolf shrinkage estimator
        lw = LedoitWolf()
        cov_matrix = lw.fit(returns).covariance_
        shrinkage_intensity = lw.shrinkage_
    else:
        # Sample covariance
        cov_matrix = returns.cov().values
        shrinkage_intensity = 0.0
    
    # Annualize if requested
    if annualize:
        cov_matrix = cov_matrix * trading_days
    
    # Ensure positive semi-definite
    cov_matrix = make_positive_semidefinite(cov_matrix)
    
    return cov_matrix, shrinkage_intensity


def make_positive_semidefinite(matrix: np.ndarray, epsilon: float = 1e-8) -> np.ndarray:
    """
    Ensure matrix is positive semi-definite
    
    Args:
        matrix: Covariance matrix
        epsilon: Small value to add to diagonal if needed
    
    Returns:
        Positive semi-definite matrix
    """
    # Compute eigenvalues
    eigenvalues, eigenvectors = np.linalg.eigh(matrix)
    
    # If all eigenvalues are positive, return original matrix
    if np.all(eigenvalues > 0):
        return matrix
    
    # Replace negative eigenvalues with small positive value
    eigenvalues = np.maximum(eigenvalues, epsilon)
    
    # Reconstruct matrix
    psd_matrix = eigenvectors @ np.diag(eigenvalues) @ eigenvectors.T
    
    return psd_matrix


def calculate_correlation_matrix(returns: pd.DataFrame) -> np.ndarray:
    """
    Calculate correlation matrix from returns
    
    Args:
        returns: DataFrame with returns (funds as columns)
    
    Returns:
        Correlation matrix
    """
    return returns.corr().values


def calculate_portfolio_variance(
    weights: np.ndarray,
    cov_matrix: np.ndarray
) -> float:
    """
    Calculate portfolio variance
    
    Args:
        weights: Array of portfolio weights
        cov_matrix: Covariance matrix
    
    Returns:
        Portfolio variance
    """
    # Portfolio variance = w^T * Σ * w
    variance = weights.T @ cov_matrix @ weights
    
    return float(variance)


def calculate_portfolio_volatility(
    weights: np.ndarray,
    cov_matrix: np.ndarray
) -> float:
    """
    Calculate portfolio volatility (standard deviation)
    
    Args:
        weights: Array of portfolio weights
        cov_matrix: Covariance matrix
    
    Returns:
        Portfolio volatility (annualized)
    """
    variance = calculate_portfolio_variance(weights, cov_matrix)
    volatility = np.sqrt(variance)
    
    return float(volatility)


def calculate_diversification_ratio(
    weights: np.ndarray,
    cov_matrix: np.ndarray
) -> float:
    """
    Calculate diversification ratio
    
    Args:
        weights: Array of portfolio weights
        cov_matrix: Covariance matrix
    
    Returns:
        Diversification ratio (weighted avg volatility / portfolio volatility)
    """
    # Individual volatilities
    individual_vols = np.sqrt(np.diag(cov_matrix))
    
    # Weighted average volatility
    weighted_avg_vol = weights @ individual_vols
    
    # Portfolio volatility
    portfolio_vol = calculate_portfolio_volatility(weights, cov_matrix)
    
    # Diversification ratio
    if portfolio_vol > 0:
        div_ratio = weighted_avg_vol / portfolio_vol
    else:
        div_ratio = 1.0
    
    return float(div_ratio)
