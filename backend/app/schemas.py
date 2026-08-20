from __future__ import annotations

from datetime import date as DateType, datetime
from typing import Dict, List, Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator
from .utils import sanitize_xss


class AccountBase(BaseModel):
    name: str
    account_type: Literal[
        "customer", "supplier", "worker", "factory", "bank", "expense", "other"
    ] = "other"
    phone: str = ""
    address: str = ""
    opening_balance_afn: float = 0
    opening_balance_usd: float = 0
    note: str = ""

    @field_validator("name", "phone", "address", "note", mode="before")
    @classmethod
    def sanitize_account_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[
        Literal["customer", "supplier", "worker", "factory", "bank", "expense", "other"]
    ] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance_afn: Optional[float] = None
    opening_balance_usd: Optional[float] = None
    note: Optional[str] = None

    @field_validator("name", "phone", "address", "note", mode="before")
    @classmethod
    def sanitize_account_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class TransactionBase(BaseModel):
    date: DateType
    account_id: Optional[int] = None
    employee_id: Optional[int] = None
    salary_month: Optional[DateType] = None
    payroll_kind: Optional[Literal["salary", "advance"]] = None
    branch_id: Optional[int] = None
    company_id: Optional[str] = None
    account_name: Optional[str] = ""
    detail: Optional[str] = ""
    transaction_type: Literal["cash_in", "cash_out"]
    cash_in_afn: float = Field(default=0, ge=0)
    cash_out_afn: float = Field(default=0, ge=0)
    usd_in: float = Field(default=0, ge=0)
    usd_out: float = Field(default=0, ge=0)
    exchange_rate: float = Field(default=0, ge=0)
    converted_afn: float = Field(default=0, ge=0)
    payment_method: str = "cash"
    category: str = "other"
    note: str = ""

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, v):
        if not v or not isinstance(v, str):
            return "cash"
        val = v.strip().lower()
        if val in ["cash", "bank", "hawala", "other"]:
            return val
        return "cash"

    @field_validator("salary_month", mode="before")
    @classmethod
    def normalize_salary_month(cls, v):
        if not v or v == "" or str(v).strip() == "":
            return None
        return v

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v):
        if not v or not isinstance(v, str):
            return "other"
        val = v.strip().lower().replace(" ", "_").replace("-", "_")
        valid_cats = ["salary", "rent", "factory_expense", "home_expense", "bottles_account", "office_expense", "other"]
        if val in valid_cats:
            return val
        return "other"

    @field_validator("account_name", "detail", "note", mode="before")
    @classmethod
    def sanitize_transaction_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v or ""


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: Optional[DateType] = None
    account_id: Optional[int] = None
    employee_id: Optional[int] = None
    salary_month: Optional[DateType] = None
    payroll_kind: Optional[Literal["salary", "advance"]] = None
    branch_id: Optional[int] = None
    account_name: Optional[str] = None
    detail: Optional[str] = None
    transaction_type: Optional[Literal["cash_in", "cash_out"]] = None
    cash_in_afn: Optional[float] = Field(default=None, ge=0)
    cash_out_afn: Optional[float] = Field(default=None, ge=0)
    usd_in: Optional[float] = Field(default=None, ge=0)
    usd_out: Optional[float] = Field(default=None, ge=0)
    exchange_rate: Optional[float] = Field(default=None, ge=0)
    converted_afn: Optional[float] = Field(default=None, ge=0)
    payment_method: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method_update(cls, v):
        if v is None:
            return None
        if not isinstance(v, str):
            return "cash"
        val = v.strip().lower()
        if val in ["cash", "bank", "hawala", "other"]:
            return val
        return "cash"

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_update(cls, v):
        if v is None:
            return None
        if not isinstance(v, str):
            return "other"
        val = v.strip().lower().replace(" ", "_").replace("-", "_")
        valid_cats = ["salary", "rent", "factory_expense", "home_expense", "bottles_account", "office_expense", "other"]
        if val in valid_cats:
            return val
        return "other"

    @field_validator("account_name", "detail", "note", mode="before")
    @classmethod
    def sanitize_transaction_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class SettingBase(BaseModel):
    company_name: str = "Cashbook Of All companies"
    company_phone: str = ""
    company_email: str = ""
    company_website: str = ""
    company_tax_number: str = ""
    company_logo: str = ""
    company_address: str = ""
    company_license: str = ""
    default_exchange_rate: float = 64.3
    default_currency: str = "AFN"
    theme: str = "dark"
    language: str = "English"
    date_display_format: Literal["persian", "gregorian", "dual"] = "dual"
    print_footer_text: str = "Prepared by Cashbook Of All companies"
    auto_logout_minutes: int = 30


