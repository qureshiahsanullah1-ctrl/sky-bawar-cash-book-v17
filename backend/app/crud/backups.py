from __future__ import annotations

import re

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas
from .utils import _normalize_text, _amount, _date_value, _datetime_value, _first_value, _rows_from, _id_key, _map_imported, _get_imported, _choice, _backup_root, _normalize_settings_backup, _normalize_account_backup, _normalize_employee_backup, _transaction_type_from_backup, _normalize_transaction_backup, utcnow

from .settings import get_settings, _ensure_settings, update_settings
from .accounts import list_accounts, get_account_by_name, update_account, create_account
from .transactions import list_transactions, get_transaction, create_transaction, update_transaction
from .payroll import create_employee


def backup_payload(db: Session) -> dict:
    db.add(
        models.BackupLog(
            backup_name=f"cashbook-backup-{utcnow().strftime('%Y%m%d-%H%M%S')}",
            backup_type="export",
            note="Full JSON backup exported",
        )
    )
    db.commit()
    return {
        "exported_at": utcnow(),
        "settings": get_settings(db),
        "accounts": list_accounts(db),
        "employees": db.query(models.Employee)
        .order_by(models.Employee.full_name.asc())
        .all(),
        "transactions": list_transactions(db),
        "salary_payments": db.query(models.SalaryPayment)
        .order_by(models.SalaryPayment.id.asc())
        .all(),
        "salary_history": db.query(models.SalaryHistory)
        .order_by(models.SalaryHistory.id.asc())
        .all(),
        "salary_adjustments": db.query(models.EmployeeSalaryAdjustment)
        .order_by(models.EmployeeSalaryAdjustment.id.asc())
        .all(),
    }


