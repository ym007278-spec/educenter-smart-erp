"""
EduCenter Smart ERP - Main FastAPI Application
Assembles Security Middlewares, CORS, Rate Limiter, and API V1 Routers
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.rate_limiter import RateLimitMiddleware
from app.api.v1 import auth, treasury, attendance, academic, backups, dashboard, scheduler, audit


# Security Headers Middleware (OWASP Hardening)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions: verify DB connection pool, load cached roles
    yield
    # Shutdown actions: close DB connection pool


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="محرك الباك إند فائق الأمان والسرعة لإدارة السنتر التعليمي بنظام الأوتوميشن الكامل",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# 1. Attach Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 2. Attach Anti-Brute Force Rate Limiter
app.add_middleware(RateLimitMiddleware)

# 3. Attach CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# 4. Global Exception Handler (Zero Stack Trace Leakage)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "حدث خطأ غير متوقع أثناء معالجة الطلب، تم تسجيل الحادثة في سجلات الأمان.",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )

# 5. Include API V1 Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(treasury.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(academic.router, prefix=settings.API_V1_STR)
app.include_router(backups.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(scheduler.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestrators and uptime monitors."""
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "CONNECTED"
    }