class SettingUpdate(BaseModel):
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_tax_number: Optional[str] = None
    company_logo: Optional[str] = None
    company_address: Optional[str] = None
    company_license: Optional[str] = None
    default_exchange_rate: Optional[float] = None
    default_currency: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    date_display_format: Optional[Literal["persian", "gregorian", "dual"]] = None
    print_footer_text: Optional[str] = None
    auto_logout_minutes: Optional[int] = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    full_name: str
    username: str
    role: str
    avatar_path: str = ""
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    must_change_password: bool = False
    assigned_group_id: Optional[int] = None
    assigned_branch_id: Optional[int] = None


class UserCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(
        validation_alias=AliasChoices("full_name", "fullName", "name")
    )
    username: str
    password: str
    role: Literal[
        "Administrator",
        "Manager",
        "Cashier",
        "Viewer",
        "Super Admin",
        "Branch Manager",
        "Clerk",
    ] = "Clerk"
    avatar_path: str = Field(
        default="", validation_alias=AliasChoices("avatar_path", "avatar", "avatarUrl")
    )
    is_active: bool = Field(
        default=True, validation_alias=AliasChoices("is_active", "status")
    )
    assigned_group_id: Optional[int] = None
    assigned_branch_id: Optional[int] = None

    @field_validator("is_active", mode="before")
    @classmethod
    def parse_status(cls, value):
        if isinstance(value, str):
            return value.strip().lower() == "active"
        return value


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("full_name", "fullName", "name")
    )
    username: Optional[str] = None
    role: Optional[
        Literal[
            "Administrator",
            "Manager",
            "Cashier",
            "Viewer",
            "Super Admin",
            "Branch Manager",
            "Clerk",
        ]
    ] = None
    avatar_path: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("avatar_path", "avatar", "avatarUrl"),
    )
    is_active: Optional[bool] = Field(
        default=None, validation_alias=AliasChoices("is_active", "status")
    )
    assigned_group_id: Optional[int] = None
    assigned_branch_id: Optional[int] = None

    @field_validator("is_active", mode="before")
    @classmethod
    def parse_status(cls, value):
        if isinstance(value, str):
            return value.strip().lower() == "active"
        return value


class PasswordReset(BaseModel):
    password: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    remember_user: bool = False


class SetupRequest(BaseModel):
    full_name: str
    username: str = "admin"
    password: str
    confirm_password: str
    avatar_path: str = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime
    user: UserPublic
    must_change_password: bool = False


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def normalize_datetimes(cls, v):
        if not v:
            return datetime.now(timezone.utc)
        return v


class EmployeeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(min_length=1, max_length=255)
    father_name: str = ""
    phone: str = ""
    position: str = Field(min_length=1, max_length=180)
    department: str = ""
    company_id: str = Field(default="all", max_length=100)
    joining_date: Optional[DateType] = None
    employment_end_date: Optional[DateType] = None
    monthly_salary: float = Field(ge=0)
    currency: Literal["AFN", "USD"] = "AFN"
    avatar_url: str = Field(
        default="", validation_alias=AliasChoices("avatar_url", "avatarUrl", "avatar")
    )
    status: Literal["active", "inactive", "on_leave", "terminated"] = "active"
    notes: str = ""

    @field_validator(
        "full_name",
        "father_name",
        "phone",
        "position",
        "department",
        "company_id",
        "notes",
        mode="before",
    )
    @classmethod
    def sanitize_employee_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class EmployeeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    father_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = Field(default=None, min_length=1, max_length=180)
    department: Optional[str] = None
    company_id: Optional[str] = Field(default=None, max_length=100)
    joining_date: Optional[DateType] = None
    employment_end_date: Optional[DateType] = None
    monthly_salary: Optional[float] = Field(default=None, ge=0)
    currency: Optional[Literal["AFN", "USD"]] = None
    avatar_url: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("avatar_url", "avatarUrl", "avatar")
    )
    status: Optional[Literal["active", "inactive", "on_leave", "terminated"]] = None
    notes: Optional[str] = None

    @field_validator(
        "full_name",
        "father_name",
        "phone",
        "position",
        "department",
        "company_id",
        "notes",
        mode="before",
    )
    @classmethod
    def sanitize_employee_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class EmployeeRead(EmployeeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    account_id: int
    created_at: datetime
    updated_at: datetime


class EmployeeSalaryAdjustmentCreate(BaseModel):
    date: DateType
    period: str = Field(min_length=7, max_length=7)
    amount: float = Field(gt=0)
    currency: Literal["AFN", "USD"] = "AFN"
    adjustment_type: Literal["bonus", "deduction", "advance", "adjustment", "reversal"]
    reason: str = Field(min_length=1)
    notes: str = ""

    @field_validator("reason", "notes", mode="before")
    @classmethod
    def sanitize_adjustment_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class EmployeeSalaryAdjustmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    date: DateType
    period: str
    amount: float
    currency: str
    adjustment_type: str
    reason: str
    notes: str = ""
    created_by: str
    created_at: datetime


class EmployeeLedgerEmployeeInfo(BaseModel):
    id: int
    employee_code: str
    full_name: str
    company_id: str = "all"
    joining_date: Optional[DateType] = None
    employment_end_date: Optional[DateType] = None
    current_salary: float
    currency: str
    position: str = ""
    department: str = ""
    status: str = "active"


class EmployeeLedgerPolicy(BaseModel):
    carry_forward_enabled: bool
    first_month_prorated: bool = True
    notice: Optional[str] = None


class EmployeeLedgerSummary(BaseModel):
    total_accrued: float
    total_paid: float
    total_bonus: float = 0.0
    total_deductions: float = 0.0
    total_adjustments: float = 0.0
    outstanding_balance: float
    current_month_accrued: float
    current_month_paid: float
    current_month_remaining: float


class EmployeeLedgerEntry(BaseModel):
    id: str
    date: DateType
    period: str
    entry_type: Literal[
        "opening_balance",
        "salary_accrual",
        "salary_payment",
        "bonus",
        "deduction",
        "advance",
        "adjustment",
        "reversal",
    ]
    description: str
    salary_accrued: float = 0.0
    payment: float = 0.0
    bonus: float = 0.0
    deduction: float = 0.0
    adjustment: float = 0.0
    debit: float = 0.0
    credit: float = 0.0
    running_balance: float
    currency: str
    transaction_id: Optional[int] = None
    reference: Optional[str] = None


class EmployeeLedgerResponse(BaseModel):
    employee: EmployeeLedgerEmployeeInfo
    policy: EmployeeLedgerPolicy
    summary: EmployeeLedgerSummary
    entries: List[EmployeeLedgerEntry]
    page: int = 1
    page_size: int = 100
    total_entries: int = 0


class SalaryPaymentCreate(BaseModel):
    employee_id: int
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    amount: float = Field(gt=0)
    payment_date: DateType
    payment_method: Literal["cash", "bank", "hawala", "other"] = "cash"
    notes: str = ""

    @field_validator("notes", mode="before")
    @classmethod
    def sanitize_payment_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class SalaryPaymentUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    payment_date: Optional[DateType] = None
    payment_method: Optional[Literal["cash", "bank", "hawala", "other"]] = None
    notes: Optional[str] = None

    @field_validator("notes", mode="before")
    @classmethod
    def sanitize_payment_fields(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class SalaryPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    month: int
    year: int
    amount: float
    payment_date: DateType
    payment_method: str
    notes: str = ""
    previous_carry_forward_balance: float = 0
    total_payable_salary: float = 0
    carry_forward_balance: float = 0
    cashbook_entry_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class SalaryReportRow(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    department: str = ""
    position: str = ""
    monthly_salary: float
    previous_carry_forward_balance: float = 0
    total_payable_salary: float = 0
    paid_salary: float
    remaining_salary: float
    carry_forward_balance: float = 0
    payment_status: Literal["Paid", "Partial Paid", "Unpaid", "Advance"]
    last_payment_date: Optional[DateType] = None
    currency: str = "AFN"


class SalarySummaryTotals(BaseModel):
    total_employees: int
    total_monthly_salary: float
    total_payable_salary: float = 0
    total_paid_this_month: float
    total_remaining_salary: float
    fully_paid_employees: int
    unpaid_employees: int
    partial_paid_employees: int = 0


class SalaryReportResponse(BaseModel):
    month: int
    year: int
    rows: List[SalaryReportRow]
    summary: SalarySummaryTotals
    payments: List[SalaryPaymentRead] = Field(default_factory=list)


class SalaryHistoryCreate(BaseModel):
    new_salary: float = Field(ge=0)
    new_currency: Literal["AFN", "USD"]
    effective_date: DateType
    reason: str = Field(min_length=1, max_length=255)
    notes: str = ""


class SalaryHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    old_salary: float
    new_salary: float
    old_currency: str
    new_currency: str
    effective_date: DateType
    changed_at: datetime
    changed_by: str
    reason: str
    notes: str = ""


class SalaryChangeReportRow(SalaryHistoryRead):
    employee_name: str
    employee_code: str


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: Optional[str] = None
    transaction_no: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def normalize_datetimes(cls, v):
        if not v:
            return datetime.now(timezone.utc)
        return v


class SettingRead(SettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SummaryResponse(BaseModel):
    cash_in_afn: float
    cash_out_afn: float
    afn_balance: float
    usd_in: float
    usd_out: float
    usd_balance: float
    today_transactions: int
    monthly_transactions: int
    today_cash_in: float = 0
    today_cash_out: float = 0
    monthly_cash_in: float = 0
    monthly_cash_out: float = 0


class BackupPayload(BaseModel):
    accounts: List[AccountRead] = Field(default_factory=list)
    employees: List[EmployeeRead] = Field(default_factory=list)
    transactions: List[TransactionRead] = Field(default_factory=list)
    settings: Optional[SettingRead] = None
    exported_at: datetime


class CsvImportRequest(BaseModel):
    content: str
    filename: str = "cashbook.csv"


class GroupBase(BaseModel):
    name: str


class GroupCreate(GroupBase):
    pass


class GroupUpdate(GroupBase):
    name: Optional[str] = None


class GroupRead(GroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class BranchBase(BaseModel):
    name: str
    group_id: int


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    group_id: Optional[int] = None


class BranchRead(BranchBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------------------------------------------------------------------------
# Transport & Export Multi-Client Ledger Schemas (SKY ARIANA LTD)
# ---------------------------------------------------------------------------
class ExportClientCreate(BaseModel):
    name: str
    contact_info: Optional[str] = ""
    currency: Optional[str] = "USD"


class ExportClientResponse(BaseModel):
    id: int
    name: str
    contact_info: str
    currency: str
    total_credit_usd: float = 0.0
    total_debit_usd: float = 0.0
    net_balance_usd: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class TransportLedgerCreate(BaseModel):
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    transaction_type: Literal["shipment", "payment", "invoice"] = "shipment"
    date: str
    shipper: Optional[str] = ""
    consignee: Optional[str] = ""
    commodity_description: Optional[str] = ""
    invoice_no: Optional[str] = ""
    bill_of_lading: Optional[str] = ""
    container_no: Optional[str] = ""
    container_size: Optional[str] = "1X40_HC"
    quantity: Optional[int] = 1
    price_per_container: Optional[float] = 0.0
    credit_usd: Optional[float] = 0.0
    debit_usd: Optional[float] = 0.0
    is_surrendered_bl: Optional[bool] = False
    notes: Optional[str] = ""


class TransportLedgerResponse(BaseModel):
    id: int
    client_id: int
    sn: int
    transaction_type: str
    date: str
    shipper: str
    consignee: str
    commodity_description: str
    invoice_no: str
    bill_of_lading: str
    container_no: str
    container_size: str
    quantity: int
    price_per_container: float
    credit_usd: float
    debit_usd: float
    running_balance_usd: float
    is_surrendered_bl: bool
    notes: str

    model_config = ConfigDict(from_attributes=True)


class GrandSummaryResponse(BaseModel):
    grand_total_credits_usd: float
    grand_total_debits_usd: float
    net_outstanding_balance_usd: float
    total_containers: int
    surrendered_bl_count: int
    clients: List[ExportClientResponse]


# ---------------------------------------------------------------------------
# Bawar Star Plastic Industry Schemas
# ---------------------------------------------------------------------------
class BawarStarTransactionCreate(BaseModel):
    partner_company_id: int
    transaction_date: DateType
    transaction_type: Literal[
        "SELL_PRODUCT",
        "PASS_THROUGH_FREIGHT",
        "PASS_THROUGH_PKG",
        "PAYMENT_RECEIVED",
        "BUY_RAW_MATERIAL",
        "OPERATIONAL_EXPENSE",
    ]
    description_en: str = ""
    description_ps: str = ""
    quantity: float = Field(default=0.0, ge=0.0)
    unit_price: float = Field(default=0.0, ge=0.0)
    unit_manufacturing_cost: Optional[float] = Field(default=None, ge=0.0)
    total_amount: Optional[float] = None
    currency: Literal["AFN", "USD"] = "AFN"
    exchange_rate: float = Field(default=1.0, ge=0.0)

    @field_validator("description_en", "description_ps", mode="before")
    @classmethod
    def sanitize_descriptions(cls, v):
        if isinstance(v, str):
            return sanitize_xss(v)
        return v


class BawarStarTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: str
    partner_company_id: int
    partner_company_name: Optional[str] = ""
    transaction_date: DateType
    transaction_type: str
    description_en: str
    description_ps: str
    quantity: float
    unit_price: float
    unit_manufacturing_cost: Optional[float] = None
    total_amount: float
    currency: str
    exchange_rate: float
    billed_amount: float = 0.0
    paid_amount: float = 0.0
    running_balance: float = 0.0
    created_at: datetime
    updated_at: datetime


class BawarStarRevenueSplit(BaseModel):
    product_revenue: float = 0.0
    freight_billed: float = 0.0
    packaging_billed: float = 0.0
    total_pass_through: float = 0.0


class BawarStarLedgerSummary(BaseModel):
    partner_company_id: int
    partner_company_name: str = ""
    total_billed_amount: float = 0.0
    total_payments_received: float = 0.0
    net_outstanding_balance: float = 0.0
    revenue_split: BawarStarRevenueSplit
    estimated_gross_profit: float = 0.0
    profit_margin_percentage: float = 0.0
    total_transactions: int = 0
