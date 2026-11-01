"""
EduCenter Smart ERP - Security, Encryption & Token Manager
Implements bcrypt (12 rounds), JWT tokens, and HMAC-SHA256 QR code signing
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
import hmac
import hashlib
import bcrypt
import jwt
from pydantic import ValidationError

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with 12 salt rounds."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generates a cryptographically signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "nbf": int(now.timestamp())
    }

    if claims:
        payload.update(claims)

    encoded_jwt = jwt.encode(
        payload,
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token. Raises exceptions on invalid/expired tokens."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("الجلسة منتهية الصلاحية، يرجى تسجيل الدخول مجدداً")
    except jwt.InvalidTokenError:
        raise ValueError("رمز التوثيق غير صالح أو تم التلاعب به")


def generate_student_qr_hmac(student_id: str, student_code: str) -> str:
    """
    Generates a tamper-proof HMAC-SHA256 cryptographic stamp for the student QR code.
    Ensures that QR cards cannot be forged or duplicated by students.
    """
    message = f"{student_id}:{student_code}".encode("utf-8")
    secret = settings.SECRET_KEY.get_secret_value().encode("utf-8")
    signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return signature


def verify_student_qr_hmac(student_id: str, student_code: str, provided_signature: str) -> bool:
    """Validates student QR signature using constant-time comparison to prevent timing attacks."""
    expected = generate_student_qr_hmac(student_id, student_code)
    return hmac.compare_digest(expected, provided_signature)
