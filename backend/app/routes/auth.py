# cspell:ignore hashpw gensalt checkpw
from __future__ import annotations


from datetime import datetime, timedelta
from secrets import token_urlsafe
import string
import random

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal, get_tenant_session
from ..auth_dependencies import (
    create_access_token,
    require_authenticated_request,
    require_administrator_request,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

LOCK_AFTER_ATTEMPTS = 5
LOCK_MINUTES = 15
OLD_DEFAULT_PASSWORD = "admin123"
TEMPORARY_DEFAULT_PASSWORD = "Admin@123"
LEGACY_DEFAULT_PASSWORDS = (OLD_DEFAULT_PASSWORD, TEMPORARY_DEFAULT_PASSWORD)


def get_db(request: Request = None):
    db = get_tenant_session(request)
    try:
        flag_legacy_default_admin(db)
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def validate_strong_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=422, detail="Password must be at least 8 characters long"
        )
    if not any(char.isupper() for char in password):
        raise HTTPException(
            status_code=422, detail="Password must include an uppercase letter"
        )
    if not any(char.islower() for char in password):
        raise HTTPException(
            status_code=422, detail="Password must include a lowercase letter"
        )
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=422, detail="Password must include a number")
    if not any(not char.isalnum() for char in password):
        raise HTTPException(status_code=422, detail="Password must include a symbol")
    if password in LEGACY_DEFAULT_PASSWORDS:
        raise HTTPException(
            status_code=422,
            detail="Choose a new password. Default passwords are not allowed",
        )


def public_user(user: models.User) -> schemas.UserPublic:
    return schemas.UserPublic.model_validate(user)


def audit(
    db: Session,
    action: str,
    status: str,
    username: str = "",
    user_id: int | None = None,
    detail: str = "",
) -> None:
    try:
        db.add(
            models.AuditLog(
                action=action,
                status=status,
                username=username,
                user_id=user_id,
                detail=detail,
            )
        )
    except Exception:
        pass


def flag_legacy_default_admin(db: Session) -> None:
    try:
        admin = (
            db.query(models.User)
            .filter(func.lower(models.User.username) == "admin")
            .first()
        )
        if not admin:
            return
        if verify_password(OLD_DEFAULT_PASSWORD, admin.password_hash):
            admin.password_hash = hash_password(TEMPORARY_DEFAULT_PASSWORD)
            admin.must_change_password = True
            audit(
                db,
                "force_password_change",
                "success",
                "admin",
                admin.id,
                "Old default administrator password migrated",
            )
            db.commit()
            return
        if not admin.must_change_password and verify_password(
            TEMPORARY_DEFAULT_PASSWORD, admin.password_hash
        ):
            admin.must_change_password = True
            audit(
                db,
                "force_password_change",
                "success",
                "admin",
                admin.id,
                "Temporary administrator password detected",
            )
            db.commit()
    except Exception:
        db.rollback()


def current_user(db: Session, token: str | None) -> models.User | None:
    # Deprecated for new JWT auth
    pass


def require_admin(db: Session, token: str | None) -> models.User:
    # Deprecated for new JWT auth
    pass


def generated_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%*?"
    password = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%*?"),
    ]
    password.extend(random.choice(alphabet) for _ in range(max(length - 4, 4)))
    random.shuffle(password)
    return "".join(password)


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    try:
        users = db.query(models.User).order_by(models.User.full_name.asc()).all()
        active_users = [user for user in users if user.is_active]
        return {
            "status": "online",
            "enabled": True,
            "mode": "multi-user",
            "setup_required": len(active_users) == 0,
            "lock_after_attempts": LOCK_AFTER_ATTEMPTS,
            "users": [public_user(user).model_dump() for user in active_users],
        }
    except Exception:
        return {
            "status": "online",
            "enabled": True,
            "mode": "multi-user",
            "setup_required": False,
            "lock_after_attempts": LOCK_AFTER_ATTEMPTS,
            "users": [],
        }


@router.post("/setup", response_model=schemas.LoginResponse, status_code=201)
def setup_owner(payload: schemas.SetupRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.is_active == True).count():
        raise HTTPException(status_code=409, detail="Setup is already completed")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    validate_strong_password(payload.password)
    username = payload.username.strip() or "admin"
    if (
        db.query(models.User)
        .filter(func.lower(models.User.username) == username.lower())
        .first()
    ):
        raise HTTPException(status_code=409, detail="Username already exists")
    now = datetime.utcnow()
    user = models.User(
        full_name=payload.full_name.strip() or "Administrator",
        username=username,
        password_hash=hash_password(payload.password),
        role="Administrator",
        avatar_path=payload.avatar_path or "",
        is_active=True,
        must_change_password=False,
        password_changed_at=now,
        last_login=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "assigned_group_id": user.assigned_group_id,
            "assigned_branch_id": user.assigned_branch_id,
        },
        expires_delta=timedelta(days=1),
    )
    audit(db, "setup_admin", "success", user.username, user.id, "Owner setup completed")
    try:
        db.commit()
    except Exception:
        db.rollback()
    return {
        "token": access_token,
        "expires_at": now + timedelta(days=1),
        "user": public_user(user),
        "must_change_password": False,
    }


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    username_clean = payload.username.strip()
    user = (
        db.query(models.User)
        .filter(func.lower(models.User.username) == username_clean.lower())
        .first()
    )
    now = datetime.utcnow()
    if not user:
        audit(db, "login", "failed", username_clean, detail="Unknown username")
        try:
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        audit(db, "login", "failed", user.username, user.id, "Inactive account")
        try:
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=403, detail="This account is inactive")
    if user.locked_until and user.locked_until > now:
        audit(db, "login", "locked", user.username, user.id, "Locked account")
        try:
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(
            status_code=423, detail="Account locked after too many failed attempts"
        )
    if not verify_password(payload.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= LOCK_AFTER_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
        audit(
            db,
            "login",
            "failed",
            user.username,
            user.id,
            f"Failed attempts: {user.failed_attempts}",
        )
        try:
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = now
    expires_delta = timedelta(days=14 if payload.remember_user else 1)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "assigned_group_id": user.assigned_group_id,
            "assigned_branch_id": user.assigned_branch_id,
        },
        expires_delta=expires_delta,
    )
    audit(db, "login", "success", user.username, user.id)
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
    return {
        "token": access_token,
        "expires_at": now + expires_delta,
        "user": public_user(user),
        "must_change_password": user.must_change_password,
    }


