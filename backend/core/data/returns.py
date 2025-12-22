"""
Returns calculation module - MODULE 3
Compute log returns from NAV data
"""
import pandas as pd
import numpy as np
from typing import Dict


def calculate_log_returns(nav_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate log returns from NAV time series
    
    Args:
        nav_df: DataFrame with columns ['date', 'nav']
    
    Returns:
        DataFrame with columns ['date', 'return']
    """
    # Ensure sorted by date
    nav_df = nav_df.sort_values('date')
    
    # Calculate log returns: ln(NAV_t / NAV_{t-1})
    nav_df['return'] = np.log(nav_df['nav'] / nav_df['nav'].shift(1))
    
    # Drop first row (NaN)
    nav_df = nav_df.dropna(subset=['return'])
    
    return nav_df[['date', 'return']]


def annualize_returns(returns: pd.Series, trading_days: int = 252) -> float:
    """
    Annualize returns
    
    Args:
        returns: Series of daily returns
        trading_days: Number of trading days per year (default: 252)
    
    Returns:
        Annualized return
    """
    # Geometric mean of daily returns
    mean_daily_return = returns.mean()
    annualized = mean_daily_return * trading_days
    
    return annualized


def calculate_returns_matrix(fund_data_dict: Dict[int, pd.DataFrame]) -> pd.DataFrame:
    """
    Calculate returns matrix for multiple funds
    
    Args:
        fund_data_dict: Dictionary mapping fund_id to DataFrame with 'date' and 'nav'
    
    Returns:
        DataFrame with dates as index and fund_ids as columns containing returns
    """
    returns_dict = {}
    
    for fund_id, nav_df in fund_data_dict.items():
        returns_df = calculate_log_returns(nav_df)
        returns_dict[fund_id] = returns_df.set_index('date')['return']
    
    # Combine into single DataFrame
    returns_matrix = pd.DataFrame(returns_dict)
    
    # Drop rows with any NaN values
    returns_matrix = returns_matrix.dropna()
    
    return returns_matrix


def calculate_cumulative_returns(returns: pd.Series) -> pd.Series:
    """
    Calculate cumulative returns from daily returns
    
    Args:
        returns: Series of daily log returns
    
    Returns:
        Series of cumulative returns
    """
    # Cumulative return = exp(sum of log returns) - 1
    cumulative = np.exp(returns.cumsum()) - 1
    
    return cumulative


def calculate_rolling_returns(returns: pd.Series, window: int = 252) -> pd.Series:
    """
    Calculate rolling annualized returns
    
    Args:
        returns: Series of daily returns
        window: Rolling window size in days (default: 252 = 1 year)
    
    Returns:
        Series of rolling annualized returns
    """
    rolling_mean = returns.rolling(window=window).mean()
    rolling_annualized = rolling_mean * 252
    
    return rolling_annualized
