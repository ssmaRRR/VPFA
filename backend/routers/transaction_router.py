import csv
import io
import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
import auth
import ml_engine
from database import get_db

router = APIRouter(
    prefix="/transactions",
    tags=["Tranzacții"]
)

# Categorii predefinite suportate
CATEGORII_SUPORTATE = ["Mâncare", "Chirie", "Utilități", "Transport", "Divertisment", "Sănătate", "Investiții", "Altele"]

@router.post("/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: schemas.TransactionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Creează o tranzacție nouă și rulează detecția anomaliilor pentru ea."""
    db_tx = models.Transaction(
        user_id=current_user.id,
        suma=tx_in.suma,
        categorie=tx_in.categorie,
        tip=tx_in.tip,
        descriere=tx_in.descriere,
        data=tx_in.data if tx_in.data else datetime.datetime.utcnow(),
        sursa=tx_in.sursa
    )
    
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    # Recalculăm anomaliile pentru toate tranzacțiile de tip cheltuială ale utilizatorului
    # pentru a actualiza modelul Isolation Forest cu noua intrare
    user_txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()
    
    # Rulăm detecția anomaliilor
    anomaly_results = ml_engine.detect_anomalies(user_txs)
    
    # Actualizăm starea în baza de date
    for tx_id, is_anom, details in anomaly_results:
        db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
            "este_anomala": is_anom,
            "anomalie_detalii": details
        })
    db.commit()
    db.refresh(db_tx)
    
    return db_tx


@router.get("/", response_model=List[schemas.TransactionResponse])
def get_transactions(
    tip: Optional[str] = None,
    categorie: Optional[str] = None,
    cautare: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Listează toate tranzacțiile utilizatorului curent cu posibilități de filtrare și căutare."""
    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
    
    if tip:
        query = query.filter(models.Transaction.tip == tip)
    if categorie:
        query = query.filter(models.Transaction.categorie == categorie)
    if cautare:
        query = query.filter(models.Transaction.descriere.ilike(f"%{cautare}%"))
        
    # Ordonăm descrescător după dată pentru a vedea cele mai noi tranzacții
    return query.order_by(models.Transaction.data.desc()).all()


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge o tranzacție specifică dacă ea aparține utilizatorului curent."""
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tranzacția nu a fost găsită sau nu ai permisiunea de a o șterge."
        )
        
    db.delete(tx)
    db.commit()
    return None


