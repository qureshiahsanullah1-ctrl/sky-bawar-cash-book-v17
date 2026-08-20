from __future__ import annotations

import re
import uuid

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas
from .accounts import get_account, get_account_by_name

from .utils import _normalize_text, _amount, _date_value, _datetime_value, _first_value, _rows_from, _id_key, _map_imported, _get_imported, _choice, _backup_root, _normalize_settings_backup, _normalize_account_backup, _normalize_employee_backup, _transaction_type_from_backup, _normalize_transaction_backup, utcnow




def list_transactions(db: Session) -> list[models.Transaction]:
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.is_deleted == False)
        .order_by(models.Transaction.date.asc(), models.Transaction.id.asc())
        .all()
    )


def get_transaction(
    db: Session, transaction_id: int, user: models.User | None = None
) -> models.Transaction | None:
    query = db.query(models.Transaction).filter(models.Transaction.id == transaction_id)
    if user and user.role not in ["Administrator", "Super Admin"]:
        if user.assigned_branch_id is not None:
            query = query.filter(
                models.Transaction.branch_id == user.assigned_branch_id
            )
        elif user.assigned_group_id is not None:
            group_branch_ids = [
                b.id
                for b in db.query(models.Branch)
                .filter(models.Branch.group_id == user.assigned_group_id)
                .all()
            ]
            query = query.filter(models.Transaction.branch_id.in_(group_branch_ids))
    return query.first()


def _cash_to_afn(payload: schemas.TransactionBase) -> float:
    if payload.cash_in_afn or payload.cash_out_afn:
        return _amount(payload.cash_in_afn or payload.cash_out_afn)
    if payload.usd_in or payload.usd_out:
        usd_amount = _amount(payload.usd_in or payload.usd_out)
        return round(usd_amount * _amount(payload.exchange_rate), 2)
    return 0.0


def _afn_to_usd(amount_afn: float, rate: float) -> float:
    return (
        round(_amount(amount_afn) / _amount(rate), 2)
        if _amount(amount_afn) and _amount(rate)
        else 0.0
    )


def _next_transaction_no(db: Session, transaction_date: date | str | None) -> str:
    parsed_date = date.today()
    if isinstance(transaction_date, date):
        parsed_date = transaction_date
    elif transaction_date:
        try:
            s = str(transaction_date).split("T")[0].replace("/", "-")
            parts = [int(p) for p in s.split("-") if p.isdigit()]
            if len(parts) == 3:
                if parts[0] > 1900:
                    parsed_date = date(parts[0], parts[1], parts[2])
                elif parts[2] > 1900:
                    parsed_date = date(parts[2], parts[0], parts[1])
        except Exception:
            parsed_date = date.today()

    prefix = parsed_date.strftime("TX-%Y%m%d")
    try:
        existing = (
            db.query(models.Transaction.transaction_no)
            .filter(models.Transaction.transaction_no.like(f"{prefix}-%"))
            .all()
        )
        sequences = []
        for (number,) in existing:
            try:
                sequences.append(int(str(number).rsplit("-", 1)[-1]))
            except (TypeError, ValueError):
                continue
        seq = max(sequences, default=0) + 1
    except Exception:
        seq = int(datetime.now().timestamp() * 1000) % 10000

    return f"{prefix}-{seq:04d}"


def _validate_transaction(payload: schemas.TransactionBase) -> None:
    values = [
        payload.cash_in_afn,
        payload.cash_out_afn,
        payload.usd_in,
        payload.usd_out,
        payload.exchange_rate,
    ]
    if any(_amount(value) < 0 for value in values):
        raise ValueError("Amounts cannot be negative")
    usd_amount = _amount(payload.usd_in or payload.usd_out)
    afn_amount = _amount(payload.cash_in_afn or payload.cash_out_afn)
    if afn_amount <= 0 and usd_amount <= 0:
        raise ValueError("At least one amount is required")
    if usd_amount > 0 and _amount(payload.exchange_rate) <= 0:
        raise ValueError("Exchange rate is required when USD is entered")


