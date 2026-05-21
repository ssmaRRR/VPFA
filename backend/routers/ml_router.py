from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
import auth
import ml_engine
from database import get_db

router = APIRouter(
    prefix="/ml",
    tags=["Analize Machine Learning"]
)

@router.get("/forecast", response_model=schemas.FinancialForecastResponse)
def get_financial_forecast(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rulează modelul de Regresie Liniară pe istoricul tranzacțiilor utilizatorului.
    Prognozează soldul zilnic al contului pentru următoarele 3 luni.
    """
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()
    
    # Calculăm soldul curent din venituri - cheltuieli
    venituri = sum(t.suma for t in transactions if t.tip == "venit")
    cheltuieli = sum(t.suma for t in transactions if t.tip == "cheltuiala")
    sold_curent = venituri - cheltuieli
    
    # Apelăm motorul ML pentru prognoză
    forecast_data = ml_engine.forecast_financial_health(
        transactions=transactions, 
        current_balance=sold_curent, 
        months_to_forecast=3
    )
    
    return forecast_data


@router.get("/investments", response_model=schemas.InvestmentRecommendationResponse)
def get_investment_recommendations(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Determină clusterul financiar al utilizatorului cu K-Means 
    și returnează o recomandare personalizată de alocare a activelor (portofoliu).
    """
    # Rulăm motorul de clustering K-Means pe profilul utilizatorului
    recommendation = ml_engine.cluster_investment_profile(current_user)
    
    # Salvăm rezultatul clustering-ului în profilul utilizatorului din baza de date
    current_user.cluster_ml = recommendation["cluster"]
    current_user.profil_investitional = recommendation["profil_nume"]
    db.add(current_user)
    db.commit()
    
    return recommendation


@router.post("/trigger-anomalies")
def trigger_anomaly_detection(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rulează manual modelul de Isolation Forest pentru toate tranzacțiile utilizatorului.
    Actualizează starea tranzacțiilor suspecte în baza de date.
    """
    user_txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()
    
    if len(user_txs) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sunt necesare cel puțin 5 tranzacții în istoric pentru a antrena modelul de Isolation Forest."
        )
        
    anomaly_results = ml_engine.detect_anomalies(user_txs)
    
    # Actualizăm tranzacțiile în baza de date
    anomalies_found = 0
    for tx_id, is_anom, details in anomaly_results:
        if is_anom:
            anomalies_found += 1
        db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
            "este_anomala": is_anom,
            "anomalie_detalii": details
        })
        
    db.commit()
    return {
        "message": f"Detecția anomaliilor a fost finalizată cu succes! Au fost identificate {anomalies_found} anomalii de cheltuieli."
    }
