from __future__ import annotations

import re

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas
from .utils import _normalize_text, _amount, _date_value, _datetime_value, _first_value, _rows_from, _id_key, _map_imported, _get_imported, _choice, _backup_root, _normalize_settings_backup, _normalize_account_backup, _normalize_employee_backup, _transaction_type_from_backup, _normalize_transaction_backup, utcnow




def _ensure_settings(db: Session) -> models.Setting:
    settings = db.query(models.Setting).first()
    if settings:
        return settings
    settings = models.Setting()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def get_settings(db: Session) -> models.Setting:
    return _ensure_settings(db)


def update_settings(db: Session, payload: schemas.SettingUpdate) -> models.Setting:
    settings = _ensure_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


