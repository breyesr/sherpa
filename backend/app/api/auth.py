from datetime import timedelta, datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.demo import DemoRequest
from app.schemas.user import UserCreate, UserResponse, Token, UserUpdate
from app.schemas.demo import DemoRequestCreate, DemoRequestResponse
from app.core.limiter import limiter


router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

from sqlalchemy.orm import selectinload

async def get_current_user(db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.business_profile))
    )
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

def require_feature(feature_key: str):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.business_profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        from app.core.constants import DEFAULT_FEATURES_CONFIG
        cfg = current_user.business_profile.features_config or DEFAULT_FEATURES_CONFIG
        
        if not cfg.get(feature_key, {}).get("enabled", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"El módulo '{feature_key}' no está habilitado para esta cuenta."
            )
        return current_user
    return dependency

def require_any_feature(feature_keys: list):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.business_profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        from app.core.constants import DEFAULT_FEATURES_CONFIG
        cfg = current_user.business_profile.features_config or DEFAULT_FEATURES_CONFIG
        
        has_any = any(cfg.get(key, {}).get("enabled", False) for key in feature_keys)
        if not has_any:
            features_label = " o ".join(f"'{k}'" for k in feature_keys)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Ninguno de los módulos requeridos ({features_label}) está habilitado para esta cuenta."
            )
        return current_user
    return dependency

@router.get("/me", response_model=UserResponse)
async def get_user_me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    if user_in.email:
        result = await db.execute(select(User).where(User.email == user_in.email))
        user = result.scalars().first()
        if user and user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_in.email
    
    if user_in.password:
        current_user.hashed_password = get_password_hash(user_in.password)
    
    db.add(current_user)
    await db.commit()
    # Refresh with eager load
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.business_profile))
    )
    return result.scalars().first()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Registration disabled"
    )

from uuid_extensions import uuid7str

@router.post("/request-demo", response_model=DemoRequestResponse)
async def request_demo(demo_in: DemoRequestCreate, db: AsyncSession = Depends(get_db)) -> Any:
    result = await db.execute(select(DemoRequest).where(DemoRequest.email == demo_in.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A demo request with this email has already been submitted."
        )
    
    demo = DemoRequest(
        id=uuid7str(),
        name=demo_in.name,
        business_name=demo_in.business_name,
        email=demo_in.email,
        phone_number=demo_in.phone_number,
        primary_use_case=demo_in.primary_use_case,
        status="pending",
        created_at=datetime.utcnow(),
    )

    db.add(demo)
    await db.commit()
    await db.refresh(demo)
    return demo



from fastapi.responses import Response

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_str = create_access_token(user.id, expires_delta=access_token_expires)
    
    # Set server-side HttpOnly cookie for enhanced security
    response.set_cookie(
        key="sherpa_token",
        value=token_str,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {
        "access_token": token_str,
        "token_type": "bearer",
    }

@router.post("/logout")
async def logout(response: Response) -> Any:
    """Clear the server-side HttpOnly sherpa_token cookie."""
    response.delete_cookie(
        key="sherpa_token",
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax"
    )
    return {"status": "success"}
