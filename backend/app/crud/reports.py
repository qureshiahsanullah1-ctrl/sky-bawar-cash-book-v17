from __future__ import annotations

import re

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas
from .utils import _normalize_text, _amount, _date_value, _datetime_value, _first_value, _rows_from, _id_key, _map_imported, _get_imported, _choice, _backup_root, _normalize_settings_backup, _normalize_account_backup, _normalize_employee_backup, _transaction_type_from_backup, _normalize_transaction_backup, utcnow

from .accounts import get_account


def summary(
    db: Session,
    user: models.User | None = None,
    group_id: int | None = None,
    branch_id: int | None = None,
) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

    base_q = db.query(models.Transaction)
    if branch_id:
        base_q = base_q.filter(models.Transaction.branch_id == branch_id)
    elif group_id:
        branch_ids = [
            b.id
            for b in db.query(models.Branch)
            .filter(models.Branch.group_id == group_id)
            .all()
        ]
        base_q = base_q.filter(models.Transaction.branch_id.in_(branch_ids))

    if user and user.role not in ["Administrator", "Super Admin"]:
        if user.assigned_branch_id is not None:
            base_q = base_q.filter(
                models.Transaction.branch_id == user.assigned_branch_id
            )
        elif user.assigned_group_id is not None:
            group_branch_ids = [
                b.id
                for b in db.query(models.Branch)
                .filter(models.Branch.group_id == user.assigned_group_id)
                .all()
            ]
            base_q = base_q.filter(models.Transaction.branch_id.in_(group_branch_ids))

    cash_in_afn = _amount(
        base_q.with_entities(func.sum(models.Transaction.cash_in_afn)).scalar()
    )
    cash_out_afn = _amount(
        base_q.with_entities(func.sum(models.Transaction.cash_out_afn)).scalar()
    )
    usd_in = _amount(base_q.with_entities(func.sum(models.Transaction.usd_in)).scalar())
    usd_out = _amount(
        base_q.with_entities(func.sum(models.Transaction.usd_out)).scalar()
    )
    today_q = base_q.filter(models.Transaction.date == today)
    month_q = base_q.filter(
        models.Transaction.date >= month_start,
        models.Transaction.date < next_month,
    )

    today_transactions = today_q.count()
    monthly_transactions = month_q.count()

    today_cash_in = _amount(today_q.with_entities(func.sum(models.Transaction.cash_in_afn)).scalar())
    today_cash_out = _amount(today_q.with_entities(func.sum(models.Transaction.cash_out_afn)).scalar())
    monthly_cash_in = _amount(month_q.with_entities(func.sum(models.Transaction.cash_in_afn)).scalar())
    monthly_cash_out = _amount(month_q.with_entities(func.sum(models.Transaction.cash_out_afn)).scalar())

    return {
        "cash_in_afn": cash_in_afn,
        "cash_out_afn": cash_out_afn,
        "afn_balance": round(cash_in_afn - cash_out_afn, 2),
        "usd_in": usd_in,
        "usd_out": usd_out,
        "usd_balance": round(usd_in - usd_out, 2),
        "today_transactions": today_transactions,
        "monthly_transactions": monthly_transactions,
        "today_cash_in": today_cash_in,
        "today_cash_out": today_cash_out,
        "monthly_cash_in": monthly_cash_in,
        "monthly_cash_out": monthly_cash_out,
    }


def filtered_transactions(
    db: Session,
    user: models.User | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    type: str | None = None,
    search: str | None = None,
    account: str | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    group_id: int | None = None,
    branch_id: int | None = None,
    skip: int = 0,
    limit: int | None = None,
) -> list[models.Transaction]:
    query = db.query(models.Transaction).filter(models.Transaction.is_deleted == False)
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

    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)
    if type in {"cash_in", "cash_out"}:
        query = query.filter(models.Transaction.transaction_type == type)
    if account:
        query = query.filter(
            func.lower(models.Transaction.account_name).like(f"%{account.lower()}%")
        )
    if category:
        query = query.filter(models.Transaction.category == category)
    if payment_method:
        query = query.filter(models.Transaction.payment_method == payment_method)
    if branch_id:
        query = query.filter(models.Transaction.branch_id == branch_id)
    elif group_id:
        branch_ids = [
            b.id
            for b in db.query(models.Branch)
            .filter(models.Branch.group_id == group_id)
            .all()
        ]
        query = query.filter(models.Transaction.branch_id.in_(branch_ids))
    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Transaction.account_name).like(pattern),
                func.lower(models.Transaction.detail).like(pattern),
                func.lower(models.Transaction.note).like(pattern),
                func.lower(models.Transaction.category).like(pattern),
            )
        )
    query = query.order_by(models.Transaction.date.asc(), models.Transaction.id.asc())
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def account_ledger(db: Session, account_id: int) -> dict:
    account = get_account(db, account_id)
    if not account:
        return {}
    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.account_id == account_id)
        .order_by(models.Transaction.date.asc(), models.Transaction.id.asc())
        .all()
    )
    running_afn = round(account.opening_balance_afn or 0, 2)
    running_usd = round(account.opening_balance_usd or 0, 2)
    rows = []
    for tx in transactions:
        if tx.transaction_type == "cash_in":
            running_afn += _amount(tx.cash_in_afn)
            running_usd += _amount(tx.usd_in)
        else:
            running_afn -= _amount(tx.cash_out_afn)
            running_usd -= _amount(tx.usd_out)
        rows.append(
            {
                "id": tx.id,
                "transaction_no": tx.transaction_no,
                "date": tx.date,
                "account_name": tx.account_name,
                "detail": tx.detail,
                "cash_in_afn": tx.cash_in_afn,
                "cash_out_afn": tx.cash_out_afn,
                "balance": round(running_afn, 2),
                "usd_in": tx.usd_in,
                "usd_out": tx.usd_out,
                "usd_balance": round(running_usd, 2),
                "note": tx.note,
                "transaction_type": tx.transaction_type,
                "exchange_rate": tx.exchange_rate,
                "payment_method": tx.payment_method,
                "category": tx.category,
            }
        )
    return {
        "account": account,
        "opening_balance_afn": account.opening_balance_afn,
        "opening_balance_usd": account.opening_balance_usd,
        "total_cash_in_afn": round(
            sum(_amount(tx.cash_in_afn) for tx in transactions), 2
        ),
        "total_cash_out_afn": round(
            sum(_amount(tx.cash_out_afn) for tx in transactions), 2
        ),
        "total_usd_in": round(sum(_amount(tx.usd_in) for tx in transactions), 2),
        "total_usd_out": round(sum(_amount(tx.usd_out) for tx in transactions), 2),
        "final_balance_afn": round(running_afn, 2),
        "final_balance_usd": round(running_usd, 2),
        "rows": rows,
    }


