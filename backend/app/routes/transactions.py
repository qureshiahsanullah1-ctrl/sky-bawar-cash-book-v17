from __future__ import annotations

import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import transactions as crud_transactions, reports as crud_reports
from ..auth_dependencies import get_current_tenant, require_authenticated_request
from ..database import get_db

router = APIRouter(
    prefix="/api/transactions",
    tags=["transactions"],
    dependencies=[Depends(require_authenticated_request)],
)

@router.get("", response_model=list[schemas.TransactionRead])
@router.get("/", response_model=list[schemas.TransactionRead], include_in_schema=False)
def read_transactions(
    group_id: int | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=10000),
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    return crud_reports.filtered_transactions(
        db, user=user, group_id=group_id, branch_id=branch_id, skip=skip, limit=limit
    )


@router.get("/summary", response_model=schemas.SummaryResponse)
def read_summary(
    group_id: int | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    return crud_reports.summary(db, user=user, group_id=group_id, branch_id=branch_id)


@router.get("/filter", response_model=list[schemas.TransactionRead])
def filter_transactions(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    type: str | None = Query(default=None),
    account: str | None = Query(default=None),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    payment_method: str | None = Query(default=None),
    group_id: int | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=10000),
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    return crud_reports.filtered_transactions(
        db,
        user=user,
        start_date=start_date,
        end_date=end_date,
        type=type,
        account=account,
        search=search,
        category=category,
        payment_method=payment_method,
        group_id=group_id,
        branch_id=branch_id,
        skip=skip,
        limit=limit,
    )


@router.get("/today", response_model=list[schemas.TransactionRead])
def today_transactions(
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    today = date.today()
    return crud_reports.filtered_transactions(db, user=user, start_date=today, end_date=today)


@router.get("/monthly", response_model=list[schemas.TransactionRead])
def monthly_transactions(
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    today = date.today()
    start = today.replace(day=1)
    return crud_reports.filtered_transactions(db, user=user, start_date=start, end_date=today)


@router.get("/yearly", response_model=list[schemas.TransactionRead])
def yearly_transactions(
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    today = date.today()
    start = today.replace(month=1, day=1)
    return crud_reports.filtered_transactions(db, user=user, start_date=start, end_date=today)


@router.get("/export")
def export_transactions(
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    txs = crud_reports.filtered_transactions(db, user=user)

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Type", "Category", "Amount", "Remarks"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for tx in txs:
            tx_type = "Cash In" if tx.transaction_type == "cash_in" else "Cash Out"
            if tx.transaction_type == "cash_in":
                amount_str = (
                    f"{tx.usd_in:,.2f} USD"
                    if tx.usd_in > 0
                    else f"{tx.cash_in_afn:,.2f} AFN"
                )
            else:
                amount_str = (
                    f"{tx.usd_out:,.2f} USD"
                    if tx.usd_out > 0
                    else f"{tx.cash_out_afn:,.2f} AFN"
                )

            remarks = tx.detail
            if tx.note:
                remarks += f" - {tx.note}"

            writer.writerow(
                [
                    (
                        tx.date.isoformat()
                        if hasattr(tx.date, "isoformat")
                        else str(tx.date)
                    ),
                    tx_type,
                    tx.category.replace("_", " ").title(),
                    amount_str,
                    remarks,
                ]
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=cashbook_transactions.csv"
        },
    )


@router.get("/export/csv")
def export_ledger_csv(
    branch: str | None = Query(None),
    user: models.User = Depends(require_authenticated_request),
    tenant_id: str = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    txs = crud_reports.filtered_transactions(db, user=user)
    if branch and not branch.startswith("All"):
        txs = [
            t
            for t in txs
            if getattr(t, "branch_name", "") == branch
            or getattr(t, "branch_id", "") == branch
        ]

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(
        [
            "Transaction ID",
            "Date",
            "Branch",
            "Account / Ref",
            "Description",
            "Type",
            "Amount",
            "Running Balance",
        ]
    )

    running_bal = 0.0
    for tx in txs:
        is_in = tx.transaction_type == "cash_in"
        amount = (
            (tx.usd_in or tx.cash_in_afn) if is_in else (tx.usd_out or tx.cash_out_afn)
        )
        amount_val = float(amount or 0.0)
        running_bal += amount_val if is_in else -amount_val
        writer.writerow(
            [
                tx.id,
                tx.date.isoformat() if hasattr(tx.date, "isoformat") else str(tx.date),
                getattr(tx, "branch_name", "Main Branch"),
                tx.account_name,
                tx.detail,
                "CREDIT" if is_in else "DEBIT",
                f"{amount_val:.2f}",
                f"{running_bal:.2f}",
            ]
        )

    stream.seek(0)
    clean_branch = (
        "consolidated"
        if not branch or branch.startswith("All")
        else branch.lower().replace(" ", "_")
    )
    filename = (
        f"{tenant_id}_{clean_branch}_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{transaction_id}", response_model=schemas.TransactionRead)
def read_transaction(
    transaction_id: int,
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    tx = crud_transactions.get_transaction(db, transaction_id, user=user)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


from ..auth_dependencies import get_current_tenant, require_authenticated_request


@router.post("", response_model=schemas.TransactionRead, status_code=201)
@router.post("/", response_model=schemas.TransactionRead, status_code=201, include_in_schema=False)
def create_transaction(
    payload: schemas.TransactionCreate,
    user: models.User = Depends(require_authenticated_request),
    tenant_id: str = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    if (
        payload.company_id
        and payload.company_id != tenant_id
        and tenant_id not in payload.company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Cross-tenant transaction modification is prohibited.",
        )
    if user.role in ["Branch Manager", "Clerk"]:
        if payload.branch_id and payload.branch_id != user.assigned_branch_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot create transaction for another branch",
            )
        payload.branch_id = user.assigned_branch_id
    try:
        return crud_transactions.create_transaction(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Transaction recording error: {str(error)}"
        ) from error


@router.put("/{transaction_id}", response_model=schemas.TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: schemas.TransactionUpdate,
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    if user.role == "Clerk":
        raise HTTPException(
            status_code=403, detail="Forbidden: Clerks cannot modify transactions"
        )
    tx = crud_transactions.get_transaction(db, transaction_id, user=user)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if user.role == "Branch Manager":
        if payload.branch_id and payload.branch_id != user.assigned_branch_id:
            raise HTTPException(
                status_code=403, detail="Forbidden: Cannot change branch assignment"
            )
        payload.branch_id = user.assigned_branch_id
    try:
        return crud_transactions.update_transaction(db, tx, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Transaction update error: {str(error)}"
        ) from error


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    user: models.User = Depends(require_authenticated_request),
    db: Session = Depends(get_db),
):
    if user.role == "Clerk":
        raise HTTPException(
            status_code=403, detail="Forbidden: Clerks cannot delete transactions"
        )
    tx = crud_transactions.get_transaction(db, transaction_id, user=user)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    try:
        crud_transactions.delete_transaction(db, tx)
        return {"ok": True}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Transaction deletion error: {str(error)}"
        ) from error


@router.get("/filter")
def filter_ledger_transactions(
    search: str | None = Query(None),
    account: str | None = Query("ALL"),
    date_range: str | None = Query("ALL_TIME"),
    branch: str | None = Query(None),
    user: models.User = Depends(require_authenticated_request),
    tenant_id: str = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    txs = crud_reports.filtered_transactions(db, user=user)
    if branch and not branch.startswith("All"):
        txs = [
            t
            for t in txs
            if getattr(t, "branch_name", "") == branch
            or getattr(t, "branch_id", "") == branch
        ]
    if account and account != "ALL":
        txs = [t for t in txs if t.account_name == account]
    if search and search.strip():
        term = search.lower()
        txs = [
            t
            for t in txs
            if term in (t.detail or "").lower()
            or term in (t.account_name or "").lower()
            or term in (t.note or "").lower()
        ]

    today = date.today()
    if date_range == "TODAY":
        txs = [t for t in txs if t.date == today]
    elif date_range == "THIS_WEEK":
        week_ago = today - timedelta(days=7)
        txs = [t for t in txs if t.date >= week_ago]
    elif date_range == "THIS_MONTH":
        month_start = today.replace(day=1)
        txs = [t for t in txs if t.date >= month_start]

    return {"status": "success", "count": len(txs), "records": txs}


@router.post("/dual-currency")
def create_dual_currency_tx(
    payload: schemas.TransactionCreate,
    user: models.User = Depends(require_authenticated_request),
    tenant_id: str = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    if (
        payload.company_id
        and payload.company_id != tenant_id
        and tenant_id not in payload.company_id
    ):
        raise HTTPException(status_code=403, detail="Tenant mismatch detected.")
    try:
        tx = crud_transactions.create_transaction(db, payload)
        return {
            "status": "success",
            "message": f"Recorded transaction at exchange rate {payload.exchange_rate}",
            "data": tx,
        }
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Dual-currency transaction error: {str(error)}"
        ) from error
