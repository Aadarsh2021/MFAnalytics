"""
Client intake router - MODULE 1
Handles risk profile and constraint management
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.database import Client
from models.schemas import IntakeRequest, IntakeResponse, RiskProfile

router = APIRouter()


@router.post("/", response_model=IntakeResponse)
async def save_intake(
    request: IntakeRequest,
    db: Session = Depends(get_db)
):
    """
    Save client risk profile and constraints
    
    - **client_name**: Optional client name
    - **risk_profile**: Risk profile with constraints
    
    Returns client_id for future reference
    """
    try:
        # Create client record
        client = Client(
            name=request.client_name,
            risk_profile=request.risk_profile.risk_level.value,
            investment_horizon=request.risk_profile.investment_horizon,
            constraints=request.risk_profile.model_dump()
        )
        
        db.add(client)
        db.commit()
        db.refresh(client)
        
        return IntakeResponse(
            client_id=client.id,
            message="Client intake saved successfully"
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving intake: {str(e)}")


@router.get("/{client_id}", response_model=RiskProfile)
async def get_intake(
    client_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve client risk profile and constraints
    
    - **client_id**: Client ID from previous intake
    
    Returns complete risk profile
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Convert stored JSON back to RiskProfile
    try:
        risk_profile = RiskProfile.model_validate(client.constraints)
        return risk_profile
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving intake: {str(e)}")


@router.get("/list/all")
async def list_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all clients (for admin/debugging)
    """
    clients = db.query(Client).offset(skip).limit(limit).all()
    
    return [
        {
            "id": client.id,
            "name": client.name,
            "risk_profile": client.risk_profile,
            "investment_horizon": client.investment_horizon,
            "created_at": client.created_at.isoformat()
        }
        for client in clients
    ]
