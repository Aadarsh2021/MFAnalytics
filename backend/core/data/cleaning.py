"""
Data cleaning module - MODULE 3
Handles NAV data cleaning and validation
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from datetime import timedelta


def clean_nav_data(nav_df: pd.DataFrame, max_gap_days: int = 2) -> Tuple[pd.DataFrame, List[str]]:
    """
    Clean NAV time series data
    
    Args:
        nav_df: DataFrame with columns ['date', 'nav', 'fund_id']
        max_gap_days: Maximum allowed gap in days (default: 2)
    
    Returns:
        Tuple of (cleaned_df, warnings)
    """
    warnings = []
    
    # Ensure date column is datetime
    nav_df['date'] = pd.to_datetime(nav_df['date'])
    
    # Sort by date
    nav_df = nav_df.sort_values('date')
    
    # Remove duplicates
    duplicates = nav_df.duplicated(subset=['date', 'fund_id'], keep='first').sum()
    if duplicates > 0:
        warnings.append(f"Removed {duplicates} duplicate NAV entries")
        nav_df = nav_df.drop_duplicates(subset=['date', 'fund_id'], keep='first')
    
    # Check for missing values
    missing_navs = nav_df['nav'].isna().sum()
    if missing_navs > 0:
        warnings.append(f"Found {missing_navs} missing NAV values")
        nav_df = nav_df.dropna(subset=['nav'])
    
    # Forward fill gaps <= max_gap_days
    nav_df = nav_df.set_index('date')
    
    # Identify gaps
    date_diff = nav_df.index.to_series().diff()
    large_gaps = date_diff > timedelta(days=max_gap_days)
    
    if large_gaps.sum() > 0:
        warnings.append(f"Found {large_gaps.sum()} gaps larger than {max_gap_days} days")
    
    # Forward fill small gaps
    nav_df = nav_df.asfreq('D', method='ffill', limit=max_gap_days)
    
    # Reset index
    nav_df = nav_df.reset_index()
    
    return nav_df, warnings


def detect_outliers(returns: pd.Series, threshold: float = 3.0) -> Tuple[pd.Series, List[int]]:
    """
    Detect outliers in returns using z-score method
    
    Args:
        returns: Series of returns
        threshold: Z-score threshold (default: 3.0)
    
    Returns:
        Tuple of (cleaned_returns, outlier_indices)
    """
    # Calculate z-scores
    mean = returns.mean()
    std = returns.std()
    
    if std == 0:
        return returns, []
    
    z_scores = np.abs((returns - mean) / std)
    
    # Identify outliers
    outlier_mask = z_scores > threshold
    outlier_indices = returns[outlier_mask].index.tolist()
    
    # Winsorize outliers (cap at threshold)
    cleaned_returns = returns.copy()
    upper_bound = mean + threshold * std
    lower_bound = mean - threshold * std
    
    cleaned_returns = cleaned_returns.clip(lower=lower_bound, upper=upper_bound)
    
    return cleaned_returns, outlier_indices


def align_time_series(fund_data_dict: Dict[int, pd.DataFrame]) -> Dict[int, pd.DataFrame]:
    """
    Align NAV time series across all funds to common dates
    
    Args:
        fund_data_dict: Dictionary mapping fund_id to DataFrame with 'date' and 'nav'
    
    Returns:
        Dictionary with aligned DataFrames
    """
    if not fund_data_dict:
        return {}
    
    # Find common date range
    all_dates = []
    for df in fund_data_dict.values():
        all_dates.extend(df['date'].tolist())
    
    # Get date range that all funds cover
    min_date = max(df['date'].min() for df in fund_data_dict.values())
    max_date = min(df['date'].max() for df in fund_data_dict.values())
    
    # Create common date index
    common_dates = pd.date_range(start=min_date, end=max_date, freq='D')
    
    # Align each fund to common dates
    aligned_data = {}
    for fund_id, df in fund_data_dict.items():
        df = df.set_index('date')
        df = df.reindex(common_dates, method='ffill')
        df = df.reset_index()
        df.columns = ['date', 'nav']
        aligned_data[fund_id] = df
    
    return aligned_data


def validate_fund_data(nav_df: pd.DataFrame, min_data_points: int = 252) -> Tuple[bool, List[str]]:
    """
    Validate fund NAV data quality
    
    Args:
        nav_df: DataFrame with NAV data
        min_data_points: Minimum required data points (default: 252 = 1 year)
    
    Returns:
        Tuple of (is_valid, warnings)
    """
    warnings = []
    is_valid = True
    
    # Check minimum data points
    if len(nav_df) < min_data_points:
        warnings.append(f"Insufficient data: {len(nav_df)} points (minimum: {min_data_points})")
        is_valid = False
    
    # Check for negative NAVs
    negative_navs = (nav_df['nav'] <= 0).sum()
    if negative_navs > 0:
        warnings.append(f"Found {negative_navs} negative or zero NAV values")
        is_valid = False
    
    # Check data freshness (last NAV should be recent)
    if 'date' in nav_df.columns:
        last_date = pd.to_datetime(nav_df['date']).max()
        days_old = (pd.Timestamp.now() - last_date).days
        
        if days_old > 7:
            warnings.append(f"Data is {days_old} days old")
            if days_old > 30:
                is_valid = False
    
    return is_valid, warnings
