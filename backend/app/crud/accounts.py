from __future__ import annotations

import re

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas
from .utils import _normalize_text, _amount, _date_value, _datetime_value, _first_value, _rows_from, _id_key, _map_imported, _get_imported, _choice, _backup_root, _normalize_settings_backup, _normalize_account_backup, _normalize_employee_backup, _transaction_type_from_backup, _normalize_transaction_backup, utcnow




def list_accounts(db: Session) -> list[models.Account]:
    return db.query(models.Account).order_by(models.Account.name.asc()).all()


def get_account(db: Session, account_id: int) -> models.Account | None:
    return db.query(models.Account).filter(models.Account.id == account_id).first()


def get_account_by_name(db: Session, name: str) -> models.Account | None:
    return (
        db.query(models.Account)
        .filter(func.lower(models.Account.name) == name.lower())
        .first()
    )


def create_account(db: Session, payload: schemas.AccountCreate) -> models.Account:
    account = get_account_by_name(db, payload.name)
    if account:
        raise ValueError("An account with this name already exists")
    account = models.Account(
        name=_normalize_text(payload.name),
        account_type=payload.account_type,
        phone=_normalize_text(payload.phone),
        address=_normalize_text(payload.address),
        opening_balance_afn=_amount(payload.opening_balance_afn),
        opening_balance_usd=_amount(payload.opening_balance_usd),
        note=_normalize_text(payload.note),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(
    db: Session, account: models.Account, payload: schemas.AccountUpdate
) -> models.Account:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is None:
            continue
        if key == "account_type":
            setattr(account, key, value)
        else:
            setattr(
                account,
                key,
                (
                    _amount(value)
                    if key.startswith("opening_balance")
                    else _normalize_text(value)
                ),
            )
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account: models.Account) -> None:
    account.is_deleted = True
    db.commit()


