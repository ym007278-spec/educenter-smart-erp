"""
EduCenter Smart ERP - Route Dependencies & Authentication Injections
"""
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_access_token
from app.core.permissions import CurrentUserContext

# OAuth2 scheme extracting Bearer token from HTTP Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> CurrentUserContext:
    """
    Extracts and validates JWT Bearer token, then resolves user context with roles and permissions.
    """
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="رمز التوثيق مفقود أو غير مكتمل"
            )

        roles = payload.get("roles", [])
        permissions = set(payload.get("permissions", []))
        username = payload.get("username", "user")
        full_name = payload.get("full_name", "User")
        is_active = payload.get("is_active", True)

        return CurrentUserContext(
            id=user_id,
            username=username,
            full_name=full_name,
            roles=roles,
            permissions=permissions,
            is_active=is_active
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_active_user(
    current_user: CurrentUserContext = Depends(get_current_user)
) -> CurrentUserContext:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="الحساب غير نشط، يرجى التواصل مع مسؤول النظام"
        )
    return current_user
