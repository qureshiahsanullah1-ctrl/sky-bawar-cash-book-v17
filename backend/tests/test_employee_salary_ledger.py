import os
from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import crud, models, schemas
from app.crud import payroll as payroll_crud, transactions as crud_transactions, backups as crud_backups
from app.services import payroll as payroll_services
from app.database import Base


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    crud._ensure_settings(session)
    yield session
    session.close()


def create_test_employee(
    db,
    name="Test Emp",
    salary=30000.0,
    joining_date=None,
    currency="AFN",
    end_date=None,
):
    payload = schemas.EmployeeCreate(
        full_name=name,
        position="Engineer",
        monthly_salary=salary,
        joining_date=joining_date,
        employment_end_date=end_date,
        currency=currency,
    )
    return payroll_crud.create_employee(db, payload)


def test_case_1_joining_date_present_proration(db):
    # Monthly salary: 31,000, Joining date: July 16, 2026. Days in July: 31. Active days: 16.
    # July prorated salary = 31000 / 31 * 16 = 16000.
    emp = create_test_employee(
        db, name="Emp Case 1", salary=31000.0, joining_date=date(2026, 7, 16)
    )

    # Ledger through July 2026
    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 7, 31)
    )

    assert ledger["policy"]["carry_forward_enabled"] is True
    assert ledger["summary"]["total_accrued"] == 16000.0
    assert ledger["summary"]["outstanding_balance"] == 16000.0
    assert len(ledger["entries"]) == 1
    assert ledger["entries"][0]["debit"] == 16000.0


def test_case_2_no_joining_date(db):
    # Monthly salary: 30000, Joining date: null, No payments
    emp = create_test_employee(db, name="Emp Case 2", salary=30000.0, joining_date=None)

    ledger = payroll_services.calculate_employee_salary_ledger(db, emp.id)

    assert ledger["policy"]["carry_forward_enabled"] is False
    assert "disabled" in ledger["policy"]["notice"].lower()
    assert ledger["summary"]["current_month_remaining"] == 30000.0
    assert len(ledger["entries"]) == 1
    assert ledger["entries"][0]["debit"] == 30000.0


def test_case_3_no_joining_date_partial_payment(db):
    emp = create_test_employee(db, name="Emp Case 3", salary=30000.0, joining_date=None)
    today = date.today()

    # Pay 10,000 for current month
    payroll_crud.create_salary_payment(
        db,
        schemas.SalaryPaymentCreate(
            employee_id=emp.id,
            month=today.month,
            year=today.year,
            amount=10000.0,
            payment_date=today,
        ),
    )

    ledger = payroll_services.calculate_employee_salary_ledger(db, emp.id)
    assert ledger["policy"]["carry_forward_enabled"] is False
    assert ledger["summary"]["current_month_paid"] == 10000.0
    assert ledger["summary"]["current_month_remaining"] == 20000.0


def test_case_4_joining_date_historical_unpaid_salary(db):
    # Joining date: Jan 1, 2026. Monthly salary: 15,000.
    emp = create_test_employee(
        db, name="Emp Case 4", salary=15000.0, joining_date=date(2026, 1, 1)
    )

    # Jan paid: 0, Feb paid: 5,000
    payroll_crud.create_salary_payment(
        db,
        schemas.SalaryPaymentCreate(
            employee_id=emp.id,
            month=2,
            year=2026,
            amount=5000.0,
            payment_date=date(2026, 2, 15),
        ),
    )

    # Check through Feb 28, 2026
    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 2, 28)
    )

    assert ledger["summary"]["total_accrued"] == 30000.0
    assert ledger["summary"]["total_paid"] == 5000.0
    assert ledger["summary"]["outstanding_balance"] == 25000.0


def test_case_5_future_joining_date(db):
    # Joining date: 2099-01-01 (future)
    emp = create_test_employee(
        db, name="Emp Case 5", salary=30000.0, joining_date=date(2099, 1, 1)
    )

    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 7, 20)
    )

    assert ledger["summary"]["total_accrued"] == 0.0
    assert ledger["summary"]["outstanding_balance"] == 0.0


def test_case_6_salary_rate_change(db):
    # Jan 1: 10,000. Effective March 1: 15,000.
    emp = create_test_employee(
        db, name="Emp Case 6", salary=10000.0, joining_date=date(2026, 1, 1)
    )

    # Record salary history change effective March 1, 2026
    payroll_crud.create_salary_history(
        db,
        emp,
        schemas.SalaryHistoryCreate(
            new_salary=15000.0,
            new_currency="AFN",
            effective_date=date(2026, 3, 1),
            reason="Performance promotion",
        ),
        changed_by="Admin",
    )

    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 4, 30)
    )

    # Jan: 10k, Feb: 10k, Mar: 15k, Apr: 15k => Total: 50,000
    accruals = [e for e in ledger["entries"] if e["entry_type"] == "salary_accrual"]
    assert accruals[0]["debit"] == 10000.0  # Jan
    assert accruals[1]["debit"] == 10000.0  # Feb
    assert accruals[2]["debit"] == 15000.0  # Mar
    assert accruals[3]["debit"] == 15000.0  # Apr
    assert ledger["summary"]["total_accrued"] == 50000.0


