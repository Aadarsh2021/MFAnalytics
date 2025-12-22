"""
Configuration management using pydantic-settings
"""
from pydantic_settings import BaseSettings
from typing import List
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "sqlite:///./portfolio_optimizer.db"  # Default fallback
    supabase_url: str = ""
    supabase_key: str = ""
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Financial Parameters
    risk_free_rate: float = 0.065  # 6.5% for India
    trading_days_per_year: int = 252
    
    # ClamAV
    clamav_host: str = "localhost"
    clamav_port: int = 3310
    
    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,https://mf-p-13860.web.app,https://mf-p-13860.firebaseapp.com"
    
    @property
    def get_allowed_origins(self) -> List[str]:
        """Parse allowed origins from comma-separated string"""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        # Default allow production frontend to avoid env var mishaps
        prod_origins = ["https://mf-p-13860.web.app", "https://mf-p-13860.firebaseapp.com"]
        for p in prod_origins:
            if p not in origins:
                origins.append(p)
        return origins
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()
