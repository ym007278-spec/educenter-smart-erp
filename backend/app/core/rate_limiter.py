"""
EduCenter Smart ERP - Rate Limiting & Anti-Brute Force Protection
Protects authentication and treasury cash endpoints using an in-memory/Redis sliding window
"""
import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter with IP tracking.
    In distributed multi-server clusters, Redis Token Bucket is used instead.
    """
    def __init__(self):
        # Key: (ip, route_prefix), Value: list of timestamps
        self.requests: Dict[Tuple[str, str], list[float]] = {}

    def is_allowed(self, client_ip: str, route_key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        key = (client_ip, route_key)
        
        # Clean older requests outside the sliding window
        window_start = now - window_seconds
        timestamps = self.requests.get(key, [])
        valid_timestamps = [t for t in timestamps if t > window_start]

        if len(valid_timestamps) >= max_requests:
            return False

        valid_timestamps.append(now)
        self.requests[key] = valid_timestamps
        return True


limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # 1. Rate limit login endpoint against Brute Force (Max 5 attempts / minute)
        if path.endswith("/auth/login") and request.method == "POST":
            if not limiter.is_allowed(client_ip, "auth_login", max_requests=settings.RATE_LIMIT_LOGIN_MAX, window_seconds=60):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "تم تجاوز الحد المسموح لمحاولات تسجيل الدخول. يرجى الانتظار دقيقة واحدة والمحاولة مجدداً.",
                        "error_code": "RATE_LIMIT_EXCEEDED"
                    }
                )

        # 2. Rate limit treasury payments against accidental double submission (Max 30 / minute)
        if "/treasury/payments" in path and request.method == "POST":
            if not limiter.is_allowed(client_ip, "treasury_payments", max_requests=settings.RATE_LIMIT_TREASURY_MAX, window_seconds=60):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "عدد طلبات السداد مرتفع جداً في وقت متزامن. يرجى الانتظار قليلاً.",
                        "error_code": "RATE_LIMIT_EXCEEDED"
                    }
                )

        response = await call_next(request)
        return response
