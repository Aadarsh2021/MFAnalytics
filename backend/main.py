"""
FastAPI application entry point
# Force redeploy: Fix null byte error
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from config import settings

# Import routers
from routers import intake, funds, optimize, portfolio, data, clients, rebalance, auth

app = FastAPI(
    title="Portfolio Optimization API",
    description="EMH-based portfolio optimization system for advisors",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Create database tables on startup
from database import engine, Base
from models import database as models
Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # Allow explicit origins from config AND any subdomain of web.app / firebaseapp.com via regex
    allow_origins=settings.get_allowed_origins,
    allow_origin_regex=r"https://.*\.web\.app|https://.*\.firebaseapp\.com|http://localhost:.*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "ngrok-skip-browser-warning"],
)

# Add GZip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register routers
app.include_router(auth.router)  # Authentication (no prefix, already in router)
app.include_router(intake.router, prefix="/api/intake", tags=["intake"])
app.include_router(funds.router, prefix="/api/funds", tags=["funds"])
app.include_router(optimize.router, tags=["optimize"])  # Already has /api/optimize prefix
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(clients.router)
app.include_router(rebalance.router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Portfolio Optimization API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "risk_free_rate": settings.risk_free_rate,
        "trading_days": settings.trading_days_per_year
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True if settings.environment == "development" else False
    )
