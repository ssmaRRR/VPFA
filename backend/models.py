import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    """
    Modelul reprezentând un utilizator în aplicație.
    Include date personale utilizate pentru analize de clustering de investiții.
    """
    __tablename__ = "utilizatori"

    id = Column(Integer, primary_key=True, index=True)
    nume = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Câmpuri folosite pentru algoritmul de Clustering (K-Means)
    varsta = Column(Integer, default=30)
    venit_lunar = Column(Float, default=5000.0)
    toleranta_risc = Column(String, default="Moderat") # Conservator, Moderat, Agresiv
    obiectiv_economii = Column(Float, default=1000.0) # Obiectivul lunar de economisire
    
    # Profilul de investiții determinat de modelul ML
    cluster_ml = Column(Integer, nullable=True) # ID-ul clusterului determinat (0, 1, 2)
    profil_investitional = Column(String, nullable=True) # Descriere / Alocare active
    
    data_creare = Column(DateTime, default=datetime.datetime.utcnow)

    # Relație cu tranzacțiile utilizatorului
    tranzactii = relationship("Transaction", back_populates="utilizator", cascade="all, delete-orphan")


class Transaction(Base):
    """
    Modelul reprezentând o tranzacție financiară (venit sau cheltuială).
    Include flag-uri pentru detecția anomaliilor prin Isolation Forest.
    """
    __tablename__ = "tranzactii"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("utilizatori.id", ondelete="CASCADE"), nullable=False)
    
    suma = Column(Float, nullable=False)
    categorie = Column(String, nullable=False) # Mâncare, Chirie, Utilități, Salariu, Investiții, etc.
    tip = Column(String, nullable=False) # 'venit' sau 'cheltuiala'
    descriere = Column(String, nullable=True)
    data = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    sursa = Column(String, default="Manual") # Manual, CSV, Sincronizare Bancară
    
    # Câmpuri populate de modelul ML de Detecție Anomalii
    este_anomala = Column(Boolean, default=False)
    anomalie_detalii = Column(String, nullable=True) # Explicație (ex: "Sumă neobișnuit de mare pentru categoria Mâncare")

    # Relație inversă cu utilizatorul
    utilizator = relationship("User", back_populates="tranzactii")
