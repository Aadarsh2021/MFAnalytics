"""
Authentication router for user registration, login, and token management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models.database import User
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# Request/Response Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_advisor: bool
    
    class Config:
        from_attributes = True


@router.post("/register")
async def register():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please use Supabase Auth on frontend")

@router.post("/login")
async def login():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please use Supabase Auth on frontend")

@router.post("/refresh")
async def refresh_access_token():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please use Supabase Auth on frontend")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    """
    return current_user


@router.post("/logout")
async def logout():
    """
    Logout (client should clear tokens)
    """
    return {"message": "Successfully logged out"}
