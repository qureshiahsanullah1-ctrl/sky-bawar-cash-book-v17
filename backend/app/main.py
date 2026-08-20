# cspell:ignore Vite Vercel jose uvicorn pylint sqlalchemy jose JWTError
"""Main entry point for the SKY Cash Book FastAPI application."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
import uuid
import asyncio
import os
import shutil

from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import crud, models, models_plastic  # noqa: F401
from .auth_dependencies import ALGORITHM, SECRET_KEY, require_administrator_request
from .config import APP_NAME
from .database import (
    Base,
    SessionLocal,
    _check_is_vercel,
    engine,
    ensure_company_schema,
    ensure_payroll_schema,
    ensure_sqlite_schema,
    ensure_user_schema,
    get_db,
)
from .routes import (
    accounts,
    auth,
    backup,
    bawar_star,
    cashbook,
    employees,
    iot_telemetry,
    neon_auth,
    plastic_erp,
    reports,
    settings,
    system,
    transactions,
    transport,
)

async def database_backup_task():
    """Background task to back up the SQLite database daily."""
    while True:
        try:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            db_path = os.path.join(root_dir, "cashbook.db")
            if os.path.exists(db_path):
                backup_dir = os.path.join(root_dir, "backups")
                os.makedirs(backup_dir, exist_ok=True)
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                backup_path = os.path.join(backup_dir, f"cashbook_backup_{timestamp}.db")
                shutil.copy2(db_path, backup_path)
                logger.info(f"Automated daily backup completed: {backup_path}")
                
                # Keep only last 7 backups to save space
                backups = sorted([os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.startswith("cashbook_backup_")])
                for old_backup in backups[:-7]:
                    os.remove(old_backup)
        except Exception as e:
            logger.error(f"Automated backup failed: {e}")
        
        # Wait 24 hours
        await asyncio.sleep(24 * 60 * 60)

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Seed default settings on application startup and start background tasks."""
    db = SessionLocal()
    try:
        if not db.query(models.Setting).first():
            db.add(models.Setting())
            db.commit()
    except Exception as exc:
        logger.warning(f"Initial seed notice: {exc}")
    finally:
        db.close()
    
    # Start backup task only in persistent/non-serverless environments
    backup_task = None
    if not _check_is_vercel():
        backup_task = asyncio.create_task(database_backup_task())
    
    yield
    
    # Cancel backup task on shutdown if active
    if backup_task:
        backup_task.cancel()


app = FastAPI(title=APP_NAME, lifespan=lifespan)
logger = logging.getLogger("cashbook")

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com data: blob:; "
            "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https: http: ws: wss:;"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

try:
    getattr(Base, "metadata").create_all(bind=engine)
    ensure_sqlite_schema()
    ensure_user_schema()
    ensure_payroll_schema()
    ensure_company_schema()
except Exception as schema_exc:
    logger.warning("Database schema initialization notice: %s", schema_exc)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and log details."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "error_type": "RequestValidationError",
        "detail": exc.errors(),
    }
    logger.warning("Validation Error: %s", json.dumps(log_data))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "request_id": request_id},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions and log details."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "error_type": "HTTPException",
        "status_code": exc.status_code,
        "detail": exc.detail,
    }
    logger.error("HTTP Error: %s", json.dumps(log_data))
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handle general unhandled exceptions and log tracebacks."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "error_type": exc.__class__.__name__,
        "message": str(exc),
    }
    logger.exception("Unhandled Exception: %s", json.dumps(log_data))
    err_detail = str(exc).strip() or f"{exc.__class__.__name__} occurred"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Server error ({exc.__class__.__name__}): {err_detail}", "request_id": request_id},
    )


