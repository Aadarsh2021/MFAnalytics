import numpy as np
import pandas as pd
from services.optimizer import PortfolioOptimizer

def test_allocation():
    print("--- Reproduction Test: 5 Funds, 2 Superior ---")
    
    # Setup 5 funds: 2 good, 3 bad
    # Good: High return (12%, 10%), Low Vol (10%, 12%)
    # Bad: Low return (6%, 5%, 4%), High Vol (15%, 18%, 20%)
    
    expected_returns = np.array([0.12, 0.10, 0.06, 0.05, 0.04])
    # Covariance: diagonal for simplicity (uncorrelated)
    vols = np.array([0.10, 0.12, 0.15, 0.18, 0.20])
    cov_matrix = np.diag(vols ** 2)
    
    optimizer = PortfolioOptimizer()
    
    # Case 1: No constraints (min=0, max=100)
    print("\nCase 1: No Min Weight (0%)")
    weights, ret, vol, sharpe = optimizer.optimize_max_sharpe(expected_returns, cov_matrix, constraints={})
    print("Weights:", np.round(weights, 4))
    print(f"Funds with > 0.1%: {(weights > 0.001).sum()}")
    
    # Case 2: Min Weight 5%
    print("\nCase 2: Min Weight 5% (Constraint)")
    constraints = {'fund_bounds': (0.05, 1.0)}
    weights2, ret2, vol2, sharpe2 = optimizer.optimize_max_sharpe(expected_returns, cov_matrix, constraints=constraints)
    print("Weights:", np.round(weights2, 4))
    print(f"Funds with > 0.1%: {(weights2 > 0.001).sum()}")

if __name__ == "__main__":
    test_allocation()
