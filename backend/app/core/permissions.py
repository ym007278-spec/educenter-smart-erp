"""
EduCenter Smart ERP - Role-Based Access Control (RBAC) Guards
Enforces least-privilege security at the route dependency layer
"""
from typing import List, Set
from fastapi import HTTPException, status, Depends


class CurrentUserContext:
    def __init__(
        self,
        id: str,
        username: str,
        full_name: str,
        roles: List[str],
        permissions: Set[str],
        is_active: bool = True
    ):
        self.id = id
        self.username = username
        self.full_name = full_name
        self.roles = roles
        self.permissions = permissions
        self.is_active = is_active


class RequirePermission:
    """
    Route dependency that requires the authenticated user to possess a specific permission.
    Super Admins bypass granular checks automatically.
    """
    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    def __call__(self, current_user: CurrentUserContext):
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="الحساب معطل، يرجى مراجعة إدارة السنتر"
            )

        if "SUPER_ADMIN" in current_user.roles:
            return current_user

        if self.permission_code not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ليس لديك الصلاحية الكافية لإتمام هذا الإجراء [{self.permission_code}]"
            )

        return current_user


class RequireRole:
    """
    Route dependency that restricts access to specific functional roles (e.g. ['CENTER_MANAGER', 'ACCOUNTANT']).
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: CurrentUserContext):
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="الحساب معطل"
            )

        if "SUPER_ADMIN" in current_user.roles:
            return current_user

        if not any(role in self.allowed_roles for role in current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="دورك الوظيفي لا يسمح بالوصول لهذه الشاشة"
            )

        return current_user