def create_transaction(
    db: Session, payload: schemas.TransactionCreate
) -> models.Transaction:
    _validate_transaction(payload)
    amount_afn = _cash_to_afn(payload)
    derived_usd = _afn_to_usd(amount_afn, payload.exchange_rate)
    employee = (
        db.query(models.Employee)
        .filter(models.Employee.id == payload.employee_id)
        .first()
        if payload.employee_id
        else None
    )
    if payload.employee_id and not employee:
        raise ValueError("Employee not found")
    if employee and payload.transaction_type != "cash_out":
        raise ValueError("Employee salary payments must be Cash Out")
    account = get_account(db, payload.account_id) if payload.account_id else None
    if employee:
        account = employee.account
    target_name = (_normalize_text(payload.account_name) or _normalize_text(payload.detail) or "General Account")[:250]
    if not account:
        account = get_account_by_name(db, target_name)
    if not account:
        account = models.Account(
            name=target_name,
            opening_balance_afn=0,
            opening_balance_usd=0,
            company_id=(getattr(payload, "company_id", None) or "bawar-star")
        )
        db.add(account)
        try:
            db.commit()
            db.refresh(account)
        except Exception:
            db.rollback()
            account = get_account_by_name(db, target_name)
            if not account:
                unique_fallback_name = f"{target_name[:240]} ({uuid.uuid4().hex[:4]})"
                account = models.Account(
                    name=unique_fallback_name,
                    opening_balance_afn=0,
                    opening_balance_usd=0,
                    company_id=(getattr(payload, "company_id", None) or "bawar-star")
                )
                db.add(account)
                try:
                    db.commit()
                    db.refresh(account)
                except Exception:
                    db.rollback()
                    account = db.query(models.Account).first()
    if not account:
        raise ValueError("Target account is required")

    detail_text = _normalize_text(payload.detail) or _normalize_text(payload.account_name) or ("Cash In" if payload.transaction_type == "cash_in" else "Cash Out")

    tx_date = payload.date
    if not isinstance(tx_date, date):
        try:
            s_d = str(tx_date).split("T")[0].replace("/", "-")
            tx_date = datetime.strptime(s_d, "%Y-%m-%d").date()
        except Exception:
            tx_date = date.today()

    parsed_salary_month = None
    if employee:
        m_d = payload.salary_month or tx_date
        if not isinstance(m_d, date):
            try:
                s_m = str(m_d).split("T")[0].replace("/", "-")
                m_d = datetime.strptime(s_m, "%Y-%m-%d").date()
            except Exception:
                m_d = tx_date
        parsed_salary_month = m_d.replace(day=1)

    last_error = None
    for attempt in range(5):
        try:
            tx_no = _next_transaction_no(db, tx_date)
            transaction = models.Transaction(
                transaction_no=tx_no,
                date=tx_date,
                account_id=account.id,
                employee_id=employee.id if employee else None,
                company_id=(
                    (employee.company_id or "all")
                    if employee
                    else (getattr(payload, "company_id", None) or "bawar-star")
                ),
                salary_month=parsed_salary_month,
                payroll_kind=(payload.payroll_kind or "salary") if employee else None,
                account_name=account.name,
                detail=detail_text,
                transaction_type=payload.transaction_type,
                cash_in_afn=amount_afn if payload.transaction_type == "cash_in" else 0,
                cash_out_afn=amount_afn if payload.transaction_type == "cash_out" else 0,
                usd_in=(
                    _amount(payload.usd_in)
                    if payload.transaction_type == "cash_in" and _amount(payload.usd_in)
                    else (derived_usd if payload.transaction_type == "cash_in" else 0)
                ),
                usd_out=(
                    _amount(payload.usd_out)
                    if payload.transaction_type == "cash_out" and _amount(payload.usd_out)
                    else (derived_usd if payload.transaction_type == "cash_out" else 0)
                ),
                exchange_rate=_amount(payload.exchange_rate),
                converted_afn=amount_afn,
                payment_method=payload.payment_method,
                category="salary" if employee else payload.category,
                note=_normalize_text(payload.note),
                branch_id=payload.branch_id,
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
            return transaction
        except Exception as err:
            db.rollback()
            last_error = err
    
    raise ValueError(f"Failed to record transaction due to database collision: {str(last_error)}")


def update_transaction(
    db: Session, transaction: models.Transaction, payload: schemas.TransactionUpdate
) -> models.Transaction:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is None:
            continue
        if key in {"account_name", "detail", "note"}:
            setattr(transaction, key, _normalize_text(value))
        elif key in {
            "cash_in_afn",
            "cash_out_afn",
            "usd_in",
            "usd_out",
            "exchange_rate",
            "converted_afn",
        }:
            setattr(transaction, key, _amount(value))
        else:
            setattr(transaction, key, value)
    if transaction.transaction_type == "cash_in":
        transaction.cash_out_afn = 0
        transaction.usd_out = 0
        if not transaction.cash_in_afn:
            transaction.cash_in_afn = (
                round(
                    _amount(transaction.usd_in) * _amount(transaction.exchange_rate), 2
                )
                if transaction.usd_in and transaction.exchange_rate
                else transaction.cash_in_afn
            )
    if transaction.transaction_type == "cash_out":
        transaction.cash_in_afn = 0
        transaction.usd_in = 0
        if not transaction.cash_out_afn:
            transaction.cash_out_afn = (
                round(
                    _amount(transaction.usd_out) * _amount(transaction.exchange_rate), 2
                )
                if transaction.usd_out and transaction.exchange_rate
                else transaction.cash_out_afn
            )
    transaction.converted_afn = _amount(
        transaction.cash_in_afn or transaction.cash_out_afn
    )
    if not transaction.converted_afn and transaction.exchange_rate:
        transaction.converted_afn = round(
            _amount(transaction.usd_in or transaction.usd_out)
            * _amount(transaction.exchange_rate),
            2,
        )
    if transaction.exchange_rate:
        if (
            transaction.transaction_type == "cash_in"
            and transaction.cash_in_afn
            and not transaction.usd_in
        ):
            transaction.usd_in = _afn_to_usd(
                transaction.cash_in_afn, transaction.exchange_rate
            )
        if (
            transaction.transaction_type == "cash_out"
            and transaction.cash_out_afn
            and not transaction.usd_out
        ):
            transaction.usd_out = _afn_to_usd(
                transaction.cash_out_afn, transaction.exchange_rate
            )
    if transaction.account_name:
        account = (
            get_account(db, transaction.account_id) if transaction.account_id else None
        )
        if not account or account.name.lower() != transaction.account_name.lower():
            account = get_account_by_name(db, transaction.account_name)
            if not account:
                account = models.Account(
                    name=_normalize_text(transaction.account_name),
                    opening_balance_afn=0,
                    opening_balance_usd=0,
                )
                db.add(account)
                db.flush()
            transaction.account_id = account.id
            transaction.account_name = account.name
    _validate_transaction(
        schemas.TransactionCreate(
            date=transaction.date,
            account_id=transaction.account_id,
            account_name=transaction.account_name,
            detail=transaction.detail,
            transaction_type=transaction.transaction_type,
            cash_in_afn=transaction.cash_in_afn,
            cash_out_afn=transaction.cash_out_afn,
            usd_in=transaction.usd_in,
            usd_out=transaction.usd_out,
            exchange_rate=transaction.exchange_rate,
            converted_afn=transaction.converted_afn,
            payment_method=transaction.payment_method,
            category=transaction.category,
            note=transaction.note,
        )
    )
    db.commit()
    db.refresh(transaction)
    return transaction


def delete_transaction(db: Session, transaction: models.Transaction) -> None:
    transaction.is_deleted = True
    db.commit()


