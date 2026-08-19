from __future__ import annotations

import re

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_

from sqlalchemy.orm import Session

from .. import models, schemas

from ..csv_import import parse_cashbook_csv


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _normalize_text(value: str | None) -> str:
    if value in (None, ""):
        return ""
    return str(value).strip()


def _amount(value) -> float:
    try:
        if isinstance(value, str):
            cleaned = re.sub(r"[^0-9.\-]", "", value.replace(",", ""))
            value = cleaned or 0
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _date_value(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        text = text.replace("Z", "+00:00")
        for parser in (date.fromisoformat, datetime.fromisoformat):
            try:
                parsed = parser(text)
                return parsed.date() if isinstance(parsed, datetime) else parsed
            except ValueError:
                continue
        for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%m-%d-%Y"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
    return value


def _datetime_value(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            parsed_date = _date_value(text)
            return (
                datetime.combine(parsed_date, datetime.min.time())
                if isinstance(parsed_date, date)
                else None
            )
    return value


def _first_value(data: dict, *keys, default=None):
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default


def _rows_from(payload: dict, *keys) -> list:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            if isinstance(value.get("rows"), list):
                return value["rows"]
            if isinstance(value.get("data"), list):
                return value["data"]
            if value and all(isinstance(item, dict) for item in value.values()):
                return list(value.values())
    return []


def _id_key(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return str(value)


def _map_imported(mapping: dict, original_id, value) -> None:
    key = _id_key(original_id)
    if key is None:
        return
    mapping[key] = value
    mapping[str(key)] = value


def _get_imported(mapping: dict, original_id):
    key = _id_key(original_id)
    if key is None:
        return None
    return mapping.get(key) or mapping.get(str(key))


def _choice(
    value, allowed: set[str], default: str, aliases: dict[str, str] | None = None
) -> str:
    text = _normalize_text(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    aliases = aliases or {}
    return aliases.get(text) or (text if text in allowed else default)


def _backup_root(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Backup file must be a JSON object.")
    for key in ("payload", "backup", "data"):
        nested = payload.get(key)
        if isinstance(nested, dict) and any(
            marker in nested
            for marker in (
                "settings",
                "accounts",
                "employees",
                "transactions",
                "records",
            )
        ):
            payload = nested
            break
    if "transactions" not in payload:
        for key in ("records", "cashbook", "cash_book", "entries"):
            if key in payload:
                payload = {**payload, "transactions": payload[key]}
                break
    return payload


def _normalize_settings_backup(settings_data: dict) -> dict:
    if not isinstance(settings_data, dict):
        return {}
    date_format = _choice(
        _first_value(
            settings_data,
            "date_display_format",
            "dateFormat",
            "calendar_format",
            default="dual",
        ),
        {"persian", "gregorian", "dual"},
        "dual",
        {
            "english": "gregorian",
            "jalali": "persian",
            "shamsi": "persian",
            "both": "dual",
        },
    )
    default_exchange_rate = _first_value(
        settings_data,
        "default_exchange_rate",
        "defaultExchangeRate",
        "exchange_rate",
        "exchangeRate",
    )
    normalized = {
        "company_name": _first_value(
            settings_data, "company_name", "companyName", "name"
        ),
        "company_phone": _first_value(
            settings_data, "company_phone", "companyPhone", "phone"
        ),
        "company_email": _first_value(
            settings_data, "company_email", "companyEmail", "email"
        ),
        "company_website": _first_value(
            settings_data, "company_website", "companyWebsite", "website"
        ),
        "company_tax_number": _first_value(
            settings_data, "company_tax_number", "companyTaxNumber", "tax_number"
        ),
        "company_logo": _first_value(
            settings_data, "company_logo", "companyLogo", "logo"
        ),
        "company_address": _first_value(
            settings_data, "company_address", "companyAddress", "address"
        ),
        "company_license": _first_value(
            settings_data, "company_license", "companyLicense", "license"
        ),
        "default_exchange_rate": (
            _amount(default_exchange_rate)
            if default_exchange_rate not in (None, "")
            else None
        ),
        "default_currency": str(
            _first_value(
                settings_data,
                "default_currency",
                "defaultCurrency",
                "currency",
                default="AFN",
            )
            or "AFN"
        ).upper(),
        "theme": _first_value(settings_data, "theme", default="dark"),
        "language": _first_value(settings_data, "language", default="English"),
        "date_display_format": date_format,
        "print_footer_text": _first_value(
            settings_data, "print_footer_text", "printFooterText", "footer"
        ),
        "auto_logout_minutes": int(
            _amount(
                _first_value(
                    settings_data,
                    "auto_logout_minutes",
                    "autoLogoutMinutes",
                    default=30,
                )
            )
            or 30
        ),
    }
    return {key: value for key, value in normalized.items() if value is not None}


def _normalize_account_backup(account_data: dict) -> dict | None:
    if not isinstance(account_data, dict):
        return None
    name = _normalize_text(
        _first_value(
            account_data,
            "name",
            "account_name",
            "accountName",
            "customer",
            "customer_name",
            "person",
            "party",
            "full_name",
        )
    )
    if not name:
        return None
    return {
        "name": name,
        "account_type": _choice(
            _first_value(account_data, "account_type", "accountType", "type"),
            {"customer", "supplier", "worker", "factory", "expense", "other"},
            "other",
            {
                "client": "customer",
                "employee": "worker",
                "staff": "worker",
                "vendor": "supplier",
                "company": "supplier",
            },
        ),
        "phone": _normalize_text(
            _first_value(account_data, "phone", "mobile", "contact")
        ),
        "address": _normalize_text(_first_value(account_data, "address", "location")),
        "opening_balance_afn": _amount(
            _first_value(
                account_data,
                "opening_balance_afn",
                "openingBalanceAfn",
                "opening_balance",
                "balance_afn",
                "balance",
            )
        ),
        "opening_balance_usd": _amount(
            _first_value(
                account_data, "opening_balance_usd", "openingBalanceUsd", "balance_usd"
            )
        ),
        "note": _normalize_text(
            _first_value(account_data, "note", "notes", "description")
        ),
    }


def _normalize_employee_backup(employee_data: dict) -> dict | None:
    if not isinstance(employee_data, dict):
        return None
    full_name = _normalize_text(
        _first_value(
            employee_data,
            "full_name",
            "fullName",
            "employee_name",
            "employeeName",
            "name",
        )
    )
    if not full_name:
        return None
    joining_date = _date_value(
        _first_value(employee_data, "joining_date", "joiningDate", "date_joined")
    )
    employment_end_date = _date_value(
        _first_value(
            employee_data,
            "employment_end_date",
            "employmentEndDate",
            "end_date",
            "endDate",
            "termination_date",
            "terminationDate",
        )
    )
    return {
        "full_name": full_name,
        "father_name": _normalize_text(
            _first_value(employee_data, "father_name", "fatherName", "father")
        ),
        "phone": _normalize_text(
            _first_value(employee_data, "phone", "mobile", "contact")
        ),
        "position": _normalize_text(
            _first_value(
                employee_data,
                "position",
                "role",
                "job_title",
                "jobTitle",
                "designation",
            )
        )
        or "Employee",
        "department": _normalize_text(
            _first_value(employee_data, "department", "section")
        ),
        "joining_date": joining_date,
        "employment_end_date": employment_end_date,
        "monthly_salary": _amount(
            _first_value(
                employee_data, "monthly_salary", "monthlySalary", "salary", "salary_afn"
            )
        ),
        "currency": (
            "USD"
            if str(_first_value(employee_data, "currency", default="AFN")).upper()
            == "USD"
            else "AFN"
        ),
        "avatar_url": _normalize_text(
            _first_value(
                employee_data,
                "avatar_url",
                "avatarUrl",
                "avatar",
                "avatar_path",
                "avatarPath",
            )
        ),
        "status": _choice(
            _first_value(employee_data, "status", "is_active", "active"),
            {"active", "inactive"},
            "active",
            {"true": "active", "false": "inactive", "1": "active", "0": "inactive"},
        ),
        "notes": _normalize_text(_first_value(employee_data, "notes", "note")),
    }


def _transaction_type_from_backup(
    tx_data: dict,
    cash_in_afn: float,
    cash_out_afn: float,
    usd_in: float,
    usd_out: float,
) -> str:
    tx_type = _choice(
        _first_value(
            tx_data, "transaction_type", "transactionType", "type", "kind", "direction"
        ),
        {"cash_in", "cash_out"},
        "",
        {
            "cashin": "cash_in",
            "in": "cash_in",
            "income": "cash_in",
            "credit": "cash_in",
            "receive": "cash_in",
            "received": "cash_in",
            "cashout": "cash_out",
            "out": "cash_out",
            "expense": "cash_out",
            "debit": "cash_out",
            "payment": "cash_out",
            "paid": "cash_out",
        },
    )
    if tx_type:
        return tx_type
    amount = _amount(_first_value(tx_data, "amount", "total"))
    if cash_in_afn or usd_in or amount > 0:
        return "cash_in"
    if cash_out_afn or usd_out or amount < 0:
        return "cash_out"
    return "cash_out"


def _normalize_transaction_backup(tx_data: dict) -> dict | None:
    if not isinstance(tx_data, dict):
        return None
    tx_date = _date_value(
        _first_value(
            tx_data,
            "date",
            "transaction_date",
            "transactionDate",
            "created_at",
            "createdAt",
        )
    )
    account_name = (
        _normalize_text(
            _first_value(
                tx_data,
                "account_name",
                "accountName",
                "account",
                "name",
                "customer",
                "customer_name",
                "person",
                "party",
                "employee_name",
            )
        )
        or "Imported Account"
    )
    cash_in_afn = _amount(
        _first_value(
            tx_data, "cash_in_afn", "cashInAfn", "cash_in", "cashIn", "afn_in", "afnIn"
        )
    )
    cash_out_afn = _amount(
        _first_value(
            tx_data,
            "cash_out_afn",
            "cashOutAfn",
            "cash_out",
            "cashOut",
            "afn_out",
            "afnOut",
        )
    )
    usd_in = _amount(_first_value(tx_data, "usd_in", "usdIn", "dollar_in", "dollarIn"))
    usd_out = _amount(
        _first_value(tx_data, "usd_out", "usdOut", "dollar_out", "dollarOut")
    )
    tx_type = _transaction_type_from_backup(
        tx_data, cash_in_afn, cash_out_afn, usd_in, usd_out
    )
    amount = _amount(_first_value(tx_data, "amount", "total"))
    if amount and not any((cash_in_afn, cash_out_afn, usd_in, usd_out)):
        if tx_type == "cash_in":
            cash_in_afn = abs(amount)
        else:
            cash_out_afn = abs(amount)
    exchange_rate = _amount(
        _first_value(tx_data, "exchange_rate", "exchangeRate", "rate")
    )
    if (usd_in or usd_out) and not exchange_rate:
        exchange_rate = 64.3
    return {
        "id": _id_key(_first_value(tx_data, "id", "transaction_id", "transactionId")),
        "date": tx_date or date.today(),
        "account_id": _id_key(_first_value(tx_data, "account_id", "accountId")),
        "employee_id": _id_key(_first_value(tx_data, "employee_id", "employeeId")),
        "salary_month": _date_value(
            _first_value(tx_data, "salary_month", "salaryMonth", "month")
        ),
        "payroll_kind": _choice(
            _first_value(tx_data, "payroll_kind", "payrollKind"),
            {"salary", "advance"},
            None,
        ),
        "account_name": account_name,
        "detail": _normalize_text(
            _first_value(
                tx_data,
                "detail",
                "description",
                "memo",
                "particulars",
                "reason",
                "note",
            )
        )
        or "Imported transaction",
        "transaction_type": tx_type,
        "cash_in_afn": cash_in_afn,
        "cash_out_afn": cash_out_afn,
        "usd_in": usd_in,
        "usd_out": usd_out,
        "exchange_rate": exchange_rate,
        "converted_afn": _amount(
            _first_value(tx_data, "converted_afn", "convertedAfn", "afn_amount")
        ),
        "payment_method": _choice(
            _first_value(tx_data, "payment_method", "paymentMethod", "method"),
            {"cash", "bank", "hawala", "other"},
            "cash",
            {"transfer": "bank", "card": "bank", "cheque": "bank", "check": "bank"},
        ),
        "category": _choice(
            _first_value(tx_data, "category", "expense_category", "expenseCategory"),
            {
                "salary",
                "rent",
                "factory_expense",
                "home_expense",
                "bottles_account",
                "office_expense",
                "other",
            },
            "other",
            {
                "factory": "factory_expense",
                "home": "home_expense",
                "office": "office_expense",
                "bottle": "bottles_account",
                "bottles": "bottles_account",
                "employee_salary": "salary",
            },
        ),
        "note": _normalize_text(_first_value(tx_data, "note", "notes", "remarks")),
    }


