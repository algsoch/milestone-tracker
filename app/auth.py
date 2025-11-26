import os
import jwt
from datetime import datetime, timedelta
from functools import wraps
from fastapi import HTTPException, status, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel

# Pydantic models for authentication
class AdminLogin(BaseModel):
    email: str
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None

# API Key authentication
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
# JWT Bearer authentication
bearer_scheme = HTTPBearer(auto_error=False)

async def get_api_key(api_key: Optional[str] = Depends(api_key_header)):
    """Extract API key from headers"""
    return api_key

async def get_jwt_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    """Extract JWT token from Authorization header"""
    if credentials:
        return credentials.credentials
    return None

async def verify_admin_credentials(email: str, password: str) -> bool:
    """Verify admin email and password"""
    expected_email = os.getenv("ADMIN_EMAIL")
    expected_password = os.getenv("ADMIN_PASSWORD")
    
    if not expected_email or not expected_password:
        return False
    
    return email == expected_email and password == expected_password

def create_admin_token(email: str) -> str:
    """Create JWT token for admin session"""
    secret_key = os.getenv("JWT_SECRET_KEY", "default_secret_key")
    payload = {
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=24),  # Token expires in 24 hours
        "iat": datetime.utcnow(),
        "admin": True
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")

def verify_admin_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "default_secret_key")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# JWT Bearer token authentication
security = HTTPBearer()

async def verify_admin_access(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token for admin operations"""
    try:
        token = credentials.credentials
        payload = verify_admin_token(token)
        
        if not payload.get("admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return True
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

async def verify_admin_api_key(api_key: Optional[str] = Depends(get_api_key)):
    """Verify admin API key for write operations (alternative method)"""
    expected_key = os.getenv("ADMIN_API_KEY")
    
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin API key not configured"
        )
    
    if not api_key or api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Admin access required."
        )
    
    return True

def admin_required(func):
    """Decorator for admin-only endpoints"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # This decorator is used with the dependency injection above
        return await func(*args, **kwargs)
    return wrapper