"""
Portfolio router - MODULE 6 & 7
Handles PDF upload, parsing, and portfolio comparison
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from database import get_db
from models.database import Fund, Portfolio
from models.schemas import PDFUploadResponse, PDFParseResponse, PortfolioComparison, PortfolioHolding

# TODO: Implement PDF parser module
# from pdf_parser import parse_cas_statement, map_holdings_to_funds
import json

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload CAS PDF file
    
    - **file**: PDF file (CAMS or Karvy CAS statement)
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique upload ID
    upload_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{upload_id}.pdf")
    
    try:
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return PDFUploadResponse(
            upload_id=upload_id,
            filename=file.filename,
            status="uploaded",
            message="PDF uploaded successfully"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/parse", response_model=PDFParseResponse)
async def parse_pdf(
    upload_id: str,
    db: Session = Depends(get_db)
):
    """
    Parse uploaded PDF and extract holdings
    
    NOTE: This endpoint is currently disabled pending PDF parser implementation.
    """
    raise HTTPException(
        status_code=501,
        detail="PDF parsing not yet implemented. Please use manual fund selection via /api/funds/search instead."
    )


@router.post("/optimize")
async def optimize_existing_portfolio(
    upload_id: str,
    client_id: int,
    db: Session = Depends(get_db)
):
    """
    Optimize existing portfolio from PDF
    
    - **upload_id**: Upload ID from parsed PDF
    - **client_id**: Client ID with risk profile
    """
    # This would integrate with the optimization engine
    # For now, return a placeholder
    return {
        "message": "Portfolio optimization for existing portfolio",
        "upload_id": upload_id,
        "client_id": client_id,
        "status": "pending"
    }


@router.post("/compare", response_model=PortfolioComparison)
async def compare_portfolios(
    current_portfolio_id: int,
    optimized_portfolio_id: int,
    db: Session = Depends(get_db)
):
    """
    Compare current vs optimized portfolio
    
    - **current_portfolio_id**: ID of current portfolio
    - **optimized_portfolio_id**: ID of optimized portfolio
    """
    # Placeholder implementation
    # In production, this would fetch both portfolios and calculate differences
    
    return PortfolioComparison(
        current={
            "weights": {},
            "expected_return": 0.10,
            "volatility": 0.15,
            "sharpe_ratio": 0.67
        },
        optimized={
            "weights": {},
            "expected_return": 0.12,
            "volatility": 0.14,
            "sharpe_ratio": 0.86
        },
        return_improvement=0.02,
        sd_reduction=0.01,
        sharpe_improvement=0.19,
        concentration_risk_change=-0.05,
        trades=[]
    )
