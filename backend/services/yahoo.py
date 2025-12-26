"""
Yahoo Finance Integration Service
Fallback data source for mutual fund NAV history
"""
import yfinance as yf
import httpx
import asyncio
from typing import Optional, List, Tuple
from datetime import datetime
import pandas as pd

class YahooFinanceService:
    """
    Service to fetch fund data from Yahoo Finance
    """
    SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
    
    # Static mapping for popular funds to ensure hit rate
    KNOWN_TICKERS = {
        'HDFC Top 100 Fund': '0P0000XW8F.BO',
        'HDFC Mid-Cap Opportunities Fund': '0P00005W02.BO',
        'Parag Parikh Flexi Cap Fund': '0P0000XW91.BO',
        'Nippon India Small Cap Fund': '0P0000XVAA.BO',
        'SBI Small Cap Fund': '0P0000XVAB.BO',
        'Axis Bluechip Fund': '0P0000XV9Y.BO',
        'Mirae Asset Large Cap Fund': '0P0000XV9Z.BO',
        'Kotak Emerging Equity Fund': '0P0000XV9X.BO',
        'Axis Long Term Equity Fund': '0P0000XV9T.BO',
        'SBI Bluechip Fund': '0P0000XV9W.BO',
        'ICICI Prudential Bluechip Fund': '0P0000XW8K.BO',
        'Quant Small Cap Fund': '0P0000XVBC.BO',
        'Tata Digital India Fund': '0P00017X1M.BO',
        'Franklin India Prima Fund': '0P0000XW9A.BO',
        'DSP Midcap Fund': '0P0000XW8C.BO',
        'Canara Robeco Emerging Equities': '0P0000XV9L.BO',
    }

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }

    async def search_ticker(self, name: str, isin: Optional[str] = None) -> Optional[str]:
        """
        Search for Yahoo Finance ticker by Name or ISIN
        """
        # 1. Check static mapping
        # Try exact name match
        cleaned_name = name.replace('Direct', '').replace('Plan', '').replace('Growth', '').strip()
        for key, ticker in self.KNOWN_TICKERS.items():
            if key.lower() in cleaned_name.lower():
                 print(f"  Found known ticker for '{name}': {ticker}")
                 return ticker
                 
        async with httpx.AsyncClient() as client:
            try:
                # Try ISIN first if available (often reliable for India)
                # Note: Yahoo often suffixes ISIN based on exchange, but direct ISIN search works sometimes
                # Generate search variations
                clean_name = name.replace('Direct', '').replace('Plan', '').replace('Growth', '').replace('Option', '').strip()
                cleanup_query = ' '.join(clean_name.split()) # Remove extra spaces
                
                queries = []
                if isin:
                    queries.append(isin)
                
                # Add Name variations
                queries.append(cleanup_query)
                queries.append(f"{cleanup_query} Fund")
                if 'HDFC' in cleanup_query: # Specific handling for major AMCs
                     queries.append(cleanup_query.replace('HDFC', 'HDFC Mutual Fund'))
                
                print(f"  Yahoo Search Queries: {queries}")

                for q in queries:
                    params = {
                        'q': q,
                        'quotesCount': 5,
                        'newsCount': 0,
                        'enableFuzzyQuery': False,
                        'quotesQueryId': 'tss_match_phrase_query'
                    }
                    
                    response = await client.get(self.SEARCH_URL, params=params, headers=self.headers)
                    if response.status_code == 200:
                        data = response.json()
                        quotes = data.get('quotes', [])
                        
                        for quote in quotes:
                            symbol = quote.get('symbol', '')
                            # Prefer Indian mutual funds (often end in .BO or .NS) or just check symbol
                            if '.BO' in symbol or '.NS' in symbol:
                                print(f"  Found Yahoo ticker for '{q}': {symbol}")
                                return symbol
                                
            except Exception as e:
                print(f"  Yahoo search failed for {name}: {e}")
                
        return None

    def get_nav_history(self, ticker: str, period: str = "max") -> List[Tuple[str, float]]:
        """
        Fetch historical NAV data using yfinance
        Returns list of (date_str, nav_value) tuples
        """
        try:
            fund = yf.Ticker(ticker)
            # Fetch history
            hist = fund.history(period=period)
            
            if hist.empty:
                return []
            
            # Extract Close price as NAV
            navs = []
            for date, row in hist.iterrows():
                try:
                    nav_val = float(row['Close'])
                    if pd.notna(nav_val) and nav_val > 0:
                        navs.append((date.strftime('%Y-%m-%d'), nav_val))
                except:
                    continue
                    
            return navs
            
        except Exception as e:
            print(f"  Error fetching Yahoo history for {ticker}: {e}")
            return []

    def get_fund_metadata(self, ticker: str) -> dict:
        """
        Fetch fund metadata like expense ratio, yield, etc.
        """
        try:
            fund = yf.Ticker(ticker)
            info = fund.info
            
            return {
                "expense_ratio": info.get("annualReportExpenseRatio"),
                "yield": info.get("yield"),
                "trailing_pe": info.get("trailingPE"),
                "price_to_book": info.get("priceToBook"),
                "total_assets": info.get("totalAssets"),
                "category": info.get("category"),
                "beta": info.get("beta"),
                "sharpe_ratio": info.get("sharpeRatio")
            }
        except Exception as e:
            print(f"  Error fetching Yahoo metadata for {ticker}: {e}")
            return {}