@router.get("/dashboard-summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generează rezumatul financiar general pentru ecranul principal (panoul de control)."""
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    
    venituri = sum(t.suma for t in txs if t.tip == "venit")
    cheltuieli = sum(t.suma for t in txs if t.tip == "cheltuiala")
    sold = venituri - cheltuieli
    
    # Rata de economisire = (Venituri - Cheltuieli) / Venituri
    rata_eco = 0.0
    if venituri > 0:
        rata_eco = max(0.0, (venituri - cheltuieli) / venituri) * 100
        
    alerte = sum(1 for t in txs if t.este_anomala and t.tip == "cheltuiala")
    
    return {
        "venituri_totale": round(venituri, 2),
        "cheltuieli_totale": round(cheltuieli, 2),
        "sold_curent": round(sold, 2),
        "rata_economisire": round(rata_eco, 1),
        "alerte_anomalii": alerte
    }


@router.get("/monthly-trends", response_model=List[schemas.MonthlyTrend])
def get_monthly_trends(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grupează veniturile și cheltuielile pe ultimele 6 luni 
    pentru reprezentarea grafică a evoluției în timp.
    """
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    
    # Inițializăm ultimele 6 luni calendaristice
    trends = {}
    today = datetime.date.today()
    
    for i in range(5, -1, -1):
        # Determinăm luna și anul din urmă cu i luni
        d = today - datetime.timedelta(days=i*30)
        luna_cheie = d.strftime("%Y-%m")
        luna_nume_romana = d.strftime("%B %Y")
        # Traducem lunile în limba română (fallback simplu)
        lunile = {
            "January": "Ian", "February": "Feb", "March": "Mar", "April": "Apr",
            "May": "Mai", "June": "Iun", "July": "Iul", "August": "Aug",
            "September": "Sep", "October": "Oct", "November": "Noi", "December": "Dec"
        }
        nume_luna = d.strftime("%B")
        luna_tradusa = lunile.get(nume_luna, nume_luna[:3]) + " " + d.strftime("%Y")
        
        trends[luna_cheie] = {
            "luna": luna_tradusa,
            "venituri": 0.0,
            "cheltuieli": 0.0
        }
        
    for t in txs:
        luna_t = t.data.strftime("%Y-%m")
        if luna_t in trends:
            if t.tip == "venit":
                trends[luna_t]["venituri"] += t.suma
            else:
                trends[luna_t]["cheltuieli"] += t.suma
                
    # Returnăm lista ordonată cronologic
    return [schemas.MonthlyTrend(
        luna=v["luna"],
        venituri=round(v["venituri"], 2),
        cheltuieli=round(v["cheltuieli"], 2)
    ) for k, v in sorted(trends.items())]


@router.post("/mock-sync", status_code=status.HTTP_201_CREATED)
def sync_mock_bank_data(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulează sincronizarea cu contul bancar prin generarea a 30 de tranzacții 
    realiste pentru ultimele 45 de zile, inclusiv anomalii de cheltuieli pentru demonstrarea ML.
    """
    # Ștergem tranzacțiile existente ale utilizatorului adăugate prin Sincronizare pentru a nu le dubla
    db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.sursa == "Sincronizare Bancară"
    ).delete()
    
    today = datetime.datetime.now()
    txs_to_create = []
    
    # 1. Venituri (Salariu și Freelancing)
    # Salariu luna trecută
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=current_user.venit_lunar,
        categorie="Salariu",
        tip="venit",
        descriere="Salariu lunar SC Tech SRL",
        data=today - datetime.timedelta(days=25),
        sursa="Sincronizare Bancară"
    ))
    # Freelancing
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=1200.0,
        categorie="Salariu",
        tip="venit",
        descriere="Servicii consultanță Web Design",
        data=today - datetime.timedelta(days=12),
        sursa="Sincronizare Bancară"
    ))
    
    # 2. Cheltuieli Recurente Fixe
    # Chirie
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=1600.0,
        categorie="Chirie",
        tip="cheltuiala",
        descriere="Plată chirie apartament 2 camere",
        data=today - datetime.timedelta(days=24),
        sursa="Sincronizare Bancară"
    ))
    # Întreținere și Utilități
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=380.0,
        categorie="Utilități",
        tip="cheltuiala",
        descriere="Factură întreținere bloc - iarnă",
        data=today - datetime.timedelta(days=20),
        sursa="Sincronizare Bancară"
    ))
    # Energie electrică
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=120.0,
        categorie="Utilități",
        tip="cheltuiala",
        descriere="Factură curent electric Enel",
        data=today - datetime.timedelta(days=18),
        sursa="Sincronizare Bancară"
    ))
    # Internet și Telefonie
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=75.0,
        categorie="Utilități",
        tip="cheltuiala",
        descriere="Abonament Digi Net & Mobil",
        data=today - datetime.timedelta(days=19),
        sursa="Sincronizare Bancară"
    ))
    
    # 3. Cheltuieli Zilnice Curente (Mâncare, Transport, Sănătate, Divertisment)
    # Mâncare supermarket (plăți repetate la Mega Image, Lidl)
    supermarket_brands = ["Mega Image", "Lidl", "Kaufland", "Carrefour"]
    for i in range(1, 26, 3): # 8 tranzacții de supermarket în ultimele 25 de zile
        brand = random.choice(supermarket_brands)
        suma = round(random.uniform(50.0, 220.0), 2)
        txs_to_create.append(models.Transaction(
            user_id=current_user.id,
            suma=suma,
            categorie="Mâncare",
            tip="cheltuiala",
            descriere=f"Plată POS {brand}",
            data=today - datetime.timedelta(days=i),
            sursa="Sincronizare Bancară"
        ))
        
    # Restaurante și Cafenele
    for i in [2, 7, 14, 21]:
        suma = round(random.uniform(40.0, 150.0), 2)
        txs_to_create.append(models.Transaction(
            user_id=current_user.id,
            suma=suma,
            categorie="Mâncare",
            tip="cheltuiala",
            descriere="Plată POS Restaurant / Food Delivery",
            data=today - datetime.timedelta(days=i),
            sursa="Sincronizare Bancară"
        ))
        
    # Transport (plăți Uber, Bolt, Metrou)
    for i in [4, 9, 13, 16, 22]:
        suma = round(random.uniform(15.0, 45.0), 2)
        txs_to_create.append(models.Transaction(
            user_id=current_user.id,
            suma=suma,
            categorie="Transport",
            tip="cheltuiala",
            descriere="Tranzacție UBER / BOLT ridesharing",
            data=today - datetime.timedelta(days=i),
            sursa="Sincronizare Bancară"
        ))
        
    # Sănătate (Abonament sală, Farmacie)
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=180.0,
        categorie="Sănătate",
        tip="cheltuiala",
        descriere="Abonament lunar sală WorldClass",
        data=today - datetime.timedelta(days=23),
        sursa="Sincronizare Bancară"
    ))
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=85.0,
        categorie="Sănătate",
        tip="cheltuiala",
        descriere="Achiziție medicamente Farmacia Tei",
        data=today - datetime.timedelta(days=10),
        sursa="Sincronizare Bancară"
    ))
    
    # Investiții recurente
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=500.0,
        categorie="Investiții",
        tip="cheltuiala",
        descriere="Transfer cont tranzacționare Tradeville (ETF)",
        data=today - datetime.timedelta(days=5),
        sursa="Sincronizare Bancară"
    ))
    
    # 4. ANOMALII GENERATE INTENȚIONAT (pentru testarea Isolation Forest)
    # Anomalia 1: O cumpărătură extrem de mare la categoria Divertisment
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=4600.0,
        categorie="Divertisment",
        tip="cheltuiala",
        descriere="Plată POS Altex Romania - Achiziție Laptop Gaming",
        data=today - datetime.timedelta(days=15),
        sursa="Sincronizare Bancară"
    ))
    # Anomalia 2: O plată de restaurant neobișnuit de mare pentru profilul userului
    txs_to_create.append(models.Transaction(
        user_id=current_user.id,
        suma=1450.0,
        categorie="Mâncare",
        tip="cheltuiala",
        descriere="Catering eveniment privat & restaurant aniversare",
        data=today - datetime.timedelta(days=6),
        sursa="Sincronizare Bancară"
    ))
    
    # Salvăm tranzacțiile în baza de date
    db.add_all(txs_to_create)
    db.commit()
    
    # Rulăm algoritmul Isolation Forest pe noul set completat
    user_txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    anomaly_results = ml_engine.detect_anomalies(user_txs)
    
    # Salvăm rezultatele detecției anomaliilor
    for tx_id, is_anom, details in anomaly_results:
        db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
            "este_anomala": is_anom,
            "anomalie_detalii": details
        })
    db.commit()
    
    return {"message": "Sincronizare reușită! 30 de tranzacții mock au fost adăugate, inclusiv 2 anomalii de cheltuieli."}


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_user_data(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Șterge toate tranzacțiile și abonamentele utilizatorului curent
    și resetează profilul ML de clustering la starea inițială.
    """
    # Ștergem tranzacțiile
    db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).delete()
    
    # Ștergem abonamentele
    db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).delete()
    
    # Resetăm cluster-ul și profilul ML
    current_user.cluster_ml = None
    current_user.profil_investitional = None
    db.add(current_user)
    
    db.commit()
    
    return {"message": "Toate datele financiare au fost resetate cu succes."}


@router.post("/import-csv")
def import_csv_transactions(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite utilizatorului să încarce un fișier CSV cu extrase de cont.
    Formatul așteptat este un tabel cu antetele: Data, Suma, Categorie, Tip, Descriere.
    Exemplu: 2026-05-15, 120.50, Mancare, cheltuiala, Cumparaturi saptamanale
    """
    contents = file.file.read()
    buffer = io.StringIO(contents.decode('utf-8'))
    reader = csv.reader(buffer)
    
    headers = next(reader, None) # Citim header-ul
    # Mapăm pozițiile de coloane. Căutăm cuvinte cheie.
    col_map = {"data": 0, "suma": 1, "categorie": 2, "tip": 3, "descriere": 4}
    
    imported_count = 0
    txs_to_create = []
    
    for row in reader:
        if not row or len(row) < 4:
            continue
        try:
            # Parsare sumă
            suma_str = row[col_map["suma"]].strip().replace(",", ".")
            suma = float(suma_str)
            
            # Parsare tip
            tip = row[col_map["tip"]].strip().lower()
            if tip not in ["venit", "cheltuiala"]:
                tip = "cheltuiala"
                
            # Parsare categorie
            categorie = row[col_map["categorie"]].strip().capitalize()
            if categorie not in CATEGORII_SUPORTATE:
                categorie = "Altele"
                
            # Parsare dată
            data_str = row[col_map["data"]].strip()
            try:
                data = datetime.datetime.strptime(data_str, "%Y-%m-%d")
            except ValueError:
                data = datetime.datetime.utcnow()
                
            # Descriere
            descriere = row[col_map["descriere"]].strip() if len(row) > col_map["descriere"] else "Import CSV"
            
            db_tx = models.Transaction(
                user_id=current_user.id,
                suma=suma,
                categorie=categorie,
                tip=tip,
                descriere=descriere,
                data=data,
                sursa="CSV"
            )
            txs_to_create.append(db_tx)
            imported_count += 1
        except Exception:
            # Ignorăm rândurile greșit formatate
            continue
            
    if txs_to_create:
        db.add_all(txs_to_create)
        db.commit()
        
        # Rulăm detecția anomaliilor pe tot setul
        user_txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
        anomaly_results = ml_engine.detect_anomalies(user_txs)
        for tx_id, is_anom, details in anomaly_results:
            db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
                "este_anomala": is_anom,
                "anomalie_detalii": details
            })
        db.commit()
        
    return {"message": f"Import finalizat cu succes! {imported_count} tranzacții au fost adăugate din CSV."}


