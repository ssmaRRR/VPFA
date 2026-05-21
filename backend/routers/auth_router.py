from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Autentificare"]
)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Înregistrează un utilizator nou în sistem cu parola criptată."""
    # Verificăm dacă emailul există deja
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acest e-mail este deja înregistrat în sistem."
        )
        
    hashed_pwd = auth.get_password_hash(user_in.password)
    
    db_user = models.User(
        nume=user_in.nume,
        email=user_in.email,
        hashed_password=hashed_pwd,
        varsta=user_in.varsta,
        venit_lunar=user_in.venit_lunar,
        toleranta_risc=user_in.toleranta_risc,
        obiectiv_economii=user_in.obiectiv_economii
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Ruta standard de autentificare OAuth2. 
    Așteaptă câmpurile 'username' (care este e-mailul) și 'password' ca date de formular.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail sau parolă incorectă.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    """Returnează profilul utilizatorului autentificat curent."""
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_user_profile(
    profile_update: schemas.UserUpdate, 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizează datele de profil ale utilizatorului curent (inclusiv datele folosite în ML)."""
    update_data = profile_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
        
    # Dacă s-au schimbat parametrii care afectează clustering-ul de investiții, 
    # se va recalcula automat profilul la prima vizită pe pagina respectivă.
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
