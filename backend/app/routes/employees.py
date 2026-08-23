from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import schemas
from ..crud import payroll as payroll_crud
from ..services import payroll as payroll_services
from ..auth_dependencies import (
    require_administrator_request,
    require_authenticated_request,
)
from ..database import get_db

router = APIRouter(
    prefix="/api/employees",
    tags=["employees"],
    dependencies=[Depends(require_authenticated_request)],
)

@router.get("", response_model=list[schemas.EmployeeRead])
@router.get("/", response_model=list[schemas.EmployeeRead], include_in_schema=False)
def read_employees(db: Session = Depends(get_db)):
    result = []
    for employee in payroll_crud.list_employees(db):
        active = payroll_services.effective_salary(db, employee, date.today())
        data = schemas.EmployeeRead.model_validate(employee).model_dump()
        data["monthly_salary"] = active["salary"]
        data["currency"] = active["currency"]
        result.append(data)
    return result


@router.post("", response_model=schemas.EmployeeRead, status_code=201)
@router.post("/", response_model=schemas.EmployeeRead, status_code=201, include_in_schema=False)
def add_employee(payload: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    try:
        return payroll_crud.create_employee(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/salary-report", response_model=schemas.SalaryReportResponse)
def read_salary_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return payroll_services.salary_report(db, month, year)


@router.get("/salary-summary", response_model=schemas.SalarySummaryTotals)
def read_salary_summary_totals(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return payroll_services.salary_report(db, month, year)["summary"]


@router.post(
    "/salary-payments", response_model=schemas.SalaryPaymentRead, status_code=201
)
def add_salary_payment(
    payload: schemas.SalaryPaymentCreate, db: Session = Depends(get_db)
):
    try:
        return payroll_crud.create_salary_payment(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.put("/salary-payments/{payment_id}", response_model=schemas.SalaryPaymentRead)
def edit_salary_payment(
    payment_id: int, payload: schemas.SalaryPaymentUpdate, db: Session = Depends(get_db)
):
    payment = payroll_crud.get_salary_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Salary payment not found")
    try:
        return payroll_crud.update_salary_payment(db, payment, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/salary-payments/{payment_id}")
def remove_salary_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = payroll_crud.get_salary_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Salary payment not found")
    payroll_crud.delete_salary_payment(db, payment)
    return {"ok": True}


@router.get("/salary-changes", response_model=list[schemas.SalaryChangeReportRow])
def read_salary_change_report(db: Session = Depends(get_db)):
    return payroll_services.salary_change_report(db)


@router.put("/{employee_id}", response_model=schemas.EmployeeRead)
def edit_employee(
    employee_id: int,
    payload: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
):
    employee = payroll_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    try:
        return payroll_crud.update_employee(db, employee, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/{employee_id}")
def remove_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    employee = payroll_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    payroll_crud.delete_employee(db, employee)
    return {"ok": True, "deleted_employee_id": employee_id}


@router.get(
    "/{employee_id}/salary-history", response_model=list[schemas.SalaryHistoryRead]
)
def read_employee_salary_history(employee_id: int, db: Session = Depends(get_db)):
    employee = payroll_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return payroll_crud.salary_history_for_employee(db, employee_id)


@router.post(
    "/{employee_id}/salary-history",
    response_model=schemas.SalaryHistoryRead,
    status_code=201,
)
def change_employee_salary(
    employee_id: int,
    payload: schemas.SalaryHistoryCreate,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    employee = payroll_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    try:
        return payroll_crud.create_salary_history(
            db,
            employee,
            payload,
            administrator.full_name or administrator.username,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/{employee_id}/salary-summary")
def read_salary_summary(
    employee_id: int,
    month: date = Query(...),
    db: Session = Depends(get_db),
):
    try:
        return payroll_crud.employee_salary_summary(db, employee_id, month)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get(
    "/{employee_id}/salary-ledger", response_model=schemas.EmployeeLedgerResponse
)
def read_employee_salary_ledger(
    employee_id: int,
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    currency: str | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    try:
        return payroll_services.calculate_employee_salary_ledger(
            db,
            employee_id=employee_id,
            from_date=from_date,
            to_date=to_date,
            currency=currency,
            branch_id=branch_id,
            page=page,
            page_size=page_size,
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get(
    "/{employee_id}/adjustments",
    response_model=list[schemas.EmployeeSalaryAdjustmentRead],
)
def read_employee_salary_adjustments(employee_id: int, db: Session = Depends(get_db)):
    employee = payroll_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return payroll_crud.list_salary_adjustments(db, employee_id)


@router.post(
    "/{employee_id}/adjustments",
    response_model=schemas.EmployeeSalaryAdjustmentRead,
    status_code=201,
)
def add_employee_salary_adjustment(
    employee_id: int,
    payload: schemas.EmployeeSalaryAdjustmentCreate,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    try:
        return payroll_crud.create_salary_adjustment(
            db,
            employee_id,
            payload,
            administrator.full_name or administrator.username,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete(
    "/{employee_id}/adjustments/{adjustment_id}",
    status_code=200,
)
def delete_employee_salary_adjustment(
    employee_id: int,
    adjustment_id: int,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    payroll_crud.delete_salary_adjustment(db, adjustment_id)
    return {"ok": True, "message": "Salary adjustment deleted successfully"}

