# -*- coding: utf-8 -*-
from __future__ import annotations

"""System‑level backup & restore endpoints.

Provides:
* GET  /api/system/backup   → streams an encrypted, gzipped JSON snapshot.
* POST /api/system/restore → accepts an encrypted backup file, validates, decrypts,
                             decompresses and restores the database
                             inside a single DB transaction.

Only Super‑Admin users may call these endpoints (enforced via
`require_administrator_request`).

The implementation deliberately streams data to avoid loading the entire
snapshot into memory and uses AES‑GCM (via Fernet) for strong encryption.
Environment variables:
* BACKUP_ENCRYPTION_KEY – a 32‑byte base64 URL‑safe key (generated with
  `Fernet.generate_key()`).
* BACKUP_MAX_SIZE_MB   – optional safety limit (default 100 MiB) for uploaded
  backup files.
"""

import io
import json
import os
import gzip
import logging
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------
# Encryption helpers – Fernet (AES‑256 in CBC + HMAC) from the `cryptography`
# library.  This is a zero‑dependency extra on top of FastAPI, but is
# lightweight and safe for backup data.
# ---------------------------------------------------------------------
try:
    from cryptography.fernet import Fernet, InvalidToken
except Exception as exc:  # pragma: no cover
    raise RuntimeError(
        "Missing optional dependency `cryptography`. Install with "
        "`pip install cryptography`"
    ) from exc

# ---------------------------------------------------------------------
# Application imports
# ---------------------------------------------------------------------
from .. import models
from ..crud import backups as crud_backups
from ..auth_dependencies import require_administrator_request
from ..database import SessionLocal

router = APIRouter(prefix="/api/system", tags=["system"])


def _get_fernet() -> Fernet:
    """Return a Fernet instance built from the env key.

    The key must be a 32‑byte base64‑url‑safe string.
    """
    key = os.getenv("BACKUP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "Encryption key not configured – set BACKUP_ENCRYPTION_KEY in the "
            "environment."
        )
    try:
        return Fernet(key.encode())
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Invalid BACKUP_ENCRYPTION_KEY – it must be a base64 url‑safe "
            "32‑byte value created via `Fernet.generate_key()`."
        ) from exc


def _encrypt(data: bytes) -> bytes:
    """Encrypt raw bytes with Fernet."""
    f = _get_fernet()
    return f.encrypt(data)


def _decrypt(token: bytes) -> bytes:
    """Decrypt Fernet token, raising HTTPException on failure."""
    f = _get_fernet()
    try:
        return f.decrypt(token)
    except InvalidToken as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backup file decryption failed – invalid key or corrupted data.",
        ) from exc


def _gzip_compress(data: bytes) -> bytes:
    """Return gzip‑compressed representation of `data`."""
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb") as gz:
        gz.write(data)
    return out.getvalue()


def _gzip_decompress(data: bytes) -> bytes:
    """Decompress gzip data, raising HTTPException on failure."""
    try:
        in_buf = io.BytesIO(data)
        with gzip.GzipFile(fileobj=in_buf, mode="rb") as gz:
            return gz.read()
    except OSError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backup file decompression failed – not valid gzip.",
        ) from exc


def _stream_encrypted_backup(db: Session) -> AsyncGenerator[bytes, None]:
    """Yield the encrypted‑gzip snapshot in one chunk (still streaming)."""
    payload = crud_backups.backup_payload(db)
    json_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    compressed = _gzip_compress(json_bytes)
    encrypted = _encrypt(compressed)
    yield encrypted


@router.get(
    "/backup",
    dependencies=[Depends(require_administrator_request)],
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
)
def download_backup(db: Session = Depends(SessionLocal)):
    """Stream an encrypted, gzipped JSON backup.

    The filename includes a UTC timestamp for easy identification.
    """
    filename = f"cashbook_backup_{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.gz"
    return StreamingResponse(
        _stream_encrypted_backup(db),
        media_type="application/octet-stream",
        headers={"Content‑Disposition": f'attachment; filename="{filename}"'},
    )


MAX_UPLOAD_SIZE_MB = int(os.getenv("BACKUP_MAX_SIZE_MB", "100"))


@router.post(
    "/restore",
    dependencies=[Depends(require_administrator_request)],
    status_code=status.HTTP_200_OK,
)
async def restore_backup(
    file: UploadFile = File(...),
    db: Session = Depends(SessionLocal),
):
    """Accept an encrypted backup, validate, decrypt, decompress and restore.

    The operation runs inside a single DB transaction.  Any failure rolls
    back the whole restore, guaranteeing atomicity.
    """
    # 1️⃣ Validate size
    file_size = 0
    contents = bytearray()
    async for chunk in file.iter_chunks():
        file_size += len(chunk)
        if file_size > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Backup file exceeds maximum allowed size of {MAX_UPLOAD_SIZE_MB} MiB.",
            )
        contents.extend(chunk)

    encrypted_blob = bytes(contents)

    # 2️⃣ Decrypt → Decompress
    decrypted = _decrypt(encrypted_blob)
    json_payload_bytes = _gzip_decompress(decrypted)

    # 3️⃣ Parse JSON
    try:
        payload = json.loads(json_payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backup file is not valid JSON after decryption/decompression.",
        ) from exc

    # 4️⃣ Perform restore inside a DB transaction
    try:
        result = crud_backups.import_backup(db, payload, replace_all=True)
        db.commit()
    except Exception as exc:  # pragma: no cover
        db.rollback()
        logging.exception("Backup restore failed")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Backup restore failed: {exc}",
        ) from exc

    return {"ok": True, "detail": "Database restored successfully", "result": result}
