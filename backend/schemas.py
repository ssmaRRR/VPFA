from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# =====================================================================
# Scheme pentru Autentificare și Utilizator
# =====================================================================

class UserBase(BaseModel):
    nume: str
    email: EmailStr
    varsta: Optional[int] = Field(30, ge=18, le=100)
    venit_lunar: Optional[float] = Field(5000.0, ge=0)
    toleranta_risc: Optional[str] = Field("Moderat", description="Conservator, Moderat, Agresiv")
    obiectiv_economii: Optional[float] = Field(1000.0, ge=0)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nume: Optional[str] = None
    varsta: Optional[int] = None
    venit_lunar: Optional[float] = None
    toleranta_risc: Optional[str] = None
    obiectiv_economii: Optional[float] = None

class UserResponse(UserBase):
    id: int
    cluster_ml: Optional[int] = None
    profil_investitional: Optional[str] = None
    data_creare: datetime

    class Config:
        from_attributes = True

# =====================================================================
# Scheme pentru Tranzacții
# =====================================================================

class TransactionBase(BaseModel):
    suma: float = Field(..., gt=0, description="Suma tranzacției trebuie să fie mai mare decât 0")
    categorie: str # Mâncare, Chirie, Utilități, Divertisment, Salariu, Investiții, Altele
    tip: str # venit sau cheltuiala
    descriere: Optional[str] = None
    data: Optional[datetime] = None
    sursa: Optional[str] = "Manual"

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    data: datetime
    este_anomala: bool
    anomalie_detalii: Optional[str] = None

    class Config:
        from_attributes = True

# =====================================================================
# Scheme de Raportare și Rezumat
# =====================================================================

class DashboardSummary(BaseModel):
    venituri_totale: float
    cheltuieli_totale: float
    sold_curent: float
    rata_economisire: float
    alerte_anomalii: int

class MonthlyTrend(BaseModel):
    luna: str
    venituri: float
    cheltuieli: float

# =====================================================================
# Scheme pentru Machine Learning
# =====================================================================

class ForecastPoint(BaseModel):
    data: str
    sold_estimat: float

class FinancialForecastResponse(BaseModel):
    istoric: List[ForecastPoint]
    predictie: List[ForecastPoint]
    runway_luni: Optional[float] = None # Cât timp îi ajung economiile dacă nu ar mai avea venituri
    mesaj_sanatate: str

class AssetAllocation(BaseModel):
    clasa_active: str # ex: Acțiuni, Obligațiuni, Cash, Crypto, Imobiliare
    procent: float # ex: 60.0
    valoare_estimata: float

class InvestmentRecommendationResponse(BaseModel):
    cluster: int
    profil_nume: str # ex: Conservator, Moderat, Agresiv
    descriere: str
    alocare: List[AssetAllocation]
    recomandare_detaliata: str

# =====================================================================
# Scheme pentru Tokeni JWT
# =====================================================================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
