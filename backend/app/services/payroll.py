from __future__ import annotations

from calendar import monthrange

from datetime import date, datetime

from sqlalchemy import func

from sqlalchemy.orm import Session

from .. import models, schemas


def get_employee(db: Session, employee_id: int) -> models.Employee | None:
    return (
        db.query(models.Employee)
        .filter(models.Employee.id == employee_id, models.Employee.is_deleted == False)
        .first()
    )



def _text(value) -> str:
    return str(value or "").strip()


def _money(value) -> float:
    return round(float(value or 0), 2)


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _month_start_from_parts(month: int, year: int) -> date:
    return date(year, month, 1)


def _month_label(month: int, year: int) -> str:
    return date(year, month, 1).strftime("%B %Y")


def _next_month(value: date) -> date:
    return date(
        value.year + (1 if value.month == 12 else 0),
        1 if value.month == 12 else value.month + 1,
        1,
    )


def _month_end(value: date) -> date:
    return date(value.year, value.month, monthrange(value.year, value.month)[1])


def effective_salary(db: Session, employee: models.Employee, target_date: date) -> dict:
    history = (
        db.query(models.SalaryHistory)
        .filter(
            models.SalaryHistory.employee_id == employee.id,
        )
        .order_by(
            models.SalaryHistory.effective_date.asc(), models.SalaryHistory.id.asc()
        )
        .all()
    )
    if not history:
        return {
            "salary": _money(employee.monthly_salary),
            "currency": employee.currency or "AFN",
        }
    eligible = [change for change in history if change.effective_date <= target_date]
    if eligible:
        active = eligible[-1]
        return {
            "salary": _money(active.new_salary),
            "currency": active.new_currency or "AFN",
        }
    first = history[0]
    return {"salary": _money(first.old_salary), "currency": first.old_currency or "AFN"}


def _employee_salary_start_month(employee: models.Employee, target_month: date) -> date:
    if not employee.joining_date:
        return target_month
    return _month_start(employee.joining_date)


def _earned_salary_for_month(
    db: Session, employee: models.Employee, target_month: date
) -> float:
    month_start = _month_start(target_month)
    month_end = _month_end(target_month)

    if not employee.joining_date:
        active = effective_salary(db, employee, month_end)
        return _money(active["salary"])

    joining_date = employee.joining_date
    if month_end < joining_date:
        return 0.0

    end_date = employee.employment_end_date
    if end_date and month_start > end_date:
        return 0.0

    active = effective_salary(db, employee, month_end)
    salary = active["salary"]
    days_in_month = monthrange(target_month.year, target_month.month)[1]

    start_day = 1
    if month_start == _month_start(joining_date):
        start_day = joining_date.day

    final_day = days_in_month
    if end_date and month_start == _month_start(end_date):
        final_day = min(end_date.day, days_in_month)

    if start_day > 1 or final_day < days_in_month:
        active_days = max(0, final_day - start_day + 1)
        return _money((salary / days_in_month) * active_days)

    return _money(salary)


def _earned_salary_through(
    db: Session, employee: models.Employee, through_month: date
) -> float:
    if not employee.joining_date:
        return 0.0
    total = 0.0
    current = _month_start(employee.joining_date)
    target = _month_start(through_month)
    while current <= target:
        total += _earned_salary_for_month(db, employee, current)
        current = _next_month(current)
    return _money(total)


def employee_salary_summary(db: Session, employee_id: int, month: date) -> dict:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    salary_month = _month_start(month)
    rows = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.employee_id == employee.id,
            models.Transaction.transaction_type == "cash_out",
            models.Transaction.category == "salary",
            models.Transaction.salary_month == salary_month,
        )
        .all()
    )
    month_end = date(
        salary_month.year,
        salary_month.month,
        monthrange(salary_month.year, salary_month.month)[1],
    )
    active_salary = effective_salary(db, employee, month_end)
    amount_for = lambda row: _money(
        row.usd_out if active_salary["currency"] == "USD" else row.cash_out_afn
    )
    paid = sum(
        amount_for(row) for row in rows if (row.payroll_kind or "salary") == "salary"
    )
    advance = sum(amount_for(row) for row in rows if row.payroll_kind == "advance")
    report_rows, _payments = _salary_rows_for_month(
        db, salary_month.month, salary_month.year
    )
    report_row = next(
        (row for row in report_rows if row["employee_id"] == employee.id), None
    )
    monthly_salary = (
        report_row["monthly_salary"] if report_row else active_salary["salary"]
    )
    previous_carry = report_row["previous_carry_forward_balance"] if report_row else 0
    total_payable = report_row["total_payable_salary"] if report_row else monthly_salary
    remaining = (
        report_row["remaining_salary"]
        if report_row
        else _money(total_payable - paid - advance)
    )
    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "salary_month": salary_month,
        "monthly_salary": monthly_salary,
        "paid_amount": _money(paid),
        "advance_taken": _money(advance),
        "previous_carry_forward_balance": _money(previous_carry),
        "total_payable_salary": _money(total_payable),
        "remaining_salary": _money(remaining),
        "carry_forward_balance": _money(remaining),
        "currency": active_salary["currency"],
    }