@app.middleware("http")
async def request_logging(request: Request, call_next):
    """Log request errors and assign tracking IDs to responses."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    try:
        response = await call_next(request)
    except Exception:  # pylint: disable=broad-except
        logger.exception(
            "Unhandled request error",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            },
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/", include_in_schema=False)
def root():
    """Serve the built frontend if available; never return a raw 404 at root.

    In development the Vite dev server (port 5173) serves the UI and proxies
    /api requests here, so this route is only hit when the backend is accessed
    directly. In production, Vercel routes non-/api paths to the static build.
    """
    from pathlib import Path
    from fastapi.responses import FileResponse

    dist_index = (
        Path(__file__).resolve().parents[2] / "frontend" / "dist" / "index.html"
    )
    if dist_index.is_file():
        return FileResponse(dist_index)
    return JSONResponse(
        {
            "service": APP_NAME,
            "status": "online",
            "message": (
                "API backend. The web UI is served by the frontend dev "
                "server (Vite) or the static production build."
            ),
            "health": "/api/health",
        }
    )





@app.get("/health")
@app.get("/api/health")
@app.get("/api/status")
def health(
    request: Request = None,
    x_session_token: str | None = Header(default=None),
):
    """Retrieve service health, check DB, and show current user session."""
    is_cloud = bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        or os.environ.get("K_SERVICE")
    )
    port_val = str(request.url.port) if request and request.url.port else "N/A"

    db_engine_name = "SQLite"
    try:
        url_str = str(engine.url)
        if "postgres" in url_str or "pg8000" in url_str:
            db_engine_name = "PostgreSQL"
    except Exception:
        pass

    payload = {
        "backend": "online",
        "database": "unknown",
        "api": "ok",
        "auth": "unknown",
        "status": "ok",
        "version": "2.1.0",
        "port": port_val,
        "environment": "Vercel Serverless" if os.environ.get("VERCEL") else ("Cloud Production" if is_cloud else "Local Development"),
        "database_engine": db_engine_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "currentUser": None,
    }
    db = SessionLocal()
    try:
        db.execute(text("select 1"))
        payload["database"] = "connected"
        payload["auth"] = "ready"
        auth_header = request.headers.get("Authorization") if request else None
        is_bearer = auth_header and auth_header.startswith("Bearer ")
        token = auth_header.split(" ")[1] if is_bearer else x_session_token
        if token:
            try:
                jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                username = jwt_payload.get("sub")
                if username:
                    user = (
                        db.query(models.User)
                        .filter(models.User.username == username)
                        .first()
                    )
                    if user:
                        payload["currentUser"] = {
                            "id": user.id,
                            "username": user.username,
                            "full_name": user.full_name or user.username,
                            "role": user.role,
                            "assigned_group_id": user.assigned_group_id,
                            "assigned_branch_id": user.assigned_branch_id,
                        }
            except JWTError:
                pass
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Health check failed")
        payload.update(
            {
                "database": "disconnected",
                "auth": "unavailable",
                "status": "error",
                "error": f"Database not connected: {exc}",
            }
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload
        )
    finally:
        db.close()
    return payload


@app.get("/health/database")
def health_database():
    """Verify raw database connection health."""
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    return {"status": "healthy", "database": "connected"}


@app.get("/health/auth")
def health_auth():
    """Check user database auth system health and count."""
    db = SessionLocal()
    try:
        users = db.query(models.User).count()
        return {"status": "healthy", "auth": "ready", "users": users}
    finally:
        db.close()


# Register all routers
app.include_router(transactions.router)
app.include_router(accounts.router)
app.include_router(employees.router)
app.include_router(settings.router)
app.include_router(backup.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(neon_auth.router)
app.include_router(bawar_star.router)
app.include_router(transport.router)
app.include_router(plastic_erp.router)
app.include_router(iot_telemetry.router)
app.include_router(cashbook.router)
app.include_router(system.router)


@app.post(
    "/api/import-master-excel", dependencies=[Depends(require_administrator_request)]
)
async def direct_import_master_excel(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    filename = file.filename or "master-excel.xlsx"
    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .xlsx and .xls files are supported.",
        )

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413, detail="Excel file size exceeds 50MB limit."
        )

    try:
        return crud.import_master_excel(db, contents, filename)
    except Exception as error:
        raise HTTPException(
            status_code=422, detail=f"Master Excel import failed: {error}"
        ) from error


from pathlib import Path
from fastapi.staticfiles import StaticFiles

is_vercel_env = _check_is_vercel()
uploads_dir = Path("/tmp/uploads" if is_vercel_env else "uploads")
try:
    uploads_dir.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

if uploads_dir.exists():
    try:
        app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
    except Exception as mount_err:
        logger.warning("StaticFiles /uploads mount notice: %s", mount_err)


@app.post("/api/upload")
async def upload_media_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = uploads_dir / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"url": f"/uploads/{filename}", "filename": filename}
    except Exception as write_err:
        logger.warning("Filesystem upload fallback: %s", write_err)
        try:
            file.file.seek(0)
            contents = await file.read()
            import base64
            mime = file.content_type or "image/jpeg"
            data_url = f"data:{mime};base64,{base64.b64encode(contents).decode('utf-8')}"
            return {"url": data_url, "filename": filename}
        except Exception as read_err:
            raise HTTPException(status_code=500, detail=f"Upload failed: {read_err}")