@router.post("/change-password", response_model=schemas.UserPublic)
def change_password(
    payload: schemas.ChangePasswordRequest,
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    user = db.merge(user)
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    if not verify_password(payload.current_password, user.password_hash):
        audit(
            db,
            "change_password",
            "failed",
            user.username,
            user.id,
            "Incorrect current password",
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    validate_strong_password(payload.new_password)
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=422,
            detail="New password must be different from the current password",
        )
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    user.password_changed_at = datetime.utcnow()
    user.failed_attempts = 0
    user.locked_until = None
    audit(db, "change_password", "success", user.username, user.id)
    db.commit()
    db.refresh(user)
    return public_user(user)


@router.post("/logout")
def logout(
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    # Since JWT is stateless, logout is handled by frontend dropping the token
    return {"message": "Logged out"}


@router.get("/me", response_model=schemas.UserPublic)
def me(user: models.User = Depends(require_authenticated_request)):
    return public_user(user)


@router.get("/users", response_model=list[schemas.UserPublic])
def list_users(
    admin: models.User = Depends(require_administrator_request),
    db: Session = Depends(get_db),
):
    return [
        public_user(user)
        for user in db.query(models.User).order_by(models.User.full_name.asc()).all()
    ]


@router.post("/users", response_model=schemas.UserPublic, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    admin: models.User = Depends(require_administrator_request),
    db: Session = Depends(get_db),
):
    full_name = payload.full_name.strip()
    username = payload.username.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Full Name is required")
    if not username:
        raise HTTPException(status_code=422, detail="Username is required")
    if (
        db.query(models.User)
        .filter(func.lower(models.User.username) == username.lower())
        .first()
    ):
        raise HTTPException(status_code=409, detail="Username already exists")
    validate_strong_password(payload.password)
    user = models.User(
        full_name=full_name,
        username=username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        avatar_path=payload.avatar_path or "",
        is_active=payload.is_active,
    )
    db.add(user)
    audit(db, "create_user", "success", admin.username, admin.id, payload.username)
    db.commit()
    db.refresh(user)
    return public_user(user)


@router.put("/users/{user_id}", response_model=schemas.UserPublic)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    admin: models.User = Depends(require_administrator_request),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(
            status_code=400, detail="You cannot disable your own account"
        )
    removing_admin = user.role == "Administrator" and (
        data.get("is_active") is False or data.get("role", user.role) != "Administrator"
    )
    if removing_admin:
        other_admins = (
            db.query(models.User)
            .filter(
                models.User.id != user.id,
                models.User.role == "Administrator",
                models.User.is_active == True,
            )
            .count()
        )
        if not other_admins:
            raise HTTPException(
                status_code=400, detail="At least one active administrator is required"
            )
    if (
        "full_name" in data
        and data["full_name"] is not None
        and not data["full_name"].strip()
    ):
        raise HTTPException(status_code=422, detail="Full Name is required")
    if "username" in data and data["username"] is not None:
        data["username"] = data["username"].strip()
        if not data["username"]:
            raise HTTPException(status_code=422, detail="Username is required")
        existing = (
            db.query(models.User)
            .filter(
                func.lower(models.User.username) == data["username"].lower(),
                models.User.id != user_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
    for key, value in data.items():
        if value is not None:
            setattr(user, key, value.strip() if isinstance(value, str) else value)
    user.updated_at = datetime.utcnow()
    if user.is_active is False:
        db.query(models.UserSession).filter(
            models.UserSession.user_id == user.id
        ).update({"is_active": False})
    audit(db, "update_user", "success", admin.username, admin.id, user.username)
    db.commit()
    db.refresh(user)
    return public_user(user)


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: schemas.PasswordReset,
    admin: models.User = Depends(require_administrator_request),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_password = payload.password or generated_password()
    validate_strong_password(new_password)
    user.password_hash = hash_password(new_password)
    user.must_change_password = True
    user.failed_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id).update(
        {"is_active": False}
    )
    audit(db, "reset_password", "success", admin.username, admin.id, user.username)
    db.commit()
    return {"ok": True, "password": new_password if not payload.password else None}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: models.User = Depends(require_administrator_request),
    db: Session = Depends(get_db),
):
    if admin.id == user_id:
        raise HTTPException(
            status_code=400, detail="You cannot delete your own account"
        )
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "Administrator":
        other_admins = (
            db.query(models.User)
            .filter(
                models.User.id != user.id,
                models.User.role == "Administrator",
                models.User.is_active == True,
            )
            .count()
        )
        if not other_admins:
            raise HTTPException(
                status_code=400, detail="At least one active administrator is required"
            )
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id).delete()
    audit(db, "delete_user", "success", admin.username, admin.id, user.username)
    db.delete(user)
    db.commit()
    return {"ok": True}
