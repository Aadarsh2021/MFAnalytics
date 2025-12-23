"""
Portfolio Optimization Service
Implements EMH-based portfolio optimization using Modern Portfolio Theory
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
import cvxpy as cp
from sklearn.covariance import ledoit_wolf
from scipy import stats


class PortfolioOptimizer:
    """
    Core portfolio optimization engine using CVXPY
    """
    
    def __init__(self, risk_free_rate: float = 0.065, trading_days: int = 252):
        """
        Initialize optimizer with market parameters
        
        Args:
            risk_free_rate: Annual risk-free rate (default 6.5% for India)
            trading_days: Trading days per year (default 252)
        """
        self.risk_free_rate = risk_free_rate
        self.trading_days = trading_days
    
    def compute_portfolio_performance(self, weights: np.ndarray, expected_returns: np.ndarray, cov_matrix: np.ndarray) -> Tuple[float, float]:
        """
        Compute portfolio expected return and volatility
        """
        ret = float(np.dot(weights, expected_returns))
        vol = float(np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))))
        return ret, vol

    def compute_returns(self, nav_data: Dict[int, List[Tuple[str, float]]]) -> pd.DataFrame:
        """
        Compute daily log returns from NAV data
        
        Args:
            nav_data: Dictionary mapping fund_id to list of (date, nav) tuples
            
        Returns:
            DataFrame with daily returns, funds as columns, dates as index
        """
        # Convert to DataFrame
        dfs = []
        for fund_id, navs in nav_data.items():
            df = pd.DataFrame(navs, columns=['date', f'fund_{fund_id}'])
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')
            df = df.sort_index()  # Ensure sorted by date
            dfs.append(df)
        
        # Merge all funds using outer join to keep all dates
        # Merge all funds using outer join to keep all dates
        nav_df = pd.concat(dfs, axis=1, join='outer')
        
        # Forward fill missing values (up to 7 days to cover long weekends/holidays)
        nav_df = nav_df.ffill(limit=7)
        
        # Drop rows that still have NaNs (where funds don't overlap)
        nav_df = nav_df.dropna()
        
        if len(nav_df) < 10:
            # Attempt to rescue: Only keep funds that have at least 50% data overlap with the "best" fund
            # This is complex, for now, just informative error
            min_date = nav_df.index.min()
            max_date = nav_df.index.max()
            raise ValueError(f"Insufficient overlapping history for selected funds. Common period: {min_date} to {max_date} ({len(nav_df)} days). Please deselect funds with very short or mismatched histories.")
        
        # Compute log returns
        log_returns = np.log(nav_df / nav_df.shift(1))
        log_returns = log_returns.fillna(0.0) # Fill NaNs with 0 instead of dropping to preserve length if possible
        log_returns = log_returns.replace([np.inf, -np.inf], 0.0)
        
        return log_returns
    
    def compute_covariance(self, returns: pd.DataFrame) -> np.ndarray:
        """
        Compute covariance matrix using Ledoit-Wolf shrinkage
        
        Args:
            returns: DataFrame of daily returns
            
        Returns:
            Annualized covariance matrix
        """
        # Use Ledoit-Wolf shrinkage estimator for better stability
        cov_matrix, _ = ledoit_wolf(returns.values)
        
        # Annualize covariance
        annual_cov = cov_matrix * self.trading_days
        
        return annual_cov
    
    def compute_expected_returns(
        self, 
        returns: pd.DataFrame, 
        mode: str = 'emh',
        custom_returns: Optional[Dict[str, float]] = None
    ) -> np.ndarray:
        """
        Compute expected returns vector using proper financial methodology
        
        Args:
            returns: DataFrame of daily returns
            mode: 'emh' for historical mean, 'custom' for user-defined
            custom_returns: Optional dict mapping fund names to expected returns
            
        Returns:
            Array of annualized expected returns
        """
        if mode == 'custom' and custom_returns:
            # Use custom returns
            expected = np.array([custom_returns.get(col, 0) for col in returns.columns])
        else:
            # EMH mode: use geometric mean (CAGR) for proper compounding
            # Geometric mean = (1 + r1) * (1 + r2) * ... * (1 + rn) ^ (1/n) - 1
            # For log returns: geometric mean ≈ exp(mean(log_returns)) - 1
            
            expected_returns = []
            for col in returns.columns:
                # Calculate CAGR using geometric mean
                # Since we have log returns, we can use: exp(mean) - 1
                mean_log_return = np.nan_to_num(returns[col].mean(), nan=0.0, posinf=0.0, neginf=0.0)
                # Annualize: (1 + daily_return)^252 - 1
                # For log returns: exp(mean * 252) - 1
                annual_return = np.exp(mean_log_return * self.trading_days) - 1
                
                # Professional adjustment: Add forward-looking premium
                # Historical returns may be depressed; add equity risk premium
                # Typical equity risk premium over risk-free rate: 4-6%
                equity_risk_premium = 0.04  # 4% premium over risk-free rate
                
                # Ensure minimum expected return is risk-free rate + premium
                min_expected_return = self.risk_free_rate + equity_risk_premium
                
                # Use the higher of historical CAGR or minimum expected return
                # This reflects forward-looking expectations like professional planners use
                adjusted_return = max(annual_return, min_expected_return)
                
                expected_returns.append(adjusted_return)
            
            expected = np.array(expected_returns)
        
        return expected
    
    def optimize_mvp(
        self, 
        cov_matrix: np.ndarray, 
        constraints: Optional[Dict] = None
    ) -> Tuple[np.ndarray, float, float]:
        """
        Optimize for Minimum Variance Portfolio
        
        Args:
            cov_matrix: Covariance matrix
            constraints: Optional constraints dict with:
                - asset_class_bounds: Dict[str, Tuple[float, float]]
                - fund_bounds: Tuple[float, float]
                - fund_indices: Dict mapping asset classes to fund indices
                
        Returns:
            Tuple of (weights, expected_return, volatility)
        """
        n_assets = cov_matrix.shape[0]
        
        # Decision variable: portfolio weights
        weights = cp.Variable(n_assets)
        
        # Objective: minimize variance
        portfolio_variance = cp.quad_form(weights, cov_matrix)
        objective = cp.Minimize(portfolio_variance)
        
        # Constraints
        constraints_list = [
            cp.sum(weights) == 1,  # Fully invested
            weights >= 0,  # No shorting
        ]
        
        # Add custom constraints if provided
        if constraints:
            # Fund weight bounds
            if 'fund_bounds' in constraints:
                min_weight, max_weight = constraints['fund_bounds']
                constraints_list.append(weights >= min_weight)
                constraints_list.append(weights <= max_weight)
            
            # Asset class bounds (bounds are already in decimal form 0-1)
            if 'asset_class_bounds' in constraints and 'fund_indices' in constraints:
                for asset_class, (min_pct, max_pct) in constraints['asset_class_bounds'].items():
                    if asset_class in constraints['fund_indices']:
                        indices = constraints['fund_indices'][asset_class]
                        asset_weight = cp.sum(weights[indices])
                        # Bounds come as percentages (0-100), convert to decimal
                        constraints_list.append(asset_weight >= min_pct / 100)
                        constraints_list.append(asset_weight <= max_pct / 100)
        
        # Solve optimization problem
        problem = cp.Problem(objective, constraints_list)
        problem.solve(solver=cp.ECOS)
        
        if problem.status != 'optimal':
            raise ValueError(f"Optimization failed: {problem.status}")
        
        optimal_weights = weights.value
        volatility = np.sqrt(portfolio_variance.value)
        
        return optimal_weights, 0.0, volatility  # Return is 0 for MVP (we don't use expected returns)
    
    def optimize_max_sharpe(
        self, 
        expected_returns: np.ndarray, 
        cov_matrix: np.ndarray,
        constraints: Optional[Dict] = None
    ) -> Tuple[np.ndarray, float, float, float]:
        """
        Optimize for Maximum Sharpe Ratio Portfolio
        
        Args:
            expected_returns: Array of expected returns
            cov_matrix: Covariance matrix
            constraints: Optional constraints dict
            
        Returns:
            Tuple of (weights, expected_return, volatility, sharpe_ratio)
        """
        n_assets = len(expected_returns)
        
        # Decision variable
        weights = cp.Variable(n_assets)
        
        # Portfolio return and risk
        portfolio_return = expected_returns @ weights
        portfolio_variance = cp.quad_form(weights, cov_matrix)
        
        # Maximize Sharpe ratio using DCP-compliant formulation
        # Instead of max (return - rf) / sqrt(variance), we minimize variance for target return
        # This is equivalent but DCP-compliant
        excess_return = portfolio_return - self.risk_free_rate
        
        # Use quadratic objective: minimize variance / (excess_return)^2
        # Equivalent to maximizing sharpe ratio
        objective = cp.Minimize(portfolio_variance)
        
        # Constraints
        constraints_list = [
            cp.sum(weights) == 1,
            weights >= 0,
            excess_return >= 0.01,  # Ensure positive excess return
        ]
        
        # Add custom constraints
        if constraints:
            if 'fund_bounds' in constraints:
                min_weight, max_weight = constraints['fund_bounds']
                constraints_list.append(weights >= min_weight)
                constraints_list.append(weights <= max_weight)
            
            # Asset class bounds (bounds are already in decimal form 0-1)
            if 'asset_class_bounds' in constraints and 'fund_indices' in constraints:
                for asset_class, (min_pct, max_pct) in constraints['asset_class_bounds'].items():
                    if asset_class in constraints['fund_indices']:
                        indices = constraints['fund_indices'][asset_class]
                        asset_weight = cp.sum(weights[indices])
                        # Bounds come as percentages (0-100), convert to decimal
                        constraints_list.append(asset_weight >= min_pct / 100)
                        constraints_list.append(asset_weight <= max_pct / 100)
        
        # Solve - use two-step approach for max sharpe
        # Step 1: Find maximum return portfolio
        problem_max_return = cp.Problem(cp.Maximize(portfolio_return), constraints_list[:-1] if len(constraints_list) > 3 else constraints_list[:2])
        problem_max_return.solve(solver=cp.ECOS)
        max_possible_return = portfolio_return.value if problem_max_return.status == 'optimal' else 0.2
        
        # Step 2: Optimize for best sharpe by trying different return targets
        best_sharpe = -np.inf
        best_weights = None
        best_return = 0
        best_vol = 0
        
        # Try different return targets
        for target_ret in np.linspace(0.05, max_possible_return, 20):
            temp_constraints = constraints_list.copy()
            temp_constraints.append(portfolio_return >= target_ret)
            
            problem = cp.Problem(objective, temp_constraints)
            try:
                problem.solve(solver=cp.ECOS)
                
                if problem.status == 'optimal':
                    temp_weights = weights.value
                    temp_return = float(portfolio_return.value)
                    temp_vol = float(np.sqrt(portfolio_variance.value))
                    temp_sharpe = (temp_return - self.risk_free_rate) / temp_vol if temp_vol > 0 else 0
                    
                    if temp_sharpe > best_sharpe:
                        best_sharpe = temp_sharpe
                        best_weights = temp_weights
                        best_return = temp_return
                        best_vol = temp_vol
            except:
                continue
        
        if best_weights is None:
            raise ValueError(f"Optimization failed: could not find optimal sharpe portfolio")
        
        return best_weights, best_return, best_vol, best_sharpe
    
    def generate_monte_carlo_portfolios(
        self,
        expected_returns: np.ndarray,
        cov_matrix: np.ndarray,
        n_simulations: int = 10000,
        constraints: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Generate random portfolios using Monte Carlo simulation
        
        Args:
            expected_returns: Expected returns for each asset
            cov_matrix: Covariance matrix
            n_simulations: Number of random portfolios to generate
            constraints: Optional constraints (asset class bounds, min/max weights)
        
        Returns:
            List of portfolio dicts with return, volatility, sharpe, weights
        """
        n_assets = len(expected_returns)
        portfolios = []
        
        # Extract constraints
        min_weight = 0.0
        max_weight = 1.0
        if constraints and 'fund_bounds' in constraints:
            min_weight, max_weight = constraints['fund_bounds']
        
        asset_class_bounds = {}
        fund_indices = {}
        if constraints:
            if 'asset_class_bounds' in constraints:
                asset_class_bounds = constraints['asset_class_bounds']
            if 'fund_indices' in constraints:
                fund_indices = constraints['fund_indices']
        
        successful_simulations = 0
        max_attempts = n_simulations * 10  # Allow more attempts to get valid portfolios
        attempts = 0
        
        while successful_simulations < n_simulations and attempts < max_attempts:
            attempts += 1
            
            # Generate random weights using Dirichlet distribution (ensures sum to 1)
            weights = np.random.dirichlet(np.ones(n_assets))
            
            # Apply individual fund weight constraints
            if np.any(weights < min_weight) or np.any(weights > max_weight):
                continue
            
            # Check asset class constraints
            valid = True
            if asset_class_bounds and fund_indices:
                for asset_class, (min_pct, max_pct) in asset_class_bounds.items():
                    if asset_class in fund_indices:
                        indices = fund_indices[asset_class]
                        asset_weight = np.sum(weights[indices])
                        # Bounds come as percentages (0-100), convert to decimal
                        if asset_weight < min_pct / 100 or asset_weight > max_pct / 100:
                            valid = False
                            break
            
            if not valid:
                continue
            
            # Calculate portfolio metrics
            portfolio_return = float(np.dot(weights, expected_returns))
            portfolio_variance = float(np.dot(weights.T, np.dot(cov_matrix, weights)))
            portfolio_volatility = float(np.sqrt(portfolio_variance))
            
            if portfolio_volatility > 0:
                sharpe = (portfolio_return - self.risk_free_rate) / portfolio_volatility
            else:
                sharpe = 0
            
            portfolios.append({
                'return': portfolio_return,
                'volatility': portfolio_volatility,
                'sharpe': sharpe,
                'weights': weights.tolist()
            })
            
            successful_simulations += 1
        
        return portfolios
    
    def generate_efficient_frontier(
        self, 
        expected_returns: np.ndarray, 
        cov_matrix: np.ndarray,
        n_points: int = 100,
        constraints: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Generate efficient frontier by varying target returns
        
        Args:
            expected_returns: Array of expected returns
            cov_matrix: Covariance matrix
            n_points: Number of points on frontier
            constraints: Optional constraints dict
            
        Returns:
            List of dicts with 'return', 'volatility', 'sharpe', 'weights'
        """
        n_assets = len(expected_returns)
        
        # Get min and max possible returns
        min_return = np.min(expected_returns)
        max_return = np.max(expected_returns)
        
        # Generate target returns
        target_returns = np.linspace(min_return, max_return, n_points)
        
        frontier = []
        
        for target_ret in target_returns:
            weights = cp.Variable(n_assets)
            portfolio_return = expected_returns @ weights
            portfolio_variance = cp.quad_form(weights, cov_matrix)
            
            objective = cp.Minimize(portfolio_variance)
            
            constraints_list = [
                cp.sum(weights) == 1,
                weights >= 0,
                portfolio_return >= target_ret,
            ]
            
            # Add custom constraints
            if constraints:
                if 'fund_bounds' in constraints:
                    min_weight, max_weight = constraints['fund_bounds']
                    constraints_list.append(weights >= min_weight)
                    constraints_list.append(weights <= max_weight)
                
                # Asset class bounds (bounds are already in decimal form 0-1)
                if 'asset_class_bounds' in constraints and 'fund_indices' in constraints:
                    for asset_class, (min_pct, max_pct) in constraints['asset_class_bounds'].items():
                        if asset_class in constraints['fund_indices']:
                            indices = constraints['fund_indices'][asset_class]
                            asset_weight = cp.sum(weights[indices])
                            # Bounds come as percentages (0-100), convert to decimal
                            constraints_list.append(asset_weight >= min_pct / 100)
                            constraints_list.append(asset_weight <= max_pct / 100)
            
            problem = cp.Problem(objective, constraints_list)
            
            try:
                problem.solve(solver=cp.ECOS)
                
                if problem.status == 'optimal':
                    opt_weights = weights.value
                    opt_return = float(portfolio_return.value)
                    opt_volatility = float(np.sqrt(portfolio_variance.value))
                    sharpe = (opt_return - self.risk_free_rate) / opt_volatility if opt_volatility > 0 else 0
                    
                    frontier.append({
                        'return': opt_return,
                        'volatility': opt_volatility,
                        'sharpe': sharpe,
                        'weights': opt_weights.tolist()
                    })
            except:
                continue
        
        return frontier
    
    def compute_portfolio_metrics(
        self, 
        weights: np.ndarray, 
        returns: pd.DataFrame,
        expected_returns: np.ndarray,
        cov_matrix: np.ndarray,
        benchmark_returns: Optional[pd.Series] = None
    ) -> Dict:
        """
        Compute comprehensive portfolio metrics
        
        Args:
            weights: Portfolio weights
            returns: Historical returns DataFrame
            expected_returns: Expected returns array
            cov_matrix: Covariance matrix
            benchmark_returns: Optional benchmark returns series
            
        Returns:
            Dict with all portfolio metrics
        """
        # Portfolio returns time series
        portfolio_returns = (returns.values @ weights)
        
        # Expected return and volatility
        exp_return = float(expected_returns @ weights)
        volatility = float(np.sqrt(weights @ cov_matrix @ weights))
        
        # Sharpe ratio
        sharpe = (exp_return - self.risk_free_rate) / volatility if volatility > 0 else 0
    
        # Sortino ratio (downside deviation below risk-free rate)
        # Professional methodology: sqrt( sum(min(0, R_i - Target)^2) / N )
        daily_rf = self.risk_free_rate / self.trading_days
        downside_diffs = np.minimum(0, portfolio_returns - daily_rf)
        downside_deviation = np.sqrt(np.mean(downside_diffs**2) * self.trading_days)
        
        sortino = (exp_return - self.risk_free_rate) / downside_deviation if downside_deviation > 0 else 0
        
        # Maximum drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(np.min(drawdown))
        
        # Calmar ratio
        calmar = exp_return / abs(max_drawdown) if max_drawdown < 0 else 0
        
        # Skewness and Kurtosis
        skewness = float(stats.skew(portfolio_returns))
        kurtosis = float(stats.kurtosis(portfolio_returns))
        
        # VaR and CVaR (95% confidence)
        # Professional methodology: Calculate on annualized returns
        # Percentiles don't follow square root of time rule!
        annual_portfolio_returns = portfolio_returns * self.trading_days
        var_95 = float(np.percentile(annual_portfolio_returns, 5))
        cvar_95 = float(np.mean(annual_portfolio_returns[annual_portfolio_returns <= var_95]))
        
        metrics = {
            'expected_return': exp_return,
            'volatility': volatility,
            'sharpe_ratio': sharpe,
            'sortino_ratio': sortino,
            'calmar_ratio': calmar,
            'max_drawdown': max_drawdown,
            'skewness': skewness,
            'kurtosis': kurtosis,
            'var_95': var_95,
            'cvar_95': cvar_95,
        }
        
        # Beta, Alpha, and Benchmark metrics
        if benchmark_returns is not None:
            # Align dates
            common_dates = returns.index.intersection(benchmark_returns.index)
            port_ret_aligned = (returns.loc[common_dates].values @ weights)
            bench_ret_aligned = benchmark_returns.loc[common_dates].values
            
            # Excess returns for professional Beta/Alpha calculation
            port_excess = port_ret_aligned - daily_rf
            bench_excess = bench_ret_aligned - daily_rf
            
            # 1. Beta (Sensitivity to market)
            covariance = np.cov(port_excess, bench_excess)[0, 1]
            benchmark_variance = np.var(bench_excess)
            beta = covariance / benchmark_variance if benchmark_variance > 0 else 1.0
            
            # 2. Alpha (Jensen's Alpha - Value added by manager)
            # Alpha = (Portfolio Return - Rf) - Beta * (Benchmark Return - Rf)
            bench_exp_return = float(np.exp(np.mean(bench_ret_aligned) * self.trading_days) - 1)
            alpha = (exp_return - self.risk_free_rate) - beta * (bench_exp_return - self.risk_free_rate)
            
            # 3. R-Squared (Correlation coefficient squared)
            correlation = np.corrcoef(port_ret_aligned, bench_ret_aligned)[0, 1]
            r_squared = correlation**2
            
            # 4. Information Ratio (Return per unit of tracking error)
            active_return = exp_return - bench_exp_return
            tracking_error = np.std(port_ret_aligned - bench_ret_aligned) * np.sqrt(self.trading_days)
            information_ratio = active_return / tracking_error if tracking_error > 0 else 0
            
            metrics.update({
                'beta': float(beta),
                'alpha': float(alpha),
                'r_squared': float(r_squared),
                'information_ratio': float(information_ratio),
                'tracking_error': float(tracking_error),
                'treynor_ratio': (exp_return - self.risk_free_rate) / beta if beta != 0 else 0
            })
        
        return metrics
