"""
PDF Portfolio Parser Service
Extracts mutual fund holdings from CAS (Consolidated Account Statement) PDFs
"""
import pdfplumber
import re
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.database import Fund


class CASParser:
    """
    Parser for CAMS and Karvy CAS PDFs
    """
    
    def __init__(self):
        self.holdings = []
    
    def extract_text(self, pdf_path: str) -> str:
        """
        Extract text from PDF file
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Extracted text
        """
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
        
        return text
    
    def parse_cams_cas(self, text: str) -> List[Dict]:
        """
        Parse CAMS CAS format
        
        Args:
            text: Extracted PDF text
            
        Returns:
            List of holdings with scheme name, ISIN, units, value
        """
        holdings = []
        
        # CAMS CAS pattern: looks for scheme names followed by ISIN and values
        # Pattern: Scheme Name, ISIN, Units, NAV, Value
        lines = text.split('\n')
        
        current_scheme = None
        for i, line in enumerate(lines):
            # Look for ISIN pattern (12 characters: 2 letters + 10 alphanumeric)
            isin_match = re.search(r'\b([A-Z]{2}[A-Z0-9]{10})\b', line)
            
            if isin_match:
                isin = isin_match.group(1)
                
                # Get scheme name from previous lines
                scheme_name = None
                for j in range(max(0, i-3), i):
                    if lines[j].strip() and not re.search(r'\d{2}-\d{2}-\d{4}', lines[j]):
                        potential_name = lines[j].strip()
                        if len(potential_name) > 10 and 'Fund' in potential_name:
                            scheme_name = potential_name
                            break
                
                if not scheme_name:
                    continue
                
                # Extract units and value
                numbers = re.findall(r'[\d,]+\.?\d*', line)
                
                if len(numbers) >= 2:
                    try:
                        units = float(numbers[0].replace(',', ''))
                        value = float(numbers[-1].replace(',', ''))
                        
                        holdings.append({
                            'scheme_name': scheme_name,
                            'isin': isin,
                            'units': units,
                            'value': value,
                        })
                    except:
                        continue
        
        return holdings
    
    def parse_karvy_cas(self, text: str) -> List[Dict]:
        """
        Parse Karvy CAS format (similar to CAMS)
        
        Args:
            text: Extracted PDF text
            
        Returns:
            List of holdings
        """
        # Karvy format is similar to CAMS
        return self.parse_cams_cas(text)
    
    def parse_generic(self, text: str) -> List[Dict]:
        """
        Generic parser for any CAS format
        
        Args:
            text: Extracted PDF text
            
        Returns:
            List of holdings
        """
        holdings = []
        
        # Look for ISIN patterns anywhere in the document
        isin_pattern = r'\b([A-Z]{2}[A-Z0-9]{10})\b'
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            isin_matches = re.finditer(isin_pattern, line)
            
            for match in isin_matches:
                isin = match.group(1)
                
                # Get context (previous and next lines)
                context_start = max(0, i-2)
                context_end = min(len(lines), i+3)
                context = '\n'.join(lines[context_start:context_end])
                
                # Extract scheme name
                scheme_name = None
                for j in range(context_start, i+1):
                    if 'Fund' in lines[j] or 'Scheme' in lines[j]:
                        scheme_name = lines[j].strip()
                        break
                
                if not scheme_name:
                    continue
                
                # Extract numbers (units, NAV, value)
                numbers = re.findall(r'[\d,]+\.?\d*', context)
                
                if len(numbers) >= 2:
                    try:
                        # Assume last number is value, second-to-last might be units
                        value = float(numbers[-1].replace(',', ''))
                        units = float(numbers[-2].replace(',', '')) if len(numbers) > 1 else 0
                        
                        holdings.append({
                            'scheme_name': scheme_name,
                            'isin': isin,
                            'units': units,
                            'value': value,
                        })
                    except:
                        continue
        
        # Remove duplicates
        unique_holdings = []
        seen_isins = set()
        for holding in holdings:
            if holding['isin'] not in seen_isins:
                unique_holdings.append(holding)
                seen_isins.add(holding['isin'])
        
        return unique_holdings
    
    def parse_pdf(self, pdf_path: str) -> List[Dict]:
        """
        Parse CAS PDF and extract holdings
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of holdings
        """
        text = self.extract_text(pdf_path)
        
        if not text:
            return []
        
        # Try CAMS format first
        holdings = self.parse_cams_cas(text)
        
        # If no holdings found, try generic parser
        if not holdings:
            holdings = self.parse_generic(text)
        
        return holdings
    
    def map_to_database(self, holdings: List[Dict], db: Session) -> List[Dict]:
        """
        Map extracted holdings to database funds
        
        Args:
            holdings: List of holdings from PDF
            db: Database session
            
        Returns:
            List of holdings with fund_id and asset_class
        """
        mapped_holdings = []
        
        for holding in holdings:
            # Try to find fund by ISIN
            fund = db.query(Fund).filter(Fund.isin == holding['isin']).first()
            
            # If not found by ISIN, try by name (fuzzy match)
            if not fund:
                # Simple name matching
                scheme_name_clean = holding['scheme_name'].lower()
                funds = db.query(Fund).all()
                
                for f in funds:
                    if f.name.lower() in scheme_name_clean or scheme_name_clean in f.name.lower():
                        fund = f
                        break
            
            if fund:
                mapped_holdings.append({
                    'fund_id': fund.id,
                    'fund_name': fund.name,
                    'asset_class': fund.asset_class,
                    'isin': holding['isin'],
                    'units': holding['units'],
                    'value': holding['value'],
                })
            else:
                # Fund not in database
                mapped_holdings.append({
                    'fund_id': None,
                    'fund_name': holding['scheme_name'],
                    'asset_class': 'Unknown',
                    'isin': holding['isin'],
                    'units': holding['units'],
                    'value': holding['value'],
                })
        
        return mapped_holdings
    
    def calculate_weights(self, holdings: List[Dict]) -> Dict[int, float]:
        """
        Calculate portfolio weights from holdings
        
        Args:
            holdings: List of mapped holdings
            
        Returns:
            Dict mapping fund_id to weight
        """
        total_value = sum(h['value'] for h in holdings if h['fund_id'] is not None)
        
        if total_value == 0:
            return {}
        
        weights = {}
        for holding in holdings:
            if holding['fund_id'] is not None:
                weights[holding['fund_id']] = holding['value'] / total_value
        
        return weights
    
    def get_asset_allocation(self, holdings: List[Dict]) -> Dict[str, float]:
        """
        Get asset class allocation from holdings
        
        Args:
            holdings: List of mapped holdings
            
        Returns:
            Dict mapping asset class to percentage
        """
        total_value = sum(h['value'] for h in holdings)
        
        if total_value == 0:
            return {}
        
        allocation = {}
        for holding in holdings:
            asset_class = holding['asset_class']
            if asset_class not in allocation:
                allocation[asset_class] = 0
            allocation[asset_class] += holding['value'] / total_value * 100
        
        return allocation
