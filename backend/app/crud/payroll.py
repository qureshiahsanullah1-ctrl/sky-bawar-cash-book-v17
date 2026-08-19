from __future__ import annotations

from calendar import monthrange

from datetime import date, datetime

from sqlalchemy import func

from sqlalchemy.orm import Session

from .. import models, schemas
from ..services.payroll import _text, _money, _month_start_from_parts, _month_label, effective_salary, _payment_carry_context, _cashbook_payload, _month_end
from .settings import get_settings
from .transactions import create_transaction, get_transaction, update_transaction


def _next_employee_code(db: Session) -> str:
    highest = 0
    for (code,) in db.query(models.Employee.employee_code).all():
        try:
            highest = max(highest, int(str(code).rsplit("-", 1)[-1]))
        except (TypeError, ValueError):
            continue
    return f"EMP-{highest + 1:04d}"


def create_employee(db: Session, payload: schemas.EmployeeCreate) -> models.Employee:
    name = _text(payload.full_name)
    existing = (
        db.query(models.Employee)
        .filter(func.lower(models.Employee.full_name) == name.lower())
        .first()
    )
    if existing:
        raise ValueError("An employee with this name already exists")

    account = (
        db.query(models.Account)
        .filter(func.lower(models.Account.name) == name.lower())
        .first()
    )
    if account and account.employee:
        raise ValueError("This account is already linked to an employee")
    if not account:
        account = models.Account(
            name=name, account_type="worker", phone=_text(payload.phone)
        )
        db.add(account)
        db.flush()
    else:
        account.account_type = "worker"
        account.phone = _text(payload.phone) or account.phone

    employee = models.Employee(
        employee_code=_next_employee_code(db),
        account_id=account.id,
        full_name=name,
        father_name=_text(payload.father_name),
        phone=_text(payload.phone),
        position=_text(payload.position),
        department=_text(payload.department),
        company_id=_text(payload.company_id) or "all",
        joining_date=payload.joining_date,
        employment_end_date=payload.employment_end_date,
        monthly_salary=_money(payload.monthly_salary),
        currency=payload.currency,
        avatar_url=_text(payload.avatar_url),
        status=payload.status,
        notes=_text(payload.notes),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def list_employees(db: Session) -> list[models.Employee]:
    return db.query(models.Employee).filter(models.Employee.is_deleted == False).order_by(models.Employee.full_name.asc()).all()


def get_employee(db: Session, employee_id: int) -> models.Employee | None:
    return db.query(models.Employee).filter(models.Employee.id == employee_id, models.Employee.is_deleted == False).first()


def update_employee(
    db: Session, employee: models.Employee, payload: schemas.EmployeeUpdate
) -> models.Employee:
    data = payload.model_dump(exclude_unset=True)
    text_fields = [
        "full_name",
        "father_name",
        "phone",
        "position",
        "department",
        "company_id",
        "avatar_url",
        "status",
        "notes",
    ]
    for field in text_fields:
        if field in data and data[field] is not None:
            setattr(employee, field, _text(data[field]))
    if "joining_date" in data:
        employee.joining_date = data["joining_date"]
    if "employment_end_date" in data:
        employee.employment_end_date = data["employment_end_date"]
    if "monthly_salary" in data and data["monthly_salary"] is not None:
        employee.monthly_salary = _money(data["monthly_salary"])
    if "currency" in data and data["currency"] is not None:
        employee.currency = data["currency"]
    employee.updated_at = datetime.utcnow()
    if employee.account:
        employee.account.name = employee.full_name
        employee.account.phone = employee.phone or employee.account.phone
        employee.account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee: models.Employee) -> None:
    payments = list(employee.salary_payments)
    for payment in payments:
        delete_salary_payment(db, payment)

    db.refresh(employee)
    for transaction in list(employee.transactions):
        transaction.employee_id = None
        transaction.payroll_kind = None
        transaction.salary_month = None

    employee.is_deleted = True
    if employee.account:
        employee.account.is_deleted = True
    db.commit()


