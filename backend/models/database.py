"""
SQLAlchemy ORM models for database tables
"""
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, TIMESTAMP, CheckConstraint, Index, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """User/Advisor accounts"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_advisor = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    clients = relationship("Client", back_populates="advisor")



class Fund(Base):
    """Mutual fund master data"""
    __tablename__ = "funds"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    isin = Column(String(12), unique=True, nullable=False, index=True)
    category = Column(String(100))
    asset_class = Column(String(50))
    amc = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    navs = relationship("NAV", back_populates="fund", cascade="all, delete-orphan")
    benchmark_id = Column(Integer, ForeignKey("benchmarks.id"), nullable=True)
    benchmark = relationship("Benchmark")


class NAV(Base):
    """Net Asset Value time series"""
    __tablename__ = "navs"
    
    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False)
    date = Column(Date, nullable=False)
    nav = Column(Float, nullable=False)
    
    # Relationships
    fund = relationship("Fund", back_populates="navs")
    
    # Constraints
    __table_args__ = (
        Index('idx_navs_fund_date', 'fund_id', 'date'),
        # Unique constraint on fund_id and date
    )


class Benchmark(Base):
    """Benchmark indices with TRI series"""
    __tablename__ = "benchmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    tri_series = Column(JSON, nullable=False)  # JSON: {date: value}
    created_at = Column(TIMESTAMP, server_default=func.now())


class Client(Base):
    """Client information and risk profile"""
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    risk_profile = Column(String(50))  # Conservative, Moderate, Aggressive
    investment_horizon = Column(Integer)  # Years
    constraints = Column(JSON)  # JSON: Asset allocation constraints
    advisor_id = Column(Integer, ForeignKey("users.id"))  # Link to advisor
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    advisor = relationship("User", back_populates="clients")
    portfolios = relationship("Portfolio", back_populates="client", cascade="all, delete-orphan")



class Portfolio(Base):
    """Portfolio holdings"""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    source = Column(String(20), nullable=False)  # manual or pdf
    holdings = Column(JSON, nullable=False)  # JSON: List of holdings with weights
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="portfolios")
    optimizations = relationship("Optimization", back_populates="portfolio", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("source IN ('manual', 'pdf')", name='check_source'),
    )


class Optimization(Base):
    """Optimization results"""
    __tablename__ = "optimizations"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    inputs = Column(JSON, nullable=False)  # JSON: Constraints, sliders, etc.
    output = Column(JSON, nullable=False)  # JSON: MVP, Max Sharpe, frontier, metrics
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="optimizations")
