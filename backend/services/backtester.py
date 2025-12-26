import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple

class PortfolioBacktester:
    """
    Service for backtesting portfolio strategies against benchmarks
    """
    
    def __init__(self, trading_days: int = 252):
        self.trading_days = trading_days

    def run_backtest(
        self,
        weights: np.ndarray,
        returns_df: pd.DataFrame,
        initial_value: float = 100000,
        benchmark_returns: Optional[pd.Series] = None
    ) -> Dict:
        """
        Run a historical backtest for a set of weights
        
        Args:
            weights: Portfolio weights
            returns_df: DataFrame of daily historical returns
            initial_value: Starting capital
            benchmark_returns: Optional benchmark return series
            
        Returns:
            Dict containing daily values and summary metrics
        """
        # 1. Calculate Portfolio Daily Returns
        # Portfolio returns = sum(w_i * r_i)
        daily_portfolio_returns = returns_df.values @ weights
        
        # 2. Equal Weighted Portfolio (Baseline)
        n_assets = len(weights)
        eq_weights = np.ones(n_assets) / n_assets
        daily_eq_returns = returns_df.values @ eq_weights
        
        # 3. Calculate Cumulative Values
        # Value_t = Value_0 * prod(1 + r_i)
        # Note: We use (1 + returns) for linear returns or exp(cumsum(log_returns))
        # This codebase seems to use log returns in compute_returns
        portfolio_values = initial_value * np.exp(np.cumsum(daily_portfolio_returns))
        eq_values = initial_value * np.exp(np.cumsum(daily_eq_returns))
        
        # Prepend initial value
        dates = returns_df.index.strftime('%Y-%m-%d').tolist()
        
        results = {
            'dates': dates,
            'portfolio_values': portfolio_values.tolist(),
            'equal_weighted_values': eq_values.tolist(),
            'metrics': {
                'portfolio': self._calculate_metrics(daily_portfolio_returns),
                'equal_weighted': self._calculate_metrics(daily_eq_returns)
            }
        }
        
        # 4. Handle Benchmark
        if benchmark_returns is not None:
            # Align dates
            common_dates = returns_df.index.intersection(benchmark_returns.index)
            if not common_dates.empty:
                bench_aligned = benchmark_returns.loc[common_dates]
                bench_values = initial_value * np.exp(np.cumsum(bench_aligned.values))
                results['benchmark_values'] = bench_values.tolist()
                results['metrics']['benchmark'] = self._calculate_metrics(bench_aligned.values)
                # Map to dates if subset
                if len(common_dates) < len(dates):
                     results['benchmark_dates'] = common_dates.strftime('%Y-%m-%d').tolist()

        return results

    def _calculate_metrics(self, daily_returns: np.ndarray) -> Dict:
        """
        Calculate key performance indicators from return series
        """
        if len(daily_returns) == 0:
            return {}
            
        # Annualized Return (Compound)
        total_return = np.exp(np.sum(daily_returns)) - 1
        years = len(daily_returns) / self.trading_days
        ann_return = (1 + total_return)**(1/years) - 1 if years > 0 else 0
        
        # Annualized Volatility
        ann_vol = np.std(daily_returns) * np.sqrt(self.trading_days)
        
        # Max Drawdown
        cum_returns = np.exp(np.cumsum(daily_returns))
        running_max = np.maximum.accumulate(cum_returns)
        drawdowns = (cum_returns - running_max) / running_max
        max_dd = np.min(drawdowns) if len(drawdowns) > 0 else 0
        
        # Sharpe Ratio (Assume 0 risk-free for backtest baseline comparison)
        sharpe = ann_return / ann_vol if ann_vol > 0 else 0
        
        return {
            'total_return': float(total_return),
            'annualized_return': float(ann_return),
            'annualized_volatility': float(ann_vol),
            'max_drawdown': float(max_dd),
            'sharpe_ratio': float(sharpe)
        }