@router.post("/revolut-sandbox/sync", status_code=status.HTTP_201_CREATED)
def sync_revolut_sandbox(
    request: schemas.RevolutSyncRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulează sincronizarea cu contul Revolut Sandbox, descărcând tranzacții 
    în formatul nativ al API-ului Revolut Business Open Banking, mapându-le
    și rulând motorul ML pentru detectarea anomaliilor.
    """
    if request.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cod OTP incorect în Sandbox. Folosește codul 123456 pentru test."
        )

    # Ștergem tranzacțiile existente ale utilizatorului cu sursa "Revolut Sandbox API" pentru a nu le dubla
    db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.sursa == "Revolut Sandbox API"
    ).delete()

    today = datetime.datetime.now()

    # Structura JSON simulată conform API-ului Revolut Business (Open Banking standard)
    revolut_data = [
        {
            "id": "revolut_tx_1",
            "reference": "Salariu lunar SC Tech SRL",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=25)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=25)).isoformat(),
            "legs": [
                {
                    "amount": 6200.0,
                    "currency": "RON",
                    "description": "Salariu lunar",
                    "balance": 6200.0
                }
            ]
        },
        {
            "id": "revolut_tx_2",
            "reference": "Plata chirie apartament",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=24)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=24)).isoformat(),
            "legs": [
                {
                    "amount": -1800.0,
                    "currency": "RON",
                    "description": "Chirie apartament 2 camere",
                    "balance": 4400.0
                }
            ]
        },
        {
            "id": "revolut_tx_3",
            "reference": "Plata POS Mega Image",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=21)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=21)).isoformat(),
            "legs": [
                {
                    "amount": -120.5,
                    "currency": "RON",
                    "description": "Mega Image POS 12",
                    "balance": 4279.5
                }
            ]
        },
        {
            "id": "revolut_tx_4",
            "reference": "Plata POS Lidl",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=19)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=19)).isoformat(),
            "legs": [
                {
                    "amount": -240.2,
                    "currency": "RON",
                    "description": "Lidl Pipera",
                    "balance": 4039.3
                }
            ]
        },
        {
            "id": "revolut_tx_5",
            "reference": "Plata POS Altex",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=15)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=15)).isoformat(),
            "legs": [
                {
                    "amount": -4500.0,
                    "currency": "RON",
                    "description": "Altex Romania - Achizitie Monitor Gaming",
                    "balance": -460.7
                }
            ]
        },
        {
            "id": "revolut_tx_6",
            "reference": "Transfer cont tranzactionare Tradeville",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=12)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=12)).isoformat(),
            "legs": [
                {
                    "amount": -800.0,
                    "currency": "RON",
                    "description": "Tradeville ETF Cumparare",
                    "balance": -1260.7
                }
            ]
        },
        {
            "id": "revolut_tx_7",
            "reference": "Plata POS Uber ridesharing",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=10)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=10)).isoformat(),
            "legs": [
                {
                    "amount": -35.0,
                    "currency": "RON",
                    "description": "Uber Cursa Pipera",
                    "balance": -1295.7
                }
            ]
        },
        {
            "id": "revolut_tx_8",
            "reference": "Plata POS Bolt ridesharing",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=9)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=9)).isoformat(),
            "legs": [
                {
                    "amount": -28.0,
                    "currency": "RON",
                    "description": "Bolt Cursa Centru",
                    "balance": -1323.7
                }
            ]
        },
        {
            "id": "revolut_tx_9",
            "reference": "Factura curent electric Enel",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=7)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=7)).isoformat(),
            "legs": [
                {
                    "amount": -150.0,
                    "currency": "RON",
                    "description": "Enel Energie Muntenia",
                    "balance": -1473.7
                }
            ]
        },
        {
            "id": "revolut_tx_10",
            "reference": "Factura Digi Net & Mobil",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=6)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=6)).isoformat(),
            "legs": [
                {
                    "amount": -85.0,
                    "currency": "RON",
                    "description": "RCS & RDS SA Digi Mobil",
                    "balance": -1558.7
                }
            ]
        },
        {
            "id": "revolut_tx_11",
            "reference": "Servicii consultanta Web Design",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=5)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=5)).isoformat(),
            "legs": [
                {
                    "amount": 1500.0,
                    "currency": "RON",
                    "description": "Freelancing consultanta web",
                    "balance": -58.7
                }
            ]
        },
        {
            "id": "revolut_tx_12",
            "reference": "Plata POS Farmacia Tei",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=4)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=4)).isoformat(),
            "legs": [
                {
                    "amount": -95.0,
                    "currency": "RON",
                    "description": "Farmacia Tei Bucuresti",
                    "balance": -153.7
                }
            ]
        },
        {
            "id": "revolut_tx_13",
            "reference": "Netflix Subscription",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=3)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=3)).isoformat(),
            "legs": [
                {
                    "amount": -65.0,
                    "currency": "RON",
                    "description": "Netflix.com payment",
                    "balance": -218.7
                }
            ]
        },
        {
            "id": "revolut_tx_14",
            "reference": "Plata POS Restaurant Tazz",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=2)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=2)).isoformat(),
            "legs": [
                {
                    "amount": -130.0,
                    "currency": "RON",
                    "description": "Food Delivery Tazz",
                    "balance": -348.7
                }
            ]
        },
        {
            "id": "revolut_tx_15",
            "reference": "Catering aniversare restaurant",
            "state": "completed",
            "created_at": (today - datetime.timedelta(days=1)).isoformat(),
            "completed_at": (today - datetime.timedelta(days=1)).isoformat(),
            "legs": [
                {
                    "amount": -1450.0,
                    "currency": "RON",
                    "description": "Restaurant aniversare",
                    "balance": -1798.7
                }
            ]
        }
    ]

    txs_to_create = []
    for r_tx in revolut_data:
        leg = r_tx["legs"][0]
        valoare_raw = leg["amount"]
        tip = "venit" if valoare_raw > 0 else "cheltuiala"
        suma = abs(valoare_raw)
        descriere = r_tx["reference"] or leg["description"] or "Tranzactie Revolut"
        data_final = datetime.datetime.fromisoformat(r_tx["completed_at"])
        
        desc_lower = descriere.lower()
        if "salariu" in desc_lower or "web design" in desc_lower or "freelancing" in desc_lower:
            categorie = "Salariu" if tip == "venit" else "Altele"
        elif "chirie" in desc_lower:
            categorie = "Chirie"
        elif "mega image" in desc_lower or "lidl" in desc_lower or "restaurant" in desc_lower or "catering" in desc_lower:
            categorie = "Mâncare"
        elif "enel" in desc_lower or "digi" in desc_lower:
            categorie = "Utilități"
        elif "uber" in desc_lower or "bolt" in desc_lower:
            categorie = "Transport"
        elif "altex" in desc_lower or "netflix" in desc_lower:
            categorie = "Divertisment"
        elif "tei" in desc_lower or "farmacia" in desc_lower:
            categorie = "Sănătate"
        elif "tradeville" in desc_lower:
            categorie = "Investiții"
        else:
            categorie = "Altele"

        db_tx = models.Transaction(
            user_id=current_user.id,
            suma=suma,
            categorie=categorie,
            tip=tip,
            descriere=descriere,
            data=data_final,
            sursa="Revolut Sandbox API"
        )
        txs_to_create.append(db_tx)

    db.add_all(txs_to_create)
    db.commit()

    user_txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    anomaly_results = ml_engine.detect_anomalies(user_txs)
    
    anomalies_count = 0
    for tx_id, is_anom, details in anomaly_results:
        db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
            "este_anomala": is_anom,
            "anomalie_detalii": details
        })
        if is_anom:
            tx_obj = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
            if tx_obj and tx_obj.sursa == "Revolut Sandbox API" and tx_obj.tip == "cheltuiala":
                anomalies_count += 1
                
    db.commit()

    return {
        "status": "success",
        "count": len(revolut_data),
        "anomalies_detected": anomalies_count,
        "message": f"Sincronizare cu Revolut Sandbox reușită! {len(revolut_data)} tranzacții au fost importate, dintre care {anomalies_count} anomalii de cheltuieli."
    }


BANK_MAPPING = {
    "bt": {"name": "Banca Transilvania Sandbox", "display": "Banca Transilvania"},
    "bcr": {"name": "BCR Sandbox", "display": "BCR"},
    "brd": {"name": "BRD Sandbox", "display": "BRD"},
    "ing": {"name": "ING Bank Sandbox", "display": "ING Bank"},
    "raiffeisen": {"name": "Raiffeisen Bank Sandbox", "display": "Raiffeisen Bank"},
    "cec": {"name": "CEC Bank Sandbox", "display": "CEC Bank"},
    "unicredit": {"name": "UniCredit Bank Sandbox", "display": "UniCredit Bank"},
    "revolut": {"name": "Revolut Sandbox API", "display": "Revolut"}
}


@router.post("/bank-sandbox/sync", status_code=status.HTTP_201_CREATED)
def sync_bank_sandbox(
    request: schemas.BankSyncRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulează sincronizarea cu o bancă din Open Banking Sandbox, descărcând
    tranzacții personalizate pe brandul băncii și rulând ML Isolation Forest.
    """
    if request.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cod OTP incorect în Sandbox. Folosește codul 123456 pentru test."
        )

    bank_info = BANK_MAPPING.get(request.bank_id)
    if not bank_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bancă nesuportată în sistemul Open Banking Sandbox."
        )

    sursa_name = bank_info["name"]
    display_name = bank_info["display"]

    # Ștergem tranzacțiile existente ale utilizatorului cu această sursă pentru a nu le dubla
    db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.sursa == sursa_name
    ).delete()

    today = datetime.datetime.now()

    # Generăm 15 tranzacții personalizate pe specificul băncii
    revolut_data = []

    if request.bank_id == "bt":
        revolut_data = [
            {"id": "bt_tx_1", "reference": "Salariu SC Transilvania IT SRL", "amount": 6400.0, "desc": "Salariu lunar BT24"},
            {"id": "bt_tx_2", "reference": "Plata chirie apartament", "amount": -1900.0, "desc": "Chirie apartament Cluj"},
            {"id": "bt_tx_3", "reference": "Plata POS Mega Image", "amount": -85.5, "desc": "Mega Image Marasti"},
            {"id": "bt_tx_4", "reference": "Plata POS Lidl", "amount": -130.2, "desc": "Lidl Gheorgheni"},
            {"id": "bt_tx_5", "reference": "Plata POS Dedeman Cluj", "amount": -4800.0, "desc": "Dedeman - Achizitie Materiale"},
            {"id": "bt_tx_6", "reference": "Transfer BT24 - Popescu Vlad", "amount": -800.0, "desc": "Schimb valutar / Transfer"},
            {"id": "bt_tx_7", "reference": "Plata POS Uber ridesharing", "amount": -32.0, "desc": "Uber Cursa Centru"},
            {"id": "bt_tx_8", "reference": "Plata POS Bolt ridesharing", "amount": -22.0, "desc": "Bolt Cursa Cluj"},
            {"id": "bt_tx_9", "reference": "Factura curent electric Enel", "amount": -160.0, "desc": "E.ON Energie"},
            {"id": "bt_tx_10", "reference": "Factura Digi Net & Mobil", "amount": -75.0, "desc": "Digi Romania BT Pay"},
            {"id": "bt_tx_11", "reference": "Servicii consultanta Web Design", "amount": 1800.0, "desc": "Freelancing BT"},
            {"id": "bt_tx_12", "reference": "Plata POS Farmacia Tei", "amount": -110.0, "desc": "Farmacia Tei Cluj"},
            {"id": "bt_tx_13", "reference": "Netflix Subscription", "amount": -65.0, "desc": "Netflix.com"},
            {"id": "bt_tx_14", "reference": "Cumparaturi Panemar", "amount": -35.0, "desc": "Panemar Cluj POS"},
            {"id": "bt_tx_15", "reference": "Catering eveniment BT Cafe", "amount": -1450.0, "desc": "BT Cafe aniversare"}
        ]
    elif request.bank_id == "ing":
        revolut_data = [
            {"id": "ing_tx_1", "reference": "Salariu ING-Dutch Software", "amount": 6700.0, "desc": "Home'Bank Salary"},
            {"id": "ing_tx_2", "reference": "Plata chirie apartament", "amount": -1750.0, "desc": "ING Direct Rent"},
            {"id": "ing_tx_3", "reference": "Plata POS Mega Image", "amount": -145.2, "desc": "Mega Image Bucuresti"},
            {"id": "ing_tx_4", "reference": "Plata POS Lidl", "amount": -195.0, "desc": "Lidl Pipera"},
            {"id": "ing_tx_5", "reference": "Plata POS ING Pay - Starbucks", "amount": -24.0, "desc": "Starbucks Pipera"},
            {"id": "ing_tx_6", "reference": "Transfer cont tranzactionare Tradeville", "amount": -900.0, "desc": "ING Home'Bank Tradeville"},
            {"id": "ing_tx_7", "reference": "Plata POS Uber ridesharing", "amount": -42.0, "desc": "Uber Bucharest"},
            {"id": "ing_tx_8", "reference": "Plata POS Bolt ridesharing", "amount": -31.0, "desc": "Bolt Cursa OTP"},
            {"id": "ing_tx_9", "reference": "Factura curent electric Enel", "amount": -140.0, "desc": "Enel Energie Muntenia"},
            {"id": "ing_tx_10", "reference": "Factura Digi Net & Mobil", "amount": -85.0, "desc": "RCS-RDS SA"},
            {"id": "ing_tx_11", "reference": "Servicii consultanta Web Design", "amount": 1600.0, "desc": "Freelance Home'Bank"},
            {"id": "ing_tx_12", "reference": "Plata POS Farmacia Tei", "amount": -85.0, "desc": "Farmacia Tei Dristor"},
            {"id": "ing_tx_13", "reference": "Abonament Netflix Amsterdam", "amount": -65.0, "desc": "Netflix.com Amsterdam"},
            {"id": "ing_tx_14", "reference": "Plata POS Altex Electro casnice", "amount": -4500.0, "desc": "Altex Romania - Achizitie Monitor Gaming"},
            {"id": "ing_tx_15", "reference": "Catering aniversare restaurant", "amount": -1450.0, "desc": "Restaurant Tazz ING Pay"}
        ]
    elif request.bank_id == "bcr":
        revolut_data = [
            {"id": "bcr_tx_1", "reference": "Salariu SC George Tech SRL", "amount": 6100.0, "desc": "George Salary"},
            {"id": "bcr_tx_2", "reference": "Plata chirie apartament", "amount": -1850.0, "desc": "George Rent Payment"},
            {"id": "bcr_tx_3", "reference": "Plata POS Mega Image", "amount": -95.0, "desc": "Mega Image POS George"},
            {"id": "bcr_tx_4", "reference": "Plata POS Kaufland", "amount": -310.5, "desc": "Kaufland Bucuresti"},
            {"id": "bcr_tx_5", "reference": "Plata POS Altex Romania", "amount": -4500.0, "desc": "Altex Romania - Achizitie Monitor Gaming"},
            {"id": "bcr_tx_6", "reference": "Transfer George - Enel", "amount": -145.0, "desc": "George Utility Transfer"},
            {"id": "bcr_tx_7", "reference": "Plata POS Uber ridesharing", "amount": -36.0, "desc": "Uber Bucharest"},
            {"id": "bcr_tx_8", "reference": "Plata POS Bolt ridesharing", "amount": -26.0, "desc": "Bolt Cursa George"},
            {"id": "bcr_tx_9", "reference": "Factura Digi Net & Mobil", "amount": -85.0, "desc": "George Digi Net"},
            {"id": "bcr_tx_10", "reference": "Transfer BCR George - Intretinere", "amount": -350.0, "desc": "Asociatie de proprietari"},
            {"id": "bcr_tx_11", "reference": "Servicii consultanta Web Design", "amount": 1400.0, "desc": "Freelance George"},
            {"id": "bcr_tx_12", "reference": "Plata POS Farmacia Tei", "amount": -95.0, "desc": "Farmacia Tei George"},
            {"id": "bcr_tx_13", "reference": "Netflix Subscription", "amount": -65.0, "desc": "Netflix George"},
            {"id": "bcr_tx_14", "reference": "Plata POS Restaurant George", "amount": -120.0, "desc": "George Pay Restaurant"},
            {"id": "bcr_tx_15", "reference": "Catering eveniment privat & restaurant aniversare", "amount": -1450.0, "desc": "Catering George"}
        ]
    else:
        # Generare generică
        revolut_data = [
            {"id": "gen_tx_1", "reference": f"Salariu lunar SC {display_name} SRL", "amount": 6200.0, "desc": "Salariu lunar"},
            {"id": "gen_tx_2", "reference": "Plata chirie apartament", "amount": -1800.0, "desc": "Chirie apartament"},
            {"id": "gen_tx_3", "reference": "Plata POS Mega Image", "amount": -120.5, "desc": "Mega Image"},
            {"id": "gen_tx_4", "reference": "Plata POS Lidl", "amount": -240.2, "desc": "Lidl POS"},
            {"id": "gen_tx_5", "reference": "Plata POS Altex", "amount": -4500.0, "desc": "Altex Romania - Achizitie Monitor Gaming"},
            {"id": "gen_tx_6", "reference": "Transfer cont tranzactionare Tradeville", "amount": -800.0, "desc": "Tradeville ETF"},
            {"id": "gen_tx_7", "reference": "Plata POS Uber ridesharing", "amount": -35.0, "desc": "Uber Cursa"},
            {"id": "gen_tx_8", "reference": "Plata POS Bolt ridesharing", "amount": -28.0, "desc": "Bolt Cursa"},
            {"id": "gen_tx_9", "reference": "Factura curent electric Enel", "amount": -150.0, "desc": "Enel"},
            {"id": "gen_tx_10", "reference": "Factura Digi Net & Mobil", "amount": -85.0, "desc": "Digi Mobil"},
            {"id": "gen_tx_11", "reference": "Servicii consultanta Web Design", "amount": 1500.0, "desc": "Freelance Design"},
            {"id": "gen_tx_12", "reference": "Plata POS Farmacia Tei", "amount": -95.0, "desc": "Farmacia Tei"},
            {"id": "gen_tx_13", "reference": "Netflix Subscription", "amount": -65.0, "desc": "Netflix"},
            {"id": "gen_tx_14", "reference": "Plata POS Restaurant Tazz", "amount": -130.0, "desc": "Tazz Food"},
            {"id": "gen_tx_15", "reference": "Catering aniversare restaurant", "amount": -1450.0, "desc": "Restaurant aniversare"}
        ]

    txs_to_create = []
    for index, r_tx in enumerate(revolut_data):
        valoare_raw = r_tx["amount"]
        tip = "venit" if valoare_raw > 0 else "cheltuiala"
        suma = abs(valoare_raw)
        descriere = r_tx["reference"]
        data_final = today - datetime.timedelta(days=index + 1)
        
        desc_lower = descriere.lower()
        if "salariu" in desc_lower or "web design" in desc_lower or "freelancing" in desc_lower:
            categorie = "Salariu" if tip == "venit" else "Altele"
        elif "chirie" in desc_lower:
            categorie = "Chirie"
        elif "mega image" in desc_lower or "lidl" in desc_lower or "kaufland" in desc_lower or "panemar" in desc_lower or "restaurant" in desc_lower or "catering" in desc_lower:
            categorie = "Mâncare"
        elif "enel" in desc_lower or "digi" in desc_lower or "e.on" in desc_lower or "intretinere" in desc_lower:
            categorie = "Utilități"
        elif "uber" in desc_lower or "bolt" in desc_lower:
            categorie = "Transport"
        elif "altex" in desc_lower or "netflix" in desc_lower or "dedeman" in desc_lower or "starbucks" in desc_lower:
            categorie = "Divertisment"
        elif "tei" in desc_lower or "farmacia" in desc_lower:
            categorie = "Sănătate"
        elif "tradeville" in desc_lower:
            categorie = "Investiții"
        else:
            categorie = "Altele"

        db_tx = models.Transaction(
            user_id=current_user.id,
            suma=suma,
            categorie=categorie,
            tip=tip,
            descriere=descriere,
            data=data_final,
            sursa=sursa_name
        )
        txs_to_create.append(db_tx)

    db.add_all(txs_to_create)
    db.commit()

    user_txs = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    anomaly_results = ml_engine.detect_anomalies(user_txs)
    
    anomalies_count = 0
    for tx_id, is_anom, details in anomaly_results:
        db.query(models.Transaction).filter(models.Transaction.id == tx_id).update({
            "este_anomala": is_anom,
            "anomalie_detalii": details
        })
        if is_anom:
            tx_obj = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
            if tx_obj and tx_obj.sursa == sursa_name and tx_obj.tip == "cheltuiala":
                anomalies_count += 1
                
    db.commit()

    return {
        "status": "success",
        "count": len(revolut_data),
        "anomalies_detected": anomalies_count,
        "message": f"Sincronizare cu {display_name} Sandbox reușită! {len(revolut_data)} tranzacții au fost importate, dintre care {anomalies_count} anomalii de cheltuieli."
    }


