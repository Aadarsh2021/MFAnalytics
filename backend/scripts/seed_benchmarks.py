import yfinance as yf
import json
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path to import database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.database import Benchmark

def seed_benchmarks():
    db = SessionLocal()
    
    indices = {
        'NIFTY 50': '^NSEI',
        'NIFTY NEXT 50': '^NSMIDCP', # Approximation if exact code not found, but ^NSEI is fine
        'S&P BSE SENSEX': '^BSESN',
        'NIFTY MIDCAP 100': '^NSEMDCP100',
        'NIFTY SMALLCAP 100': '^CNXSC'
    }
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=10*365) # 10 years of data
    
    for name, ticker in indices.items():
        print(f"Fetching data for {name} ({ticker})...")
        try:
            df = yf.download(ticker, start=start_date, end=end_date)
            if df.empty:
                print(f"  Warning: No data found for {ticker}")
                continue
            
            # Convert to {date: value} dict
            # Use 'Close' price
            tri_series = {}
            for date, row in df.iterrows():
                tri_series[date.strftime('%Y-%m-%d')] = float(row['Close'])
            
            # Check if benchmark already exists
            benchmark = db.query(Benchmark).filter(Benchmark.name == name).first()
            if benchmark:
                benchmark.tri_series = tri_series
                print(f"  Updated {name} with {len(tri_series)} data points.")
            else:
                benchmark = Benchmark(name=name, tri_series=tri_series)
                db.add(benchmark)
                print(f"  Created {name} with {len(tri_series)} data points.")
                
            db.commit()
        except Exception as e:
            print(f"  Error seeding {name}: {e}")
            db.rollback()
            
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_benchmarks()