def test_case_7_terminated_employee(db):
    # Joining date: Jan 1, 2026. Termination date: March 15, 2026 (15 days in March).
    # Monthly salary: 31,000. March proration: 31,000 / 31 * 15 = 15,000.
    emp = create_test_employee(
        db,
        name="Emp Case 7",
        salary=31000.0,
        joining_date=date(2026, 1, 1),
        end_date=date(2026, 3, 15),
    )

    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 5, 31)
    )
    accruals = [e for e in ledger["entries"] if e["entry_type"] == "salary_accrual"]

    assert len(accruals) == 3
    assert accruals[0]["debit"] == 31000.0  # Jan
    assert accruals[1]["debit"] == 31000.0  # Feb
    assert accruals[2]["debit"] == 15000.0  # Mar prorated to 15th
    assert ledger["summary"]["total_accrued"] == 77000.0


def test_case_8_partial_multiple_payments_cashbook(db):
    emp = create_test_employee(
        db, name="Emp Case 8", salary=20000.0, joining_date=date(2026, 1, 1)
    )

    p1 = payroll_crud.create_salary_payment(
        db,
        schemas.SalaryPaymentCreate(
            employee_id=emp.id,
            month=1,
            year=2026,
            amount=5000.0,
            payment_date=date(2026, 1, 15),
        ),
    )
    p2 = payroll_crud.create_salary_payment(
        db,
        schemas.SalaryPaymentCreate(
            employee_id=emp.id,
            month=1,
            year=2026,
            amount=10000.0,
            payment_date=date(2026, 1, 20),
        ),
    )

    ledger = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 1, 31)
    )

    # 20k accrued - 15k paid = 5k balance
    assert ledger["summary"]["total_paid"] == 15000.0
    assert ledger["summary"]["outstanding_balance"] == 5000.0

    # Verify linked Cashbook entries created
    tx1 = crud_transactions.get_transaction(db, p1.cashbook_entry_id)
    tx2 = crud_transactions.get_transaction(db, p2.cashbook_entry_id)
    assert tx1 is not None and tx1.cash_out_afn == 5000.0
    assert tx2 is not None and tx2.cash_out_afn == 10000.0


def test_case_9_multiple_currencies(db):
    emp_afn = create_test_employee(
        db,
        name="Emp AFN",
        salary=20000.0,
        joining_date=date(2026, 1, 1),
        currency="AFN",
    )
    emp_usd = create_test_employee(
        db, name="Emp USD", salary=500.0, joining_date=date(2026, 1, 1), currency="USD"
    )

    ledger_afn = payroll_services.calculate_employee_salary_ledger(
        db, emp_afn.id, to_date=date(2026, 1, 31)
    )
    ledger_usd = payroll_services.calculate_employee_salary_ledger(
        db, emp_usd.id, to_date=date(2026, 1, 31)
    )

    assert ledger_afn["employee"]["currency"] == "AFN"
    assert ledger_afn["summary"]["total_accrued"] == 20000.0

    assert ledger_usd["employee"]["currency"] == "USD"
    assert ledger_usd["summary"]["total_accrued"] == 500.0


def test_case_10_backup_restore_ledger_equivalence(db):
    emp = create_test_employee(
        db, name="Emp Case 10", salary=25000.0, joining_date=date(2026, 1, 1)
    )
    payroll_crud.create_salary_payment(
        db,
        schemas.SalaryPaymentCreate(
            employee_id=emp.id,
            month=1,
            year=2026,
            amount=10000.0,
            payment_date=date(2026, 1, 20),
        ),
    )
    payroll_crud.create_salary_adjustment(
        db,
        emp.id,
        schemas.EmployeeSalaryAdjustmentCreate(
            date=date(2026, 1, 25),
            period="2026-01",
            amount=2000.0,
            adjustment_type="bonus",
            reason="Performance bonus",
        ),
    )

    ledger_before = payroll_services.calculate_employee_salary_ledger(
        db, emp.id, to_date=date(2026, 1, 31)
    )

    # Perform backup export
    from fastapi.encoders import jsonable_encoder

    backup = jsonable_encoder(crud_backups.backup_payload(db))

    # Restore backup in clean database
    engine2 = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine2)
    Session2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
    db2 = Session2()
    crud._ensure_settings(db2)

    crud_backups.import_backup(db2, backup, replace_all=True)

    emp2 = (
        db2.query(models.Employee)
        .filter(models.Employee.full_name == "Emp Case 10")
        .first()
    )

    ledger_after = payroll_services.calculate_employee_salary_ledger(
        db2, emp2.id, to_date=date(2026, 1, 31)
    )

    assert ledger_before["summary"] == ledger_after["summary"]
    assert len(ledger_before["entries"]) == len(ledger_after["entries"])
    assert (
        ledger_before["entries"][0]["running_balance"]
        == ledger_after["entries"][0]["running_balance"]
    )
