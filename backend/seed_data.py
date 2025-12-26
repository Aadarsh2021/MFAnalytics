"""
Sample fund data for testing
Run this script to populate the database with sample funds and NAV data
"""
from database import SessionLocal, engine, Base
from models.database import Fund, NAV, Benchmark
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

# Create tables
Base.metadata.create_all(bind=engine)

def generate_sample_navs(start_value=100, days=3650, volatility=0.15, drift=0.12):
    """Generate realistic NAV time series using geometric Brownian motion"""
    dt = 1/252  # Daily time step
    dates = [datetime.now() - timedelta(days=days-i) for i in range(days)]
    
    # Geometric Brownian Motion
    returns = np.random.normal(drift * dt, volatility * np.sqrt(dt), days)
    nav_values = start_value * np.exp(np.cumsum(returns))
    
    return list(zip(dates, nav_values))


def seed_database():
    """Populate database with sample funds and multiple benchmarks"""
    db = SessionLocal()
    
    try:
        print("Seeding database with sample funds and benchmarks...")
        
        # 1. Create Benchmarks first
        benchmarks_data = [
            {"name": "Nifty 50 TRI", "volatility": 0.18, "drift": 0.14},
            {"name": "Nifty Midcap 150 TRI", "volatility": 0.22, "drift": 0.16},
            {"name": "Nifty Smallcap 250 TRI", "volatility": 0.26, "drift": 0.18},
            {"name": "Nifty 500 TRI", "volatility": 0.20, "drift": 0.15},
            {"name": "CRISIL Composite Bond Fund Index", "volatility": 0.04, "drift": 0.07},
            {"name": "Domestic Gold Price Index", "volatility": 0.15, "drift": 0.08},
        ]
        
        benchmark_map = {}
        for b_data in benchmarks_data:
            existing = db.query(Benchmark).filter(Benchmark.name == b_data["name"]).first()
            if not existing:
                print(f"Adding benchmark: {b_data['name']}")
                nav_data = generate_sample_navs(start_value=10000, volatility=b_data["volatility"], drift=b_data["drift"])
                tri_series = {date.strftime("%Y-%m-%d"): value for date, value in nav_data}
                
                benchmark = Benchmark(name=b_data["name"], tri_series=json.dumps(tri_series))
                db.add(benchmark)
                db.flush()
                benchmark_map[b_data["name"]] = benchmark
            else:
                benchmark_map[b_data["name"]] = existing

        # 2. Sample funds with benchmark associations
        sample_funds = [
            # Equity Funds
            {"name": "HDFC Top 100 Fund", "isin": "INF179K01997", "category": "Large Cap", "asset_class": "Equity", "amc": "HDFC Mutual Fund", "benchmark": "Nifty 50 TRI"},
            {"name": "ICICI Prudential Bluechip Fund", "isin": "INF109K01AQ4", "category": "Large Cap", "asset_class": "Equity", "amc": "ICICI Prudential MF", "benchmark": "Nifty 100 TRI"},
            {"name": "SBI Focused Equity Fund", "isin": "INF200K01VX4", "category": "Focused", "asset_class": "Equity", "amc": "SBI Mutual Fund", "benchmark": "Nifty 500 TRI"},
            {"name": "Axis Midcap Fund", "isin": "INF846K01EW2", "category": "Mid Cap", "asset_class": "Equity", "amc": "Axis Mutual Fund", "benchmark": "Nifty Midcap 150 TRI"},
            {"name": "Kotak Small Cap Fund", "isin": "INF174K01757", "category": "Small Cap", "asset_class": "Equity", "amc": "Kotak Mahindra MF", "benchmark": "Nifty Smallcap 250 TRI"},
            {"name": "Mirae Asset Large Cap Fund", "isin": "INF769K01021", "category": "Large Cap", "asset_class": "Equity", "amc": "Mirae Asset MF", "benchmark": "Nifty 100 TRI"},
            {"name": "Parag Parikh Flexi Cap Fund", "isin": "INF846K01508", "category": "Flexi Cap", "asset_class": "Equity", "amc": "PPFAS MF", "benchmark": "Nifty 500 TRI"},
            {"name": "Nippon India Multi Cap Fund", "isin": "INF204K01742", "category": "Multi Cap", "asset_class": "Equity", "amc": "Nippon India MF", "benchmark": "Nifty 500 TRI"},
            
            # Debt Funds
            {"name": "HDFC Corporate Bond Fund", "isin": "INF179K01XZ7", "category": "Corporate Bond", "asset_class": "Debt", "amc": "HDFC Mutual Fund", "benchmark": "CRISIL Composite Bond Fund Index"},
            {"name": "ICICI Prudential Gilt Fund", "isin": "INF109K01131", "category": "Gilt", "asset_class": "Debt", "amc": "ICICI Prudential MF", "benchmark": "CRISIL Composite Bond Fund Index"},
            {"name": "SBI Magnum Income Fund", "isin": "INF200K01206", "category": "Medium Duration", "asset_class": "Debt", "amc": "SBI Mutual Fund", "benchmark": "CRISIL Composite Bond Fund Index"},
            
            # Gold Funds
            {"name": "HDFC Gold Fund", "isin": "INF179K01ZA4", "category": "Gold", "asset_class": "Gold", "amc": "HDFC Mutual Fund", "benchmark": "Domestic Gold Price Index"},
            {"name": "ICICI Prudential Gold ETF", "isin": "INF109KC1024", "category": "Gold", "asset_class": "Gold", "amc": "ICICI Prudential MF", "benchmark": "Domestic Gold Price Index"},
            
            # Alternative/Hybrid
            {"name": "HDFC Balanced Advantage Fund", "isin": "INF179K01XY0", "category": "Balanced Hybrid", "asset_class": "Alt", "amc": "HDFC Mutual Fund", "benchmark": "Nifty 500 TRI"},
            {"name": "ICICI Prudential Equity & Debt Fund", "isin": "INF109K01063", "category": "Aggressive Hybrid", "asset_class": "Alt", "amc": "ICICI Prudential MF", "benchmark": "Nifty 500 TRI"},
        ]
        
        # Create funds and NAVs
        for fund_data in sample_funds:
            bench_name = fund_data.pop("benchmark", "Nifty 50 TRI")
            benchmark = benchmark_map.get(bench_name) or benchmark_map.get("Nifty 50 TRI")
            
            existing_fund = db.query(Fund).filter(Fund.isin == fund_data["isin"]).first()
            if not existing_fund:
                print(f"Adding fund: {fund_data['name']}")
                fund = Fund(**fund_data)
                if benchmark:
                    fund.benchmark_id = benchmark.id
                db.add(fund)
                db.flush()
                
                # Generate NAV data based on asset class
                if fund.asset_class == "Equity":
                    nav_data = generate_sample_navs(start_value=100, volatility=0.20, drift=0.15)
                elif fund.asset_class == "Debt":
                    nav_data = generate_sample_navs(start_value=100, volatility=0.05, drift=0.07)
                elif fund.asset_class == "Gold":
                    nav_data = generate_sample_navs(start_value=100, volatility=0.15, drift=0.08)
                else:  # Alt
                    nav_data = generate_sample_navs(start_value=100, volatility=0.12, drift=0.11)
                
                for date, nav_value in nav_data:
                    nav = NAV(fund_id=fund.id, date=date.date(), nav=nav_value)
                    db.add(nav)
            else:
                if benchmark and not existing_fund.benchmark_id:
                    print(f"Updating benchmark for: {existing_fund.name}")
                    existing_fund.benchmark_id = benchmark.id

        db.commit()
        print(f"✅ Successfully seeded/updated funds and benchmarks")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
