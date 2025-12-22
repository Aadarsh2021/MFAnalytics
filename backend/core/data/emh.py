"""
EMH expected returns module - MODULE 3
Calculate CAPM-based expected returns
"""
import pandas as pd
import numpy as np
from typing import Tuple
from sklearn.linear_model import LinearRegression


def calculate_capm_beta(
    fund_returns: pd.Series,
    benchmark_returns: pd.Series,
    risk_free_rate: float = 0.065
) -> Tuple[float, float, float]:
    """
    Calculate CAPM beta for a fund
    
    Regression: R_fund - R_f = α + β(R_benchmark - R_f)
    
    Args:
        fund_returns: Series of fund returns
        benchmark_returns: Series of benchmark returns
        risk_free_rate: Annual risk-free rate (default: 6.5% for India)
    
    Returns:
        Tuple of (beta, alpha, r_squared)
    """
    # Convert annual risk-free rate to daily
    daily_rf = risk_free_rate / 252
    
    # Calculate excess returns
    fund_excess = fund_returns - daily_rf
    benchmark_excess = benchmark_returns - daily_rf
    
    # Align series
    aligned_data = pd.DataFrame({
        'fund': fund_excess,
        'benchmark': benchmark_excess
    }).dropna()
    
    if len(aligned_data) < 30:  # Minimum data points
        return 1.0, 0.0, 0.0
    
    # Regression
    X = aligned_data['benchmark'].values.reshape(-1, 1)
    y = aligned_data['fund'].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    beta = float(model.coef_[0])
    alpha = float(model.intercept_)
    r_squared = float(model.score(X, y))
    
    return beta, alpha, r_squared


def calculate_expected_returns(
    returns: pd.DataFrame,
    benchmark_returns: pd.Series,
    risk_free_rate: float = 0.065,
    mode: str = 'capm'
) -> np.ndarray:
    """
    Calculate expected returns for funds
    
    Args:
        returns: DataFrame with fund returns (funds as columns)
        benchmark_returns: Series of benchmark returns
        risk_free_rate: Annual risk-free rate (default: 6.5%)
        mode: 'capm' for CAPM, 'historical' for historical mean
    
    Returns:
        Array of annualized expected returns
    """
    n_funds = returns.shape[1]
    expected_returns = np.zeros(n_funds)
    
    if mode == 'capm':
        # Calculate benchmark excess return
        benchmark_mean = benchmark_returns.mean() * 252  # Annualized
        market_premium = benchmark_mean - risk_free_rate
        
        # Calculate expected return for each fund using CAPM
        for i, fund_id in enumerate(returns.columns):
            beta, _, _ = calculate_capm_beta(
                returns[fund_id],
                benchmark_returns,
                risk_free_rate
            )
            
            # E[R_i] = R_f + β_i * (E[R_m] - R_f)
            expected_returns[i] = risk_free_rate + beta * market_premium
    
    else:  # historical
        # Use historical mean returns
        expected_returns = returns.mean().values * 252  # Annualized
    
    return expected_returns


def adjust_expected_returns(
    expected_returns: np.ndarray,
    return_adjustment: float = 0.0
) -> np.ndarray:
    """
    Adjust expected returns based on user input
    
    Args:
        expected_returns: Array of expected returns
        return_adjustment: Percentage adjustment (e.g., 0.02 for +2%)
    
    Returns:
        Adjusted expected returns
    """
    # Apply proportional adjustment
    adjusted = expected_returns * (1 + return_adjustment)
    
    return adjusted


def calculate_sharpe_ratio(
    expected_return: float,
    volatility: float,
    risk_free_rate: float = 0.065
) -> float:
    """
    Calculate Sharpe ratio
    
    Args:
        expected_return: Annualized expected return
        volatility: Annualized volatility
        risk_free_rate: Annual risk-free rate
    
    Returns:
        Sharpe ratio
    """
    if volatility == 0:
        return 0.0
    
    sharpe = (expected_return - risk_free_rate) / volatility
    
    return float(sharpe)


def calculate_sortino_ratio(
    returns: pd.Series,
    target_return: float = 0.0,
    risk_free_rate: float = 0.065
) -> float:
    """
    Calculate Sortino ratio (uses downside deviation)
    
    Args:
        returns: Series of returns
        target_return: Target return (default: 0)
        risk_free_rate: Annual risk-free rate
    
    Returns:
        Sortino ratio
    """
    # Annualized mean return
    mean_return = returns.mean() * 252
    
    # Downside deviation (only negative returns)
    downside_returns = returns[returns < target_return]
    
    if len(downside_returns) == 0:
        return float('inf')
    
    downside_std = downside_returns.std() * np.sqrt(252)
    
    if downside_std == 0:
        return 0.0
    
    sortino = (mean_return - risk_free_rate) / downside_std
    
    return float(sortino)


def calculate_information_ratio(
    fund_returns: pd.Series,
    benchmark_returns: pd.Series
) -> float:
    """
    Calculate information ratio (excess return / tracking error)
    
    Args:
        fund_returns: Series of fund returns
        benchmark_returns: Series of benchmark returns
    
    Returns:
        Information ratio
    """
    # Align series
    aligned_data = pd.DataFrame({
        'fund': fund_returns,
        'benchmark': benchmark_returns
    }).dropna()
    
    # Excess returns
    excess_returns = aligned_data['fund'] - aligned_data['benchmark']
    
    # Annualized excess return
    mean_excess = excess_returns.mean() * 252
    
    # Tracking error (annualized)
    tracking_error = excess_returns.std() * np.sqrt(252)
    
    if tracking_error == 0:
        return 0.0
    
    info_ratio = mean_excess / tracking_error
    
    return float(info_ratio)
