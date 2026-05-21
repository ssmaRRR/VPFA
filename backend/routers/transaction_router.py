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
