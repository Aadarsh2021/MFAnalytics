"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import date
from enum import Enum


class RiskProfileEnum(str, Enum):
    """Risk profile options"""
    conservative = "conservative"
    moderate = "moderate"
    aggressive = "aggressive"
    custom = "custom"


class AssetAllocation(BaseModel):
    """Asset allocation constraints"""
    equity_min: float = Field(ge=0, le=100)
    equity_max: float = Field(ge=0, le=100)
    debt_min: float = Field(ge=0, le=100)
    debt_max: float = Field(ge=0, le=100)
    gold_min: float = Field(default=0, ge=0, le=100)
    gold_max: float = Field(default=0, ge=0, le=100)
    alt_min: float = Field(default=0, ge=0, le=100)
    alt_max: float = Field(default=0, ge=0, le=100)
    
    @field_validator('equity_max', 'debt_max', 'gold_max', 'alt_max')
    @classmethod
    def max_greater_than_min(cls, v, info):
        """Validate max >= min"""
        field_name = info.field_name.replace('_max', '_min')
        if field_name in info.data and v < info.data[field_name]:
            raise ValueError(f"Max must be >= min")
        return v


class RiskProfile(BaseModel):
    """Client risk profile and constraints"""
    risk_level: RiskProfileEnum
    investment_horizon: int = Field(ge=1, le=30, description="Years")
    asset_allocation: AssetAllocation
    volatility_tolerance: Optional[float] = Field(default=None, ge=0, le=100)
    return_expectation: Optional[float] = Field(default=None, ge=0, le=50)
    max_weight_per_fund: Optional[float] = Field(default=20, ge=0, le=100)
    min_weight_per_fund: Optional[float] = Field(default=0, ge=0, le=100)
    
    # Financial Goals & Planning (New)
    financial_goal: Optional[str] = Field(default="Wealth Creation")
    target_amount: Optional[float] = Field(default=0, ge=0)
    monthly_savings: Optional[float] = Field(default=0, ge=0)
    emergency_fund_months: Optional[int] = Field(default=6, ge=0, le=24)
    tax_bracket: Optional[str] = Field(default="30%")
    current_investment_value: Optional[float] = Field(default=0, ge=0)


class IntakeRequest(BaseModel):
    """Request to save client intake"""
    client_name: Optional[str] = None
    risk_profile: RiskProfile


class IntakeResponse(BaseModel):
    """Response after saving intake"""
    client_id: int
    message: str


class FundSearchRequest(BaseModel):
    """Fund search filters"""
    query: Optional[str] = None
    category: Optional[str] = None
    asset_class: Optional[str] = None
    amc: Optional[str] = None
    plan_type: Optional[str] = None  # Direct / Regular
    scheme_type: Optional[str] = None  # Growth / IDCW
    limit: int = Field(default=2000, ge=1)
    offset: int = Field(default=0, ge=0)


class FundSearchResponse(BaseModel):
    """Response with total count for accurate pagination"""
    funds: List["FundInfo"]
    total: int
    offset: int
    limit: int



class FundInfo(BaseModel):
    """Fund information"""
    id: int
    name: str
    isin: str
    category: Optional[str]
    asset_class: Optional[str]
    amc: Optional[str]
    plan_type: Optional[str] = "Regular"
    scheme_type: Optional[str] = "Growth"
    has_nav_data: bool = True
    data_quality: str = "unknown"  # good, warning, error, unknown


class FundSelectionRequest(BaseModel):
    """Request to select fund universe"""
    fund_ids: List[int]
    auto_select: bool = False
    auto_select_count: Optional[int] = Field(default=10, ge=1, le=50)


class NAVData(BaseModel):
    """NAV time series data"""
    fund_id: int
    fund_name: str
    nav_series: List[Dict[str, Any]]  # [{date: str, nav: float}]


class OptimizationRequest(BaseModel):
    """Request to run portfolio optimization"""
    client_id: int
    fund_ids: List[int]
    constraints: RiskProfile
    target_return: Optional[float] = None
    target_volatility: Optional[float] = None


class PortfolioWeights(BaseModel):
    """Portfolio weights and metrics"""
    weights: Dict[int, float]  # {fund_id: weight}
    expected_return: float
    volatility: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    beta: Optional[float] = None
    max_drawdown: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None


class OptimizationResult(BaseModel):
    optimization_id: int
    mvp: dict
    max_sharpe: dict
    efficient_frontier: List[dict]
    fund_details: List[dict]


class PortfolioHolding(BaseModel):
    """Individual portfolio holding"""
    fund_name: str
    isin: str
    units: float
    current_value: float
    weight: float
    asset_class: str


class PDFUploadResponse(BaseModel):
    """Response after PDF upload"""
    upload_id: str
    filename: str
    status: str
    message: str


class PDFParseResponse(BaseModel):
    """Response after PDF parsing"""
    upload_id: str
    holdings: List[PortfolioHolding]
    total_value: float
    extraction_accuracy: float
    warnings: List[str] = []


class PortfolioComparison(BaseModel):
    """Comparison between current and optimized portfolio"""
    current: PortfolioWeights
    optimized: PortfolioWeights
    sd_reduction: float
    return_improvement: float
    sharpe_improvement: float
    concentration_risk_change: float
    trades: List[Dict[str, Any]]  # [{fund_id, fund_name, current_weight, target_weight, action}]


class NavDataRequest(BaseModel):
    """Request for NAV data"""
    fund_ids: List[int]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