def _linked_cashbook_ids(db: Session) -> set[int]:
    rows = (
        db.query(models.SalaryPayment.cashbook_entry_id)
        .filter(models.SalaryPayment.cashbook_entry_id.isnot(None))
        .all()
    )
    return {row[0] for row in rows if row[0]}


def _salary_rows_for_month(
    db: Session, month: int, year: int
) -> tuple[list[dict], list[models.SalaryPayment]]:
    salary_month = _month_start_from_parts(month, year)
    salary_month_end = _month_end(salary_month)
    employees = (
        db.query(models.Employee)
        .filter(models.Employee.is_deleted == False)
        .order_by(models.Employee.full_name.asc())
        .all()
    )
    payments = (
        db.query(models.SalaryPayment)
        .filter(
            models.SalaryPayment.month == month,
            models.SalaryPayment.year == year,
        )
        .all()
    )
    payments_through_month = (
        db.query(models.SalaryPayment)
        .filter(
            (models.SalaryPayment.year < year)
            | (
                (models.SalaryPayment.year == year)
                & (models.SalaryPayment.month <= month)
            )
        )
        .all()
    )
    linked_ids = _linked_cashbook_ids(db)
    legacy_transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.transaction_type == "cash_out",
            models.Transaction.category == "salary",
            models.Transaction.salary_month == salary_month,
        )
        .all()
    )
    legacy_transactions = [tx for tx in legacy_transactions if tx.id not in linked_ids]
    legacy_transactions_through_month = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.transaction_type == "cash_out",
            models.Transaction.category == "salary",
            models.Transaction.salary_month <= salary_month,
        )
        .all()
    )
    legacy_transactions_through_month = [
        tx for tx in legacy_transactions_through_month if tx.id not in linked_ids
    ]

    by_employee: dict[int, dict] = {}
    paid_through_employee: dict[int, float] = {}
    for payment in payments:
        bucket = by_employee.setdefault(
            payment.employee_id, {"paid": 0.0, "last": None}
        )
        bucket["paid"] += _money(payment.amount)
        if not bucket["last"] or payment.payment_date > bucket["last"]:
            bucket["last"] = payment.payment_date

    for payment in payments_through_month:
        paid_through_employee[payment.employee_id] = _money(
            paid_through_employee.get(payment.employee_id, 0.0) + payment.amount
        )

    for transaction in legacy_transactions:
        if not transaction.employee_id:
            continue
        bucket = by_employee.setdefault(
            transaction.employee_id, {"paid": 0.0, "last": None}
        )
        bucket["paid"] += _money(transaction.cash_out_afn)
        if not bucket["last"] or transaction.date > bucket["last"]:
            bucket["last"] = transaction.date

    for transaction in legacy_transactions_through_month:
        if not transaction.employee_id:
            continue
        paid_through_employee[transaction.employee_id] = _money(
            paid_through_employee.get(transaction.employee_id, 0.0)
            + transaction.cash_out_afn
        )

    rows = []
    for employee in employees:
        active_salary = effective_salary(db, employee, salary_month_end)
        totals = by_employee.get(employee.id, {"paid": 0.0, "last": None})
        paid = _money(totals["paid"])
        monthly_salary = active_salary["salary"]
        previous_month = (
            date(year - 1, 12, 1) if month == 1 else date(year, month - 1, 1)
        )
        previous_paid = _money(paid_through_employee.get(employee.id, 0.0) - paid)
        previous_carry = (
            _money(_earned_salary_through(db, employee, previous_month) - previous_paid)
            if previous_month >= _employee_salary_start_month(employee, previous_month)
            else 0.0
        )
        total_payable = _money(monthly_salary + previous_carry)
        remaining = _money(total_payable - paid)
        closing_balance = remaining
        if paid <= 0:
            status = "Unpaid" if closing_balance > 0 else "Paid"
        elif closing_balance < 0:
            status = "Advance"
        elif closing_balance == 0:
            status = "Paid"
        else:
            status = "Partial Paid"
        rows.append(
            {
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "employee_name": employee.full_name,
                "company_id": employee.company_id or "all",
                "department": employee.department or "",
                "position": employee.position or "",
                "joining_date": (
                    employee.joining_date.isoformat() if employee.joining_date else None
                ),
                "employment_end_date": (
                    employee.employment_end_date.isoformat()
                    if employee.employment_end_date
                    else None
                ),
                "monthly_salary": monthly_salary,
                "previous_carry_forward_balance": previous_carry,
                "total_payable_salary": total_payable,
                "paid_salary": paid,
                "remaining_salary": remaining,
                "carry_forward_balance": closing_balance,
                "payment_status": status,
                "last_payment_date": totals["last"],
                "currency": active_salary["currency"],
            }
        )
    return rows, payments


