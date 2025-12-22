"""
PDF Parser for CAS statements - MODULE 6
Extract portfolio holdings from CAMS/Karvy statements
"""
import pdfplumber
import pytesseract
from PIL import Image
import re
from typing import List, Dict, Tuple
import pandas as pd


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from PDF using pdfplumber
    
    Args:
        pdf_path: Path to PDF file
    
    Returns:
        Extracted text
    """
    text = ""
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {str(e)}")
    
    return text


def parse_cams_statement(text: str) -> List[Dict]:
    """
    Parse CAMS CAS statement
    
    Expected format:
    Fund Name | ISIN | Units | NAV | Value
    
    Args:
        text: Extracted PDF text
    
    Returns:
        List of holdings
    """
    holdings = []
    
    # Pattern to match fund holdings
    # Example: "HDFC Top 100 Fund - Direct Plan - Growth  INF179K01997  123.456  45.67  5643.21"
    pattern = r'([A-Za-z\s\-]+?)\s+(INF[A-Z0-9]{9})\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)'
    
    matches = re.finditer(pattern, text)
    
    for match in matches:
        fund_name = match.group(1).strip()
        isin = match.group(2).strip()
        units = float(match.group(3).replace(',', ''))
        nav = float(match.group(4).replace(',', ''))
        value = float(match.group(5).replace(',', ''))
        
        holdings.append({
            'fund_name': fund_name,
            'isin': isin,
            'units': units,
            'nav': nav,
            'current_value': value
        })
    
    return holdings


def parse_karvy_statement(text: str) -> List[Dict]:
    """
    Parse Karvy CAS statement
    
    Args:
        text: Extracted PDF text
    
    Returns:
        List of holdings
    """
    holdings = []
    
    # Karvy format may differ slightly
    # Adjust pattern as needed
    pattern = r'([A-Za-z\s\-]+?)\s+(INF[A-Z0-9]{9})\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)'
    
    matches = re.finditer(pattern, text)
    
    for match in matches:
        fund_name = match.group(1).strip()
        isin = match.group(2).strip()
        units = float(match.group(3).replace(',', ''))
        nav = float(match.group(4).replace(',', ''))
        value = float(match.group(5).replace(',', ''))
        
        holdings.append({
            'fund_name': fund_name,
            'isin': isin,
            'units': units,
            'nav': nav,
            'current_value': value
        })
    
    return holdings


def detect_statement_type(text: str) -> str:
    """
    Detect whether statement is from CAMS or Karvy
    
    Args:
        text: Extracted PDF text
    
    Returns:
        'cams' or 'karvy'
    """
    text_lower = text.lower()
    
    if 'cams' in text_lower or 'computer age' in text_lower:
        return 'cams'
    elif 'karvy' in text_lower or 'kfintech' in text_lower:
        return 'karvy'
    else:
        # Default to CAMS
        return 'cams'


def calculate_extraction_accuracy(holdings: List[Dict], total_value_from_pdf: float = None) -> float:
    """
    Calculate extraction accuracy
    
    Args:
        holdings: Extracted holdings
        total_value_from_pdf: Total portfolio value from PDF (if available)
    
    Returns:
        Accuracy score (0-1)
    """
    if not holdings:
        return 0.0
    
    # Calculate total from extracted holdings
    extracted_total = sum(h['current_value'] for h in holdings)
    
    if total_value_from_pdf:
        # Compare with PDF total
        accuracy = min(1.0, extracted_total / total_value_from_pdf)
    else:
        # Heuristic: check if all required fields are present
        complete_holdings = sum(
            1 for h in holdings
            if h.get('fund_name') and h.get('isin') and h.get('units') and h.get('current_value')
        )
        accuracy = complete_holdings / len(holdings)
    
    return accuracy


def parse_cas_statement(pdf_path: str) -> Tuple[List[Dict], float, List[str]]:
    """
    Main function to parse CAS statement
    
    Args:
        pdf_path: Path to PDF file
    
    Returns:
        Tuple of (holdings, accuracy, warnings)
    """
    warnings = []
    
    try:
        # Extract text
        text = extract_text_from_pdf(pdf_path)
        
        if not text or len(text) < 100:
            warnings.append("Extracted text is too short, PDF may be image-based")
            # Could try OCR here
            return [], 0.0, warnings
        
        # Detect statement type
        statement_type = detect_statement_type(text)
        warnings.append(f"Detected {statement_type.upper()} statement")
        
        # Parse based on type
        if statement_type == 'cams':
            holdings = parse_cams_statement(text)
        else:
            holdings = parse_karvy_statement(text)
        
        if not holdings:
            warnings.append("No holdings found in PDF")
            return [], 0.0, warnings
        
        # Calculate accuracy
        accuracy = calculate_extraction_accuracy(holdings)
        
        if accuracy < 0.8:
            warnings.append(f"Low extraction accuracy ({accuracy*100:.1f}%), manual review recommended")
        
        return holdings, accuracy, warnings
    
    except Exception as e:
        warnings.append(f"Error parsing PDF: {str(e)}")
        return [], 0.0, warnings


def map_holdings_to_funds(holdings: List[Dict], fund_database: List[Dict]) -> List[Dict]:
    """
    Map extracted holdings to fund database
    
    Args:
        holdings: Extracted holdings from PDF
        fund_database: List of funds from database
    
    Returns:
        Holdings with fund IDs and asset classes
    """
    mapped_holdings = []
    
    for holding in holdings:
        # Try to match by ISIN
        matched_fund = next(
            (f for f in fund_database if f['isin'] == holding['isin']),
            None
        )
        
        if matched_fund:
            mapped_holdings.append({
                **holding,
                'fund_id': matched_fund['id'],
                'asset_class': matched_fund['asset_class'],
                'weight': 0.0  # Will be calculated later
            })
        else:
            # Fund not in database
            mapped_holdings.append({
                **holding,
                'fund_id': None,
                'asset_class': 'Unknown',
                'weight': 0.0
            })
    
    # Calculate weights
    total_value = sum(h['current_value'] for h in mapped_holdings)
    for holding in mapped_holdings:
        holding['weight'] = holding['current_value'] / total_value if total_value > 0 else 0
    
    return mapped_holdings
