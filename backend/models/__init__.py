"""Models package initialization"""
from models.database import Fund, NAV, Benchmark, Client, Portfolio, Optimization
from models.schemas import (
    RiskProfileEnum,
    AssetAllocation,
    RiskProfile,
    IntakeRequest,
    IntakeResponse,
    FundSearchRequest,
    FundInfo,
    FundSelectionRequest,
    NAVData,
    OptimizationRequest,
    PortfolioWeights,
    OptimizationResult,
    PortfolioHolding,
    PDFUploadResponse,
    PDFParseResponse,
    PortfolioComparison
)

__all__ = [
    # Database models
    "Fund",
    "NAV",
    "Benchmark",
    "Client",
    "Portfolio",
    "Optimization",
    # Pydantic schemas
    "RiskProfileEnum",
    "AssetAllocation",
    "RiskProfile",
    "IntakeRequest",
    "IntakeResponse",
    "FundSearchRequest",
    "FundInfo",
    "FundSelectionRequest",
    "NAVData",
    "OptimizationRequest",
    "PortfolioWeights",
    "OptimizationResult",
    "PortfolioHolding",
    "PDFUploadResponse",
    "PDFParseResponse",
    "PortfolioComparison"
]
