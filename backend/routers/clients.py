"""
Client management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models.database import Client, User
from utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/clients", tags=["clients"])


from models.schemas import IntakeRequest, IntakeResponse, RiskProfile, AssetAllocation as WealthAssetAllocation


from datetime import datetime
from models.database import Portfolio, Optimization

class ClientProfileResponse(BaseModel):
    id: int
    name: Optional[str]
    risk_profile: str
    investment_horizon: int
    latest_optimization_date: Optional[datetime] = None
    latest_optimization_id: Optional[int] = None
    
    class Config:
        from_attributes = True


@router.post("", response_model=IntakeResponse)
def create_client(
    request: IntakeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new client profile with risk assessment and constraints (Advisor Linked)
    """
    try:
        # Create client record with advisor link
        client = Client(
            name=request.client_name,
            risk_profile=request.risk_profile.risk_level.value,
            investment_horizon=request.risk_profile.investment_horizon,
            constraints=json.dumps(request.risk_profile.model_dump()),
            advisor_id=current_user.id
        )
        
        db.add(client)
        db.commit()
        db.refresh(client)
        
        return IntakeResponse(
            client_id=client.id,
            message="Client profile created successfully and linked to your account"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving client: {str(e)}")


@router.get("/{client_id}", response_model=ClientProfileResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get client profile by ID
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.advisor_id == current_user.id  # Only get own clients
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Fetch latest optimization
    latest_opt = db.query(Optimization).join(Portfolio).filter(
        Portfolio.client_id == client.id
    ).order_by(Optimization.created_at.desc()).first()
    
    client.latest_optimization_date = latest_opt.created_at if latest_opt else None
    client.latest_optimization_id = latest_opt.id if latest_opt else None
    
    return client


@router.get("", response_model=List[ClientProfileResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all clients for the logged-in advisor with latest activity
    """
    # Optimize: Fetch latest optimization metadata in a single query using subquery
    from sqlalchemy import func, case
    
    # Subquery to find the latest optimization ID and date per client
    latest_opt_sub = db.query(
        Portfolio.client_id,
        func.max(Optimization.created_at).label('latest_date'),
        func.max(Optimization.id).label('latest_id') # Approximation if IDs are monotonic with time
    ).join(Optimization).group_by(Portfolio.client_id).subquery()
    
    # Main query joining Client with the subquery
    results = db.query(
        Client,
        latest_opt_sub.c.latest_date,
        latest_opt_sub.c.latest_id
    ).outerjoin(
        latest_opt_sub, Client.id == latest_opt_sub.c.client_id
    ).filter(
        Client.advisor_id == current_user.id
    ).all()
    
    # Map results to response schema
    client_responses = []
    for client, latest_date, latest_id in results:
        # Populate transient fields on the ORM object (or create Pydantic model directly)
        client.latest_optimization_date = latest_date
        client.latest_optimization_id = latest_id
        client_responses.append(client)
        
    return client_responses