def salary_report(db: Session, month: int, year: int) -> dict:
    rows, payments = _salary_rows_for_month(db, month, year)
    summary = {
        "total_employees": len(rows),
        "total_monthly_salary": _money(sum(row["monthly_salary"] for row in rows)),
        "total_payable_salary": _money(
            sum(row["total_payable_salary"] for row in rows)
        ),
        "total_paid_this_month": _money(sum(row["paid_salary"] for row in rows)),
        "total_remaining_salary": _money(sum(row["remaining_salary"] for row in rows)),
        "fully_paid_employees": sum(
            1 for row in rows if row["payment_status"] == "Paid"
        ),
        "unpaid_employees": sum(1 for row in rows if row["payment_status"] == "Unpaid"),
        "partial_paid_employees": sum(
            1 for row in rows if row["payment_status"] == "Partial Paid"
        ),
    }
    return {
        "month": month,
        "year": year,
        "rows": rows,
        "summary": summary,
        "payments": payments,
    }


def _remaining_for_employee(
    db: Session,
    employee_id: int,
    month: int,
    year: int,
    exclude_payment_id: int | None = None,
) -> float:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    rows, _payments = _salary_rows_for_month(db, month, year)
    row = next((item for item in rows if item["employee_id"] == employee_id), None)
    paid = row["paid_salary"] if row else 0.0
    if exclude_payment_id:
        existing = (
            db.query(models.SalaryPayment)
            .filter(models.SalaryPayment.id == exclude_payment_id)
            .first()
        )
        if existing:
            paid = max(0, paid - _money(existing.amount))
    return _money(max(_money(employee.monthly_salary) - paid, 0))


def _payment_carry_context(
    db: Session,
    employee: models.Employee,
    month: int,
    year: int,
    amount: float,
    replaced_amount: float = 0.0,
) -> dict:
    rows, _payments = _salary_rows_for_month(db, month, year)
    row = next((item for item in rows if item["employee_id"] == employee.id), None)
    if not row:
        target_date = _month_end(_month_start_from_parts(month, year))
        active = effective_salary(db, employee, target_date)
        row = {
            "previous_carry_forward_balance": 0.0,
            "total_payable_salary": active["salary"],
            "remaining_salary": active["salary"],
        }
    closing = _money(row["remaining_salary"] + replaced_amount - amount)
    return {
        "previous_carry_forward_balance": _money(row["previous_carry_forward_balance"]),
        "total_payable_salary": _money(row["total_payable_salary"]),
        "carry_forward_balance": closing,
    }


def _cashbook_payload(
    employee: models.Employee,
    payload,
    month: int,
    year: int,
    currency: str,
    exchange_rate: float,
) -> schemas.TransactionCreate:
    amount = _money(payload.amount)
    label = _month_label(month, year)
    note = _text(payload.notes) or f"Salary payment for {label}"
    return schemas.TransactionCreate(
        date=payload.payment_date,
        account_id=employee.account_id,
        employee_id=employee.id,
        salary_month=_month_start_from_parts(month, year),
        payroll_kind="salary",
        account_name=employee.full_name,
        detail=f"Salary payment for {employee.full_name} - {label}",
        transaction_type="cash_out",
        cash_in_afn=0,
        cash_out_afn=amount if currency == "AFN" else 0,
        usd_in=0,
        usd_out=amount if currency == "USD" else 0,
        exchange_rate=exchange_rate if currency == "USD" else 0,
        converted_afn=_money(amount * exchange_rate) if currency == "USD" else amount,
        payment_method=payload.payment_method,
        category="salary",
        note=note,
    )


