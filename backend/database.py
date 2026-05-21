from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL-ul bazei de date SQLite locale
SQLALCHEMY_DATABASE_URL = "sqlite:///./finante.db"

# Crearea motorului de bază de date.
# Argumentul connect_args={"check_same_thread": False} este necesar doar pentru SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Sesiune locală pentru interacțiunea cu baza de date
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clasa de bază pentru declararea modelelor ORM
Base = declarative_base()

# Dependență pentru obținerea sesiunii bazei de date în endpoint-uri
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
