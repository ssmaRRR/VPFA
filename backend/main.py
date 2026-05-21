from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import auth_router, transaction_router, ml_router

# Inițializăm tabelele bazei de date SQLite la pornirea aplicației
# (Dacă tabelele nu există, ele vor fi create automat)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Asistent Virtual de Finanțe Personale (VPFA) API",
    description="API-ul pentru tema de licență VPFA - include autentificare, CRUD tranzacții și servicii de Machine Learning (detecție anomalii, prognoză și alocare active).",
    version="1.0.0"
)

# Configurăm regulile CORS (Cross-Origin Resource Sharing)
# Acest lucru este esențial pentru a permite aplicației React (care rulează pe alt port) să facă cereri către API.
origins = [
    "http://localhost:5173", # Portul standard React + Vite
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Înregistrăm routerele cu prefixul '/api'
app.include_router(auth_router.router, prefix="/api")
app.include_router(transaction_router.router, prefix="/api")
app.include_router(ml_router.router, prefix="/api")

@app.get("/")
def read_root():
    """Ruta rădăcină - oferă detalii despre serviciu."""
    return {
        "status": "online",
        "mesaj": "API-ul Asistentului Virtual de Finanțe Personale este funcțional și activ.",
        "documentatie": "/docs"
    }