@router.delete("/bank-sandbox/disconnect/{bank_id}", status_code=status.HTTP_200_OK)
def disconnect_bank_sandbox(
    bank_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deconectează o bancă din Sandbox prin ștergerea tuturor tranzacțiilor
    sincronizate pentru acea sursă bancară specifică.
    """
    bank_info = BANK_MAPPING.get(bank_id)
    if not bank_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bancă nesuportată în sistemul Open Banking Sandbox."
        )

    sursa_name = bank_info["name"]

    db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.sursa == sursa_name
    ).delete()
    
    db.commit()
    
    return {"message": f"Contul {bank_info['display']} a fost deconectat, iar tranzacțiile sale au fost șterse."}


# =====================================================================
# Rute pentru Abonamente / Plăți Recurente
# =====================================================================

@router.post("/subscriptions", response_model=schemas.SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: schemas.SubscriptionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Adaugă o nouă plată recurentă / abonament."""
    db_sub = models.Subscription(
        user_id=current_user.id,
        nume=sub_in.nume,
        suma=sub_in.suma,
        categorie=sub_in.categorie,
        zi_plata=sub_in.zi_plata,
        activa=sub_in.activa if sub_in.activa is not None else True
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub


@router.get("/subscriptions", response_model=List[schemas.SubscriptionResponse])
def get_subscriptions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Listează toate abonamentele utilizatorului curent."""
    return db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).all()


@router.delete("/subscriptions/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    sub_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge un abonament."""
    db_sub = db.query(models.Subscription).filter(
        models.Subscription.id == sub_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if not db_sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abonamentul nu a fost găsit sau nu ai permisiunea de a-l șterge."
        )
    db.delete(db_sub)
    db.commit()
    return None


@router.get("/subscriptions/upcoming", response_model=List[schemas.SubscriptionResponse])
def get_upcoming_subscriptions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Listează plățile recurente din următoarele 7 zile."""
    import calendar
    # Determinăm data de referință (azi)
    today = datetime.date.today()
    
    # Obținem abonamentele active ale utilizatorului
    active_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.activa == True
    ).all()
    
    upcoming = []
    for sub in active_subs:
        # Calculăm următoarea dată de plată a abonamentului
        last_day_this = calendar.monthrange(today.year, today.month)[1]
        billing_this = datetime.date(today.year, today.month, min(sub.zi_plata, last_day_this))
        
        if billing_this >= today:
            next_billing = billing_this
        else:
            # Următoarea lună
            if today.month == 12:
                next_month = 1
                next_year = today.year + 1
            else:
                next_month = today.month + 1
                next_year = today.year
            last_day_next = calendar.monthrange(next_year, next_month)[1]
            next_billing = datetime.date(next_year, next_month, min(sub.zi_plata, last_day_next))
            
        # Verificăm dacă este în următoarele 7 zile (inclusiv azi și azi+7)
        delta = (next_billing - today).days
        if 0 <= delta <= 7:
            upcoming.append(sub)
            
    return upcoming


@router.post("/{tx_id}/resolve-anomaly")
def resolve_anomaly(
    tx_id: int,
    action: str,  # "confirm" sau "report"
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rezolvă o anomalie prin confirmare (tranzacția devine legitimă)
    sau prin raportare (tranzacția este ștearsă din istoric).
    """
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tranzacția nu a fost găsită.")
        
    if action == "confirm":
        tx.este_anomala = False
        tx.anomalie_detalii = None
        db.commit()
        return {"message": "Tranzacția a fost confirmată ca legitimă."}
    elif action == "report":
        db.delete(tx)
        db.commit()
        return {"message": "Tranzacția suspectă a fost raportată și eliminată."}
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Acțiune invalidă.")


