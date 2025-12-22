"""
Direct test of optimizer service
"""
from database import SessionLocal
from models.database import Fund, NAV
from services.optimizer import PortfolioOptimizer
from datetime import datetime, timedelta
import traceback

db = SessionLocal()

try:
    print("=" * 60)
    print("Testing Portfolio Optimizer")
    print("=" * 60)
    
    # Get 5 funds
    funds = db.query(Fund).limit(5).all()
    print(f"\n✅ Found {len(funds)} funds")
    
    for f in funds:
        nav_count = db.query(NAV).filter(NAV.fund_id == f.id).count()
        print(f"  {f.id}: {f.name[:40]}... ({nav_count} NAVs)")
    
    # Get NAV data
    print("\n📊 Fetching NAV data...")
    end_date = datetime.now()
    start_date = end_date - timedelta(days=3*365)
    
    nav_data = {}
    for fund in funds:
        navs = db.query(NAV).filter(
            NAV.fund_id == fund.id,
            NAV.date >= start_date,
            NAV.date <= end_date
        ).order_by(NAV.date).all()
        
        nav_data[fund.id] = [(nav.date.strftime('%Y-%m-%d'), float(nav.nav)) for nav in navs]
        print(f"  Fund {fund.id}: {len(navs)} NAVs")
    
    # Initialize optimizer
    print("\n⚡ Initializing optimizer...")
    optimizer = PortfolioOptimizer(risk_free_rate=0.065, trading_days=252)
    
    # Compute returns
    print("📈 Computing returns...")
    returns_df = optimizer.compute_returns(nav_data)
    print(f"  Returns shape: {returns_df.shape}")
    print(f"  Columns: {list(returns_df.columns)}")
    
    # Compute covariance
    print("📊 Computing covariance...")
    cov_matrix = optimizer.compute_covariance(returns_df)
    print(f"  Covariance shape: {cov_matrix.shape}")
    
    # Compute expected returns
    print("💰 Computing expected returns...")
    expected_returns = optimizer.compute_expected_returns(returns_df, mode='emh')
    print(f"  Expected returns: {expected_returns}")
    
    # Run MVP optimization
    print("\n🎯 Running MVP optimization...")
    constraints = {
        'fund_bounds': (0.02, 0.20)
    }
    mvp_weights, mvp_ret, mvp_vol = optimizer.optimize_mvp(cov_matrix, constraints)
    print(f"  ✅ MVP weights: {mvp_weights}")
    print(f"  Return: {mvp_ret:.4f}, Volatility: {mvp_vol:.4f}")
    
    # Run Max Sharpe optimization
    print("\n⭐ Running Max Sharpe optimization...")
    ms_weights, ms_ret, ms_vol, ms_sharpe = optimizer.optimize_max_sharpe(
        expected_returns, cov_matrix, constraints
    )
    print(f"  ✅ Max Sharpe weights: {ms_weights}")
    print(f"  Return: {ms_ret:.4f}, Volatility: {ms_vol:.4f}, Sharpe: {ms_sharpe:.4f}")
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\nFull traceback:")
    traceback.print_exc()

finally:
    db.close()
