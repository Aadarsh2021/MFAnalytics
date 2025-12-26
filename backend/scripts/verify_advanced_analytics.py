
import sys
import os
import pandas as pd
import numpy as np

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from services.optimizer import PortfolioOptimizer
from services.backtester import PortfolioBacktester

def test_monte_carlo():
    print("Testing Monte Carlo Simulation...")
    optimizer = PortfolioOptimizer()
    weights = {1: 0.5, 2: 0.5}
    expected_return = 0.15
    volatility = 0.20
    
    results = optimizer.simulate_projections(weights, expected_return, volatility, horizon_years=5)
    
    assert 'p50' in results
    assert len(results['p50']) == 61 # 5 years * 12 months + 1
    print("Monte Carlo Simulation: PASSED")

def test_backtester():
    print("\nTesting Backtester...")
    backtester = PortfolioBacktester()
    
    # Create mock returns data
    dates = pd.date_range(start='2020-01-01', periods=100, freq='D')
    returns_df = pd.DataFrame({
        1: np.random.normal(0.0005, 0.01, 100),
        2: np.random.normal(0.0006, 0.012, 100)
    }, index=dates)
    
    weights = {1: 0.6, 2: 0.4}
    
    # Mock benchmark data
    benchmark_df = pd.DataFrame({
        'Daily Return': np.random.normal(0.0004, 0.008, 100)
    }, index=dates)
    
    results = backtester.run_backtest(weights, returns_df, initial_value=100000, benchmark_df=benchmark_df)
    
    assert 'portfolio_values' in results
    assert 'equal_weighted_values' in results
    assert 'metrics' in results
    print("Backtester: PASSED")

if __name__ == "__main__":
    try:
        test_monte_carlo()
        test_backtester()
        print("\nAll Advanced Analytics Verifications PASSED!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
