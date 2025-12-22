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


class ClientProfileResponse(BaseModel):
    id: int
    name: Optional[str]
    risk_profile: str
    investment_horizon: int
    
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
    
    return client


@router.get("", response_model=List[ClientProfileResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all clients for the logged-in advisor
    """
    clients = db.query(Client).filter(
        Client.advisor_id == current_user.id  # Only get own clients
    ).all()
    return clients