def calculate_employee_salary_ledger(
    db: Session,
    employee_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
    currency: str | None = None,
    branch_id: int | None = None,
    page: int = 1,
    page_size: int = 100,
) -> dict:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")

    today = date.today()
    requested_currency = (currency or employee.currency or "AFN").upper()
    active_now = effective_salary(db, employee, today)

    joining_date = employee.joining_date
    end_date = employee.employment_end_date

    carry_forward_enabled = joining_date is not None
    notice = (
        None
        if carry_forward_enabled
        else "Joining date not set — historical carry forward is disabled."
    )

    entries = []

    # 1. Salary Accruals
    if carry_forward_enabled:
        start_month = _month_start(joining_date)
        end_month = _month_start(to_date or today)
        if end_date and _month_start(end_date) < end_month:
            end_month = _month_start(end_date)

        curr_month = start_month
        while curr_month <= end_month:
            month_end = _month_end(curr_month)
            active = effective_salary(db, employee, month_end)
            curr_code = active["currency"]

            if not currency or curr_code.upper() == requested_currency:
                accrual_amount = _earned_salary_for_month(db, employee, curr_month)
                if accrual_amount > 0:
                    if (
                        curr_month == _month_start(joining_date)
                        and joining_date.day > 1
                    ):
                        desc = f"Salary accrued from joining date ({joining_date.strftime('%b %d, %Y')})"
                    elif end_date and curr_month == _month_start(end_date):
                        desc = f"Salary accrued until end date ({end_date.strftime('%b %d, %Y')})"
                    else:
                        desc = f"Salary accrued for {_month_label(curr_month.month, curr_month.year)}"

                    entries.append(
                        {
                            "id": f"accrual-{curr_month.strftime('%Y-%m')}",
                            "date": month_end,
                            "period": curr_month.strftime("%Y-%m"),
                            "entry_type": "salary_accrual",
                            "description": desc,
                            "salary_accrued": accrual_amount,
                            "payment": 0.0,
                            "bonus": 0.0,
                            "deduction": 0.0,
                            "adjustment": 0.0,
                            "debit": accrual_amount,
                            "credit": 0.0,
                            "currency": curr_code,
                            "transaction_id": None,
                            "reference": f"ACC-{curr_month.strftime('%Y%m')}",
                            "_type_order": 1,
                        }
                    )
            curr_month = _next_month(curr_month)
    else:
        # No joining date: calculate accrual only for current month
        curr_month = _month_start(today)
        month_end = _month_end(curr_month)
        active = effective_salary(db, employee, month_end)
        curr_code = active["currency"]
        if not currency or curr_code.upper() == requested_currency:
            accrual_amount = _earned_salary_for_month(db, employee, curr_month)
            entries.append(
                {
                    "id": f"accrual-{curr_month.strftime('%Y-%m')}",
                    "date": month_end,
                    "period": curr_month.strftime("%Y-%m"),
                    "entry_type": "salary_accrual",
                    "description": f"Current month salary ({_month_label(curr_month.month, curr_month.year)})",
                    "salary_accrued": accrual_amount,
                    "payment": 0.0,
                    "bonus": 0.0,
                    "deduction": 0.0,
                    "adjustment": 0.0,
                    "debit": accrual_amount,
                    "credit": 0.0,
                    "currency": curr_code,
                    "transaction_id": None,
                    "reference": f"ACC-{curr_month.strftime('%Y%m')}",
                    "_type_order": 1,
                }
            )

    # 2. Salary Payments
    payments = (
        db.query(models.SalaryPayment)
        .filter(
            models.SalaryPayment.employee_id == employee.id,
        )
        .order_by(
            models.SalaryPayment.payment_date.asc(), models.SalaryPayment.id.asc()
        )
        .all()
    )

    for p in payments:
        target_date = date(p.year, p.month, monthrange(p.year, p.month)[1])
        active = effective_salary(db, employee, target_date)
        p_currency = active["currency"]
        if not currency or p_currency.upper() == requested_currency:
            notes_text = (
                p.notes or f"Salary payment for {_month_label(p.month, p.year)}"
            )
            entries.append(
                {
                    "id": f"payment-{p.id}",
                    "date": p.payment_date,
                    "period": f"{p.year:04d}-{p.month:02d}",
                    "entry_type": "salary_payment",
                    "description": notes_text,
                    "salary_accrued": 0.0,
                    "payment": _money(p.amount),
                    "bonus": 0.0,
                    "deduction": 0.0,
                    "adjustment": 0.0,
                    "debit": 0.0,
                    "credit": _money(p.amount),
                    "currency": p_currency,
                    "transaction_id": p.cashbook_entry_id,
                    "reference": f"SP-{p.id:04d}",
                    "_type_order": 3,
                }
            )

    # 3. Salary Adjustments
    adjustments = (
        db.query(models.EmployeeSalaryAdjustment)
        .filter(
            models.EmployeeSalaryAdjustment.employee_id == employee.id,
        )
        .order_by(
            models.EmployeeSalaryAdjustment.date.asc(),
            models.EmployeeSalaryAdjustment.id.asc(),
        )
        .all()
    )

    for adj in adjustments:
        if not currency or adj.currency.upper() == requested_currency:
            amt = _money(adj.amount)
            adj_type = adj.adjustment_type
            debit = 0.0
            credit = 0.0
            bonus = 0.0
            deduction = 0.0
            adjustment = 0.0
            if adj_type == "bonus":
                debit = amt
                bonus = amt
                adjustment = amt
            elif adj_type in ("deduction", "advance"):
                credit = amt
                deduction = amt
                adjustment = -amt
            elif adj_type in ("adjustment", "reversal"):
                if amt >= 0:
                    debit = amt
                    adjustment = amt
                else:
                    credit = abs(amt)
                    adjustment = amt

            entries.append(
                {
                    "id": f"adjustment-{adj.id}",
                    "date": adj.date,
                    "period": adj.period,
                    "entry_type": adj_type,
                    "description": f"{adj.reason}"
                    + (f" ({adj.notes})" if adj.notes else ""),
                    "salary_accrued": 0.0,
                    "payment": 0.0,
                    "bonus": bonus,
                    "deduction": deduction,
                    "adjustment": adjustment,
                    "debit": debit,
                    "credit": credit,
                    "currency": adj.currency,
                    "transaction_id": None,
                    "reference": f"ADJ-{adj.id:04d}",
                    "_type_order": 2,
                }
            )

    # Optional date filtering
    if from_date:
        entries = [e for e in entries if e["date"] >= from_date]
    if to_date:
        entries = [e for e in entries if e["date"] <= to_date]

    # Sort entries chronologically
    entries.sort(key=lambda e: (e["date"], e["_type_order"], e["id"]))

    # Compute running balance
    running_balance = 0.0
    for e in entries:
        running_balance += e["debit"] - e["credit"]
        e["running_balance"] = _money(running_balance)
        del e["_type_order"]

    # Compute Summary
    total_accrued = _money(sum(e["salary_accrued"] for e in entries))
    total_paid = _money(sum(e["payment"] for e in entries))
    total_bonus = _money(sum(e["bonus"] for e in entries))
    total_deductions = _money(sum(e["deduction"] for e in entries))
    total_adjustments = _money(
        sum(
            e["adjustment"]
            for e in entries
            if e["entry_type"]
            not in ("salary_accrual", "salary_payment", "bonus", "deduction")
        )
    )
    outstanding_balance = _money(running_balance)

    curr_period_str = today.strftime("%Y-%m")
    current_month_entries = [e for e in entries if e["period"] == curr_period_str]
    current_month_accrued = _money(
        sum(e["salary_accrued"] for e in current_month_entries)
    )
    current_month_paid = _money(sum(e["payment"] for e in current_month_entries))
    current_month_remaining = _money(current_month_accrued - current_month_paid)

    summary = {
        "total_accrued": total_accrued,
        "total_paid": total_paid,
        "total_bonus": total_bonus,
        "total_deductions": total_deductions,
        "total_adjustments": total_adjustments,
        "outstanding_balance": outstanding_balance,
        "current_month_accrued": current_month_accrued,
        "current_month_paid": current_month_paid,
        "current_month_remaining": current_month_remaining,
    }

    # Paginate
    total_entries = len(entries)
    start_idx = (page - 1) * page_size
    paged_entries = entries[start_idx : start_idx + page_size]

    return {
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "joining_date": employee.joining_date,
            "employment_end_date": employee.employment_end_date,
            "current_salary": active_now["salary"],
            "currency": requested_currency,
            "position": employee.position or "",
            "department": employee.department or "",
            "status": employee.status or "active",
        },
        "policy": {
            "carry_forward_enabled": carry_forward_enabled,
            "first_month_prorated": True,
            "notice": notice,
        },
        "summary": summary,
        "entries": paged_entries,
        "page": page,
        "page_size": page_size,
        "total_entries": total_entries,
    }


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