def import_backup(db: Session, payload: dict, replace_all: bool = False) -> dict:
    payload = _backup_root(payload)
    settings_data = _normalize_settings_backup(payload.get("settings") or {})
    account_rows = [
        row
        for row in (
            _normalize_account_backup(item)
            for item in _rows_from(payload, "accounts", "account_list", "parties")
        )
        if row
    ]
    employee_rows = [
        (
            _first_value(item, "id", "employee_id", "employeeId"),
            row,
        )
        for item in _rows_from(payload, "employees", "employee_list", "staff")
        if (row := _normalize_employee_backup(item))
    ]
    transaction_rows = [
        (
            _first_value(item, "id", "transaction_id", "transactionId"),
            row,
        )
        for item in _rows_from(
            payload, "transactions", "records", "entries", "cashbook"
        )
        if (row := _normalize_transaction_backup(item))
    ]
    salary_history_rows = _rows_from(payload, "salary_history", "salaryHistory")
    salary_payment_rows = _rows_from(payload, "salary_payments", "salaryPayments")
    salary_adjustment_rows = _rows_from(
        payload, "salary_adjustments", "salaryAdjustments"
    )

    if replace_all:
        db.query(models.EmployeeSalaryAdjustment).delete()
        db.query(models.SalaryPayment).delete()
        db.query(models.SalaryHistory).delete()
        db.query(models.Transaction).delete()
        db.query(models.Employee).delete()
        db.query(models.Account).delete()
        db.query(models.Setting).delete()
        db.commit()
        db.expunge_all()
        _ensure_settings(db)
    if settings_data:
        update_settings(db, schemas.SettingUpdate(**settings_data))
    imported_accounts = 0
    imported_employees = 0
    imported_transactions = 0
    imported_salary_payments = 0
    imported_salary_history = 0
    imported_salary_adjustments = 0
    for account_data in account_rows:
        account = get_account_by_name(db, account_data["name"])
        if account:
            update_account(db, account, schemas.AccountUpdate(**account_data))
        else:
            create_account(db, schemas.AccountCreate(**account_data))
        imported_accounts += 1
    employee_id_map = {}
    if employee_rows:
        from .payroll import create_employee

        for original_id, employee_data in employee_rows:
            existing_employee = (
                db.query(models.Employee)
                .filter(
                    func.lower(models.Employee.full_name)
                    == employee_data["full_name"].lower()
                )
                .first()
            )
            employee = existing_employee or create_employee(
                db, schemas.EmployeeCreate(**employee_data)
            )
            _map_imported(employee_id_map, original_id, employee)
            imported_employees += 1
    transaction_id_map = {}
    for original_transaction_id, tx_data in transaction_rows:
        if not any(
            (
                _amount(tx_data.get("cash_in_afn")),
                _amount(tx_data.get("cash_out_afn")),
                _amount(tx_data.get("usd_in")),
                _amount(tx_data.get("usd_out")),
            )
        ):
            continue
        existing = (
            get_transaction(db, tx_data["id"])
            if isinstance(tx_data.get("id"), int)
            else None
        )
        if existing:
            _map_imported(transaction_id_map, original_transaction_id, existing)
            continue
        natural_duplicate = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.date == tx_data["date"],
                func.lower(models.Transaction.account_name)
                == tx_data["account_name"].lower(),
                models.Transaction.detail == tx_data["detail"],
                models.Transaction.transaction_type
                == tx_data.get("transaction_type", tx_data.get("type")),
                models.Transaction.cash_in_afn
                == _amount(tx_data.get("cash_in_afn", 0)),
                models.Transaction.cash_out_afn
                == _amount(tx_data.get("cash_out_afn", 0)),
                models.Transaction.usd_in == _amount(tx_data.get("usd_in", 0)),
                models.Transaction.usd_out == _amount(tx_data.get("usd_out", 0)),
                models.Transaction.exchange_rate
                == _amount(tx_data.get("exchange_rate", 0)),
                models.Transaction.note == tx_data.get("note", ""),
            )
            .first()
        )
        if natural_duplicate:
            _map_imported(
                transaction_id_map, original_transaction_id, natural_duplicate
            )
            continue
        account = get_account_by_name(db, tx_data["account_name"])
        account_id = account.id if account else tx_data.get("account_id")
        employee = _get_imported(employee_id_map, tx_data.get("employee_id"))
        created_transaction = create_transaction(
            db,
            schemas.TransactionCreate(
                date=tx_data["date"],
                account_id=account_id,
                employee_id=employee.id if employee else None,
                salary_month=tx_data.get("salary_month"),
                payroll_kind=tx_data.get("payroll_kind"),
                account_name=tx_data["account_name"],
                detail=tx_data["detail"],
                transaction_type=tx_data.get("transaction_type", tx_data.get("type")),
                cash_in_afn=tx_data.get("cash_in_afn", 0),
                cash_out_afn=tx_data.get("cash_out_afn", 0),
                usd_in=tx_data.get("usd_in", 0),
                usd_out=tx_data.get("usd_out", 0),
                exchange_rate=tx_data.get("exchange_rate", 0),
                converted_afn=tx_data.get("converted_afn", 0),
                payment_method=tx_data.get("payment_method", "cash"),
                category=tx_data.get("category", "other"),
                note=tx_data.get("note", ""),
            ),
        )
        _map_imported(transaction_id_map, original_transaction_id, created_transaction)
        imported_transactions += 1

    for history_data in salary_history_rows:
        if not isinstance(history_data, dict):
            continue
        employee = _get_imported(
            employee_id_map, _first_value(history_data, "employee_id", "employeeId")
        )
        if not employee:
            continue
        effective_date = _date_value(
            _first_value(history_data, "effective_date", "effectiveDate", "date")
        )
        if not effective_date:
            continue
        duplicate = (
            db.query(models.SalaryHistory)
            .filter(
                models.SalaryHistory.employee_id == employee.id,
                models.SalaryHistory.effective_date == effective_date,
                models.SalaryHistory.new_salary
                == _amount(
                    _first_value(history_data, "new_salary", "newSalary", "salary")
                ),
            )
            .first()
        )
        if duplicate:
            continue
        db.add(
            models.SalaryHistory(
                employee_id=employee.id,
                old_salary=_amount(
                    _first_value(history_data, "old_salary", "oldSalary")
                ),
                new_salary=_amount(
                    _first_value(history_data, "new_salary", "newSalary", "salary")
                ),
                old_currency=str(
                    _first_value(
                        history_data, "old_currency", "oldCurrency", default="AFN"
                    )
                    or "AFN"
                ).upper(),
                new_currency=str(
                    _first_value(
                        history_data,
                        "new_currency",
                        "newCurrency",
                        "currency",
                        default="AFN",
                    )
                    or "AFN"
                ).upper(),
                effective_date=effective_date,
                changed_at=_datetime_value(
                    _first_value(history_data, "changed_at", "changedAt")
                )
                or datetime.utcnow(),
                changed_by=_normalize_text(
                    _first_value(history_data, "changed_by", "changedBy")
                )
                or "Administrator",
                reason=_normalize_text(_first_value(history_data, "reason"))
                or "Imported backup",
                notes=_normalize_text(_first_value(history_data, "notes", "note")),
            )
        )
        imported_salary_history += 1

    for payment_data in salary_payment_rows:
        if not isinstance(payment_data, dict):
            continue
        employee = _get_imported(
            employee_id_map, _first_value(payment_data, "employee_id", "employeeId")
        )
        transaction = _get_imported(
            transaction_id_map,
            _first_value(
                payment_data,
                "cashbook_entry_id",
                "cashbookEntryId",
                "transaction_id",
                "transactionId",
            ),
        )
        if not employee or not transaction:
            continue
        duplicate = (
            db.query(models.SalaryPayment)
            .filter(
                models.SalaryPayment.cashbook_entry_id == transaction.id,
            )
            .first()
        )
        if duplicate:
            continue
        payment_date = _date_value(
            _first_value(payment_data, "payment_date", "paymentDate", "date")
        )
        if not payment_date:
            continue
        db.add(
            models.SalaryPayment(
                employee_id=employee.id,
                month=int(
                    _amount(_first_value(payment_data, "month")) or payment_date.month
                ),
                year=int(
                    _amount(_first_value(payment_data, "year")) or payment_date.year
                ),
                amount=_amount(
                    _first_value(payment_data, "amount", "paid_amount", "paidAmount")
                ),
                payment_date=payment_date,
                payment_method=_choice(
                    _first_value(
                        payment_data, "payment_method", "paymentMethod", "method"
                    ),
                    {"cash", "bank", "hawala", "other"},
                    "cash",
                    {"transfer": "bank", "card": "bank"},
                ),
                notes=_normalize_text(_first_value(payment_data, "notes", "note")),
                previous_carry_forward_balance=_amount(
                    _first_value(
                        payment_data,
                        "previous_carry_forward_balance",
                        "previousCarryForwardBalance",
                    )
                ),
                total_payable_salary=_amount(
                    _first_value(
                        payment_data, "total_payable_salary", "totalPayableSalary"
                    )
                ),
                carry_forward_balance=_amount(
                    _first_value(
                        payment_data, "carry_forward_balance", "carryForwardBalance"
                    )
                ),
                cashbook_entry_id=transaction.id,
            )
        )
        imported_salary_payments += 1

    for adj_data in salary_adjustment_rows:
        if not isinstance(adj_data, dict):
            continue
        employee = _get_imported(
            employee_id_map, _first_value(adj_data, "employee_id", "employeeId")
        )
        if not employee:
            continue
        adj_date = _date_value(
            _first_value(adj_data, "date", "adjustment_date", "adjustmentDate")
        )
        if not adj_date:
            continue
        period_str = str(
            _first_value(adj_data, "period")
            or f"{adj_date.year:04d}-{adj_date.month:02d}"
        )
        amount_val = _amount(_first_value(adj_data, "amount"))
        if not amount_val:
            continue
        duplicate = (
            db.query(models.EmployeeSalaryAdjustment)
            .filter(
                models.EmployeeSalaryAdjustment.employee_id == employee.id,
                models.EmployeeSalaryAdjustment.date == adj_date,
                models.EmployeeSalaryAdjustment.amount == amount_val,
                models.EmployeeSalaryAdjustment.adjustment_type
                == str(
                    _first_value(
                        adj_data,
                        "adjustment_type",
                        "adjustmentType",
                        "type",
                        default="adjustment",
                    )
                ),
            )
            .first()
        )
        if duplicate:
            continue
        db.add(
            models.EmployeeSalaryAdjustment(
                employee_id=employee.id,
                date=adj_date,
                period=period_str,
                amount=amount_val,
                currency=str(
                    _first_value(adj_data, "currency", default="AFN") or "AFN"
                ).upper(),
                adjustment_type=str(
                    _first_value(
                        adj_data,
                        "adjustment_type",
                        "adjustmentType",
                        "type",
                        default="adjustment",
                    )
                ),
                reason=_normalize_text(_first_value(adj_data, "reason"))
                or "Imported adjustment",
                notes=_normalize_text(_first_value(adj_data, "notes", "note")),
                created_by=_normalize_text(
                    _first_value(adj_data, "created_by", "createdBy")
                )
                or "Administrator",
                created_at=_datetime_value(
                    _first_value(adj_data, "created_at", "createdAt")
                )
                or utcnow(),
            )
        )
        imported_salary_adjustments += 1

    db.add(
        models.BackupLog(
            backup_name=f"cashbook-restore-{utcnow().strftime('%Y%m%d-%H%M%S')}",
            backup_type="restore",
            note=f"Imported {imported_accounts} accounts, {imported_employees} employees, and {imported_transactions} transactions",
        )
    )
    db.commit()
    return {
        "imported_accounts": imported_accounts,
        "imported_employees": imported_employees,
        "imported_transactions": imported_transactions,
        "imported_salary_payments": imported_salary_payments,
        "imported_salary_history": imported_salary_history,
        "imported_salary_adjustments": imported_salary_adjustments,
    }


def clear_all(db: Session) -> dict:
    transaction_count = db.query(models.Transaction).count()
    employee_count = db.query(models.Employee).count()
    account_count = db.query(models.Account).count()
    db.query(models.EmployeeSalaryAdjustment).delete()
    db.query(models.SalaryPayment).delete()
    db.query(models.SalaryHistory).delete()
    db.query(models.Transaction).delete()
    db.query(models.Employee).delete()
    db.query(models.Account).delete()
    db.query(models.Setting).delete()
    db.commit()

    db.query(models.Employee).delete()
    db.query(models.Account).delete()
    db.query(models.Setting).delete()
    db.commit()
    db.expunge_all()
    _ensure_settings(db)
    db.add(
        models.BackupLog(
            backup_name=f"cashbook-clear-{utcnow().strftime('%Y%m%d-%H%M%S')}",
            backup_type="clear",
            note=f"Cleared {account_count} accounts, {employee_count} employees, and {transaction_count} transactions",
        )
    )
    db.commit()
    return {
        "ok": True,
        "deleted_accounts": account_count,
        "deleted_employees": employee_count,
        "deleted_transactions": transaction_count,
    }