def dashboard_summary(db: Session, branch_id: int | None = None) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

    base_q = db.query(models.Transaction)
    if branch_id:
        base_q = base_q.filter(models.Transaction.branch_id == branch_id)

    today_q = base_q.filter(models.Transaction.date == today)
    month_q = base_q.filter(
        models.Transaction.date >= month_start, models.Transaction.date < next_month
    )

    def get_sum(q, col):
        return _amount(q.with_entities(func.sum(col)).scalar())

    afn_in_today = get_sum(today_q, models.Transaction.cash_in_afn)
    afn_out_today = get_sum(today_q, models.Transaction.cash_out_afn)
    afn_in_month = get_sum(month_q, models.Transaction.cash_in_afn)
    afn_out_month = get_sum(month_q, models.Transaction.cash_out_afn)
    afn_balance = get_sum(base_q, models.Transaction.cash_in_afn) - get_sum(
        base_q, models.Transaction.cash_out_afn
    )

    usd_in_today = get_sum(today_q, models.Transaction.usd_in)
    usd_out_today = get_sum(today_q, models.Transaction.usd_out)
    usd_in_month = get_sum(month_q, models.Transaction.usd_in)
    usd_out_month = get_sum(month_q, models.Transaction.usd_out)
    usd_balance = get_sum(base_q, models.Transaction.usd_in) - get_sum(
        base_q, models.Transaction.usd_out
    )

    toman_balance = 0.0
    toman_in_today = 0.0
    toman_out_today = 0.0
    toman_in_month = 0.0
    toman_out_month = 0.0

    entries_today = today_q.count()
    entries_month = month_q.count()

    active_accounts = db.query(models.Account).count()
    # Handle both boolean and integer is_active representation
    active_employees = (
        db.query(models.Employee)
        .filter(or_(models.Employee.is_active == True, models.Employee.is_active == 1))
        .count()
    )

    recent_transactions = base_q.order_by(models.Transaction.id.desc()).limit(10).all()

    thirty_days_ago = today - timedelta(days=30)
    cf_rows = base_q.filter(models.Transaction.date >= thirty_days_ago).all()
    cf_map = {}
    for r in cf_rows:
        d = r.date.isoformat()
        if d not in cf_map:
            cf_map[d] = {
                "date": d,
                "in_afn": 0,
                "out_afn": 0,
                "in_usd": 0,
                "out_usd": 0,
            }
        cf_map[d]["in_afn"] += _amount(r.cash_in_afn)
        cf_map[d]["out_afn"] += _amount(r.cash_out_afn)
        cf_map[d]["in_usd"] += _amount(r.usd_in)
        cf_map[d]["out_usd"] += _amount(r.usd_out)

    cash_flow = sorted(list(cf_map.values()), key=lambda x: x["date"])

    return {
        "period": {"start": month_start.isoformat(), "end": today.isoformat()},
        "branch": {
            "id": branch_id,
            "name": "Consolidated" if not branch_id else str(branch_id),
        },
        "currencies": {
            "AFN": {
                "balance": round(afn_balance, 2),
                "cash_in_today": round(afn_in_today, 2),
                "cash_out_today": round(afn_out_today, 2),
                "cash_in_month": round(afn_in_month, 2),
                "cash_out_month": round(afn_out_month, 2),
            },
            "USD": {
                "balance": round(usd_balance, 2),
                "cash_in_today": round(usd_in_today, 2),
                "cash_out_today": round(usd_out_today, 2),
                "cash_in_month": round(usd_in_month, 2),
                "cash_out_month": round(usd_out_month, 2),
            },
            "TOMAN": {
                "balance": round(toman_balance, 2),
                "cash_in_today": round(toman_in_today, 2),
                "cash_out_today": round(toman_out_today, 2),
                "cash_in_month": round(toman_in_month, 2),
                "cash_out_month": round(toman_out_month, 2),
            },
        },
        "totals": {
            "entries_today": entries_today,
            "entries_month": entries_month,
            "active_accounts": active_accounts,
            "active_employees": active_employees,
        },
        "cash_flow": cash_flow,
        "recent_transactions": recent_transactions,
        "account_balances": [],
        "system_status": {"status": "operational"},
    }


