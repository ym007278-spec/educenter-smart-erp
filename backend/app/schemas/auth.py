"""
EduCenter Smart ERP - Authentication & RBAC Schemas (Pydantic v2)
Strict input validation with extra='forbid' to prevent Mass Assignment attacks
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoginRequest(BaseSchema):
    username_or_phone: str = Field(..., min_length=3, max_length=50, description="Username or mobile number")
    password: str = Field(..., min_length=6, max_length=100)


class TokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: UUID
    full_name: str
    roles: List[str]
    permissions: List[str]


class UserCreate(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    phone: str = Field(..., pattern=r"^01[0125][0-9]{8}$", description="Egyptian phone format e.g. 01012345678")
    full_name: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=8, max_length=100)
    role_ids: List[UUID]


class UserResponse(BaseSchema):
    id: UUID
    username: str
    phone: str
    email: Optional[str]
    full_name: str
    is_active: bool
    roles: List[str]
    created_at: datetime


class RoleCreate(BaseSchema):
    code: str = Field(..., pattern=r"^[A-Z0-9_]{3,50}$", description="e.g. CENTER_MANAGER")
    name_ar: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    permission_ids: List[UUID] = Field(default_factory=list)


class PermissionResponse(BaseSchema):
    id: UUID
    code: str
    name_ar: str
    module: str
    description: Optional[str]