def create_salary_payment(
    db: Session, payload: schemas.SalaryPaymentCreate
) -> models.SalaryPayment:
    employee = get_employee(db, payload.employee_id)
    if not employee:
        raise ValueError("Employee not found")
    amount = _money(payload.amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")

    target_date = date(
        payload.year, payload.month, monthrange(payload.year, payload.month)[1]
    )
    active = effective_salary(db, employee, target_date)
    settings = get_settings(db)
    carry_context = _payment_carry_context(
        db, employee, payload.month, payload.year, amount
    )
    try:
        transaction = create_transaction(
            db,
            _cashbook_payload(
                employee,
                payload,
                payload.month,
                payload.year,
                active["currency"],
                _money(settings.default_exchange_rate),
            ),
        )
        payment = models.SalaryPayment(
            employee_id=employee.id,
            month=payload.month,
            year=payload.year,
            amount=amount,
            payment_date=payload.payment_date,
            payment_method=payload.payment_method,
            notes=_text(payload.notes),
            previous_carry_forward_balance=carry_context[
                "previous_carry_forward_balance"
            ],
            total_payable_salary=carry_context["total_payable_salary"],
            carry_forward_balance=carry_context["carry_forward_balance"],
            cashbook_entry_id=transaction.id,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment
    except Exception:
        db.rollback()
        raise


def get_salary_payment(db: Session, payment_id: int) -> models.SalaryPayment | None:
    return (
        db.query(models.SalaryPayment)
        .filter(models.SalaryPayment.id == payment_id)
        .first()
    )


def update_salary_payment(
    db: Session, payment: models.SalaryPayment, payload: schemas.SalaryPaymentUpdate
) -> models.SalaryPayment:
    employee = get_employee(db, payment.employee_id)
    if not employee:
        raise ValueError("Employee not found")
    data = payload.model_dump(exclude_unset=True)
    previous_amount = _money(payment.amount)
    next_amount = _money(data.get("amount", payment.amount))
    if next_amount <= 0:
        raise ValueError("Amount must be greater than 0")
    payment.amount = next_amount
    if "payment_date" in data:
        payment.payment_date = data["payment_date"]
    if "payment_method" in data:
        payment.payment_method = data["payment_method"]
    if "notes" in data:
        payment.notes = _text(data["notes"])
    carry_context = _payment_carry_context(
        db,
        employee,
        payment.month,
        payment.year,
        next_amount,
        replaced_amount=previous_amount,
    )
    payment.previous_carry_forward_balance = carry_context[
        "previous_carry_forward_balance"
    ]
    payment.total_payable_salary = carry_context["total_payable_salary"]
    payment.carry_forward_balance = carry_context["carry_forward_balance"]
    payment.updated_at = datetime.utcnow()

    if payment.cashbook_entry_id:
        transaction = get_transaction(db, payment.cashbook_entry_id)
        if transaction:
            target_date = date(
                payment.year, payment.month, monthrange(payment.year, payment.month)[1]
            )
            active = effective_salary(db, employee, target_date)
            exchange_rate = _money(get_settings(db).default_exchange_rate)
            update_transaction(
                db,
                transaction,
                schemas.TransactionUpdate(
                    date=payment.payment_date,
                    account_id=employee.account_id,
                    employee_id=employee.id,
                    salary_month=_month_start_from_parts(payment.month, payment.year),
                    payroll_kind="salary",
                    account_name=employee.full_name,
                    detail=f"Salary payment for {employee.full_name} - {_month_label(payment.month, payment.year)}",
                    transaction_type="cash_out",
                    cash_out_afn=next_amount if active["currency"] == "AFN" else 0,
                    usd_out=next_amount if active["currency"] == "USD" else 0,
                    exchange_rate=exchange_rate if active["currency"] == "USD" else 0,
                    converted_afn=(
                        _money(next_amount * exchange_rate)
                        if active["currency"] == "USD"
                        else next_amount
                    ),
                    payment_method=payment.payment_method,
                    category="salary",
                    note=payment.notes
                    or f"Salary payment for {_month_label(payment.month, payment.year)}",
                ),
            )
    db.commit()
    db.refresh(payment)
    return payment


def delete_salary_payment(db: Session, payment: models.SalaryPayment) -> None:
    transaction = (
        get_transaction(db, payment.cashbook_entry_id)
        if payment.cashbook_entry_id
        else None
    )
    db.delete(payment)
    if transaction:
        db.delete(transaction)
    db.commit()


def create_salary_history(
    db: Session,
    employee: models.Employee,
    payload: schemas.SalaryHistoryCreate,
    changed_by: str,
) -> models.SalaryHistory:
    reason = _text(payload.reason)
    if not reason:
        raise ValueError("Reason for salary change is required")
    if payload.new_salary < 0:
        raise ValueError("Salary cannot be negative")
    current = effective_salary(db, employee, payload.effective_date)
    change = models.SalaryHistory(
        employee_id=employee.id,
        old_salary=current["salary"],
        new_salary=_money(payload.new_salary),
        old_currency=current["currency"],
        new_currency=payload.new_currency,
        effective_date=payload.effective_date,
        changed_by=_text(changed_by) or "Administrator",
        reason=reason,
        notes=_text(payload.notes),
    )
    db.add(change)
    db.flush()

    latest = (
        db.query(models.SalaryHistory)
        .filter(
            models.SalaryHistory.employee_id == employee.id,
        )
        .order_by(
            models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()
        )
        .first()
    )
    if latest:
        employee.monthly_salary = _money(latest.new_salary)
        employee.currency = latest.new_currency
    db.commit()
    db.refresh(change)
    return change


def salary_history_for_employee(
    db: Session, employee_id: int
) -> list[models.SalaryHistory]:
    return (
        db.query(models.SalaryHistory)
        .filter(
            models.SalaryHistory.employee_id == employee_id,
        )
        .order_by(
            models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()
        )
        .all()
    )


def salary_change_report(db: Session) -> list[dict]:
    rows = (
        db.query(models.SalaryHistory, models.Employee)
        .join(
            models.Employee,
            models.Employee.id == models.SalaryHistory.employee_id,
        )
        .order_by(
            models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()
        )
        .all()
    )
    return [
        {
            "id": change.id,
            "employee_id": change.employee_id,
            "employee_name": employee.full_name,
            "employee_code": employee.employee_code,
            "old_salary": change.old_salary,
            "new_salary": change.new_salary,
            "old_currency": change.old_currency,
            "new_currency": change.new_currency,
            "effective_date": change.effective_date,
            "changed_at": change.changed_at,
            "changed_by": change.changed_by,
            "reason": change.reason,
            "notes": change.notes,
        }
        for change, employee in rows
    ]


def create_salary_adjustment(
    db: Session,
    employee_id: int,
    payload: schemas.EmployeeSalaryAdjustmentCreate,
    created_by: str = "Administrator",
) -> models.EmployeeSalaryAdjustment:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")

    adj = models.EmployeeSalaryAdjustment(
        employee_id=employee.id,
        date=payload.date,
        period=payload.period,
        amount=_money(payload.amount),
        currency=payload.currency,
        adjustment_type=payload.adjustment_type,
        reason=_text(payload.reason),
        notes=_text(payload.notes),
        created_by=_text(created_by) or "Administrator",
    )
    db.add(adj)
    db.commit()
    db.refresh(adj)
    return adj


def list_salary_adjustments(
    db: Session, employee_id: int
) -> list[models.EmployeeSalaryAdjustment]:
    return (
        db.query(models.EmployeeSalaryAdjustment)
        .filter(models.EmployeeSalaryAdjustment.employee_id == employee_id)
        .order_by(
            models.EmployeeSalaryAdjustment.date.desc(),
            models.EmployeeSalaryAdjustment.id.desc(),
        )
        .all()
    )


