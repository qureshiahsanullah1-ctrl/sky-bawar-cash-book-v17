# cspell:ignore sessionmaker autoflush libpq vercel VERCEL BAWAR
import os
import ssl
import threading

from sqlalchemy import create_engine, inspect
from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)

    # pg8000 does not accept standard libpq query params like sslmode, channel_binding, etc.
    # We strip query params for pg8000 and pass SSL context via connect_args.
    if url.startswith("postgresql+pg8000://") and "?" in url:
        url = url.split("?")[0]

    return url


def _check_is_vercel() -> bool:
    if (
        os.getenv("VERCEL") in ("1", "true", "True")
        or os.getenv("VERCEL_ENV") is not None
        or os.getenv("VERCEL_REGION") is not None
        or os.getenv("NOW_REGION") is not None
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    ):
        return True
    return False


def resolve_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "").strip()
    is_vercel = _check_is_vercel()
    is_production = os.getenv("VERCEL_ENV") == "production"

    if not raw_url:
        if is_vercel:
            return "sqlite:////tmp/cashbook.db"
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        db_file = os.path.join(root_dir, "cashbook.db").replace("\\", "/")
        return f"sqlite:///{db_file}"

    database_url = normalize_database_url(raw_url)
    if is_production and database_url.startswith("sqlite"):
        import logging

        logging.getLogger("cashbook").warning(
            "DATABASE_URL is not set or points to SQLite on Vercel production. "
            "Configure a Neon/Postgres connection string."
        )

    return database_url


def get_tenant_db_url(company_id: str) -> str:
    if not DATABASE_URL.startswith("sqlite"):
        return DATABASE_URL

    is_vercel = _check_is_vercel()
    base_dir = "/tmp" if is_vercel else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    cid = (company_id or "").lower()
    if "sky" in cid or "ariana" in cid:
        db_file = os.path.join(base_dir, "cashbook_skyariana.db").replace("\\", "/")
    else:
        db_file = os.path.join(base_dir, "cashbook.db").replace("\\", "/")
    return f"sqlite:///{db_file}"


DATABASE_URL = resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_PG8000 = DATABASE_URL.startswith("postgresql+pg8000")

engine_options = {"pool_pre_ping": True, "pool_recycle": 300}
if IS_SQLITE:
    engine_options["connect_args"] = {"check_same_thread": False}
elif IS_PG8000:
    engine_options.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 15,
        "connect_args": {
            "ssl_context": ssl.create_default_context(),
            "timeout": 15,
        },
    })

engine = create_engine(DATABASE_URL, **engine_options)

from sqlalchemy import event

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if IS_SQLITE:
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=10000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA mmap_size=30000000000")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


_checked_schema_engines = set()


def ensure_database_schema(bind_engine=None):
    """Ensure all required tables and columns exist for SQLite and PostgreSQL/Neon."""
    target_engine = bind_engine or engine
    engine_key = f"db_schema_{target_engine.url}"
    if engine_key in _checked_schema_engines:
        return
    _checked_schema_engines.add(engine_key)

    is_sqlite = target_engine.dialect.name == "sqlite"
    bool_type = "BOOLEAN DEFAULT 0" if is_sqlite else "BOOLEAN DEFAULT FALSE"
    timestamp_type = "DATETIME" if is_sqlite else "TIMESTAMP"
    float_type = "FLOAT DEFAULT 0" if is_sqlite else "DOUBLE PRECISION DEFAULT 0"

    try:
        getattr(Base, "metadata").create_all(bind=target_engine)
    except Exception:
        pass

    try:
        inspector = inspect(target_engine)
        tables = set(inspector.get_table_names())
    except Exception:
        return

    with target_engine.begin() as conn:
        def table_cols(table_name):
            if table_name not in tables:
                return set()
            try:
                return {c["name"] for c in inspector.get_columns(table_name)}
            except Exception:
                return set()

        def add_col(table_name, col_name, col_type_sql):
            cols = table_cols(table_name)
            if table_name in tables and col_name not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type_sql}"))
                    cols.add(col_name)
                except Exception:
                    pass

        # 1. Accounts
        for col_name, col_type in [
            ("account_type", "VARCHAR(30) DEFAULT 'other'"),
            ("phone", "VARCHAR(100) DEFAULT ''"),
            ("address", "TEXT DEFAULT ''"),
            ("opening_balance_afn", float_type),
            ("opening_balance_usd", float_type),
            ("note", "TEXT DEFAULT ''"),
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
            ("is_deleted", bool_type),
            ("company_id", "VARCHAR(100) DEFAULT 'bawar-star'"),
        ]:
            add_col("accounts", col_name, col_type)

        # 2. Transactions
        for col_name, col_type in [
            ("company_id", "VARCHAR(100) DEFAULT 'bawar-star'"),
            ("transaction_no", "VARCHAR(40) DEFAULT ''"),
            ("transaction_type", "VARCHAR(20) DEFAULT 'cash_in'"),
            ("cash_in_afn", float_type),
            ("cash_out_afn", float_type),
            ("usd_in", float_type),
            ("usd_out", float_type),
            ("exchange_rate", float_type),
            ("converted_afn", float_type),
            ("payment_method", "VARCHAR(30) DEFAULT 'cash'"),
            ("category", "VARCHAR(40) DEFAULT 'other'"),
            ("note", "TEXT DEFAULT ''"),
            ("employee_id", "INTEGER"),
            ("salary_month", "DATE"),
            ("payroll_kind", "VARCHAR(20)"),
            ("branch_id", "INTEGER"),
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
            ("is_deleted", bool_type),
        ]:
            add_col("transactions", col_name, col_type)

        # 3. Employees
        for col_name, col_type in [
            ("company_id", "VARCHAR(100) DEFAULT 'bawar-star'"),
            ("employee_code", "VARCHAR(40) DEFAULT ''"),
            ("father_name", "VARCHAR(255) DEFAULT ''"),
            ("phone", "VARCHAR(100) DEFAULT ''"),
            ("position", "VARCHAR(180) DEFAULT ''"),
            ("department", "VARCHAR(180) DEFAULT ''"),
            ("joining_date", "DATE"),
            ("employment_end_date", "DATE"),
            ("monthly_salary", float_type),
            ("currency", "VARCHAR(10) DEFAULT 'AFN'"),
            ("avatar_url", "TEXT DEFAULT ''"),
            ("status", "VARCHAR(20) DEFAULT 'active'"),
            ("notes", "TEXT DEFAULT ''"),
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
            ("is_deleted", bool_type),
        ]:
            add_col("employees", col_name, col_type)

        # 4. Salary Payments & History
        for col_name, col_type in [
            ("previous_carry_forward_balance", float_type),
            ("total_payable_salary", float_type),
            ("carry_forward_balance", float_type),
            ("cashbook_entry_id", "INTEGER"),
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
        ]:
            add_col("salary_payments", col_name, col_type)

        for col_name, col_type in [
            ("old_currency", "VARCHAR(10) DEFAULT 'AFN'"),
            ("new_currency", "VARCHAR(10) DEFAULT 'AFN'"),
            ("notes", "TEXT DEFAULT ''"),
        ]:
            add_col("salary_history", col_name, col_type)

        # 5. Settings
        for col_name, col_type in [
            ("company_id", "VARCHAR(100) DEFAULT 'bawar-star'"),
            ("company_name", "VARCHAR(255) DEFAULT 'Cashbook Of All companies'"),
            ("company_phone", "VARCHAR(100) DEFAULT ''"),
            ("company_email", "VARCHAR(180) DEFAULT ''"),
            ("company_website", "VARCHAR(180) DEFAULT ''"),
            ("company_tax_number", "VARCHAR(120) DEFAULT ''"),
            ("company_logo", "TEXT DEFAULT ''"),
            ("company_address", "TEXT DEFAULT ''"),
            ("company_license", "VARCHAR(100) DEFAULT ''"),
            ("default_currency", "VARCHAR(10) DEFAULT 'AFN'"),
            ("language", "VARCHAR(20) DEFAULT 'English'"),
            ("date_display_format", "VARCHAR(20) DEFAULT 'dual'"),
            ("print_footer_text", "TEXT DEFAULT 'Prepared by BAWAR STAR PLASTIC INDUSTRY'"),
            ("auto_logout_minutes", "INTEGER DEFAULT 30"),
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
        ]:
            add_col("settings", col_name, col_type)

        # 6. Users
        for col_name, col_type in [
            ("created_at", timestamp_type),
            ("updated_at", timestamp_type),
            ("must_change_password", bool_type),
            ("password_changed_at", timestamp_type),
            ("assigned_group_id", "INTEGER"),
            ("assigned_branch_id", "INTEGER"),
        ]:
            add_col("users", col_name, col_type)

        # 7. Data cleanups / migrations
        if "transactions" in tables:
            try:
                conn.execute(
                    text(
                        "UPDATE transactions SET converted_afn = coalesce(nullif(cash_in_afn, 0), cash_out_afn, 0) WHERE converted_afn IS NULL OR converted_afn = 0"
                    )
                )
            except Exception:
                pass
            try:
                conn.execute(
                    text(
                        "UPDATE transactions SET updated_at = coalesce(updated_at, created_at, CURRENT_TIMESTAMP)"
                    )
                )
            except Exception:
                pass

        if "users" in tables:
            try:
                conn.execute(
                    text(
                        "UPDATE users SET updated_at = coalesce(updated_at, created_at, CURRENT_TIMESTAMP)"
                    )
                )
            except Exception:
                pass

        if "salary_payments" in tables and "transactions" in tables:
            try:
                conn.execute(
                    text(
                        "DELETE FROM salary_payments WHERE cashbook_entry_id IS NOT NULL AND cashbook_entry_id IN (SELECT id FROM transactions WHERE is_deleted = true OR is_deleted = 1)"
                    )
                )
            except Exception:
                pass



def ensure_sqlite_schema(bind_engine=None):
    ensure_database_schema(bind_engine)


def ensure_user_schema(bind_engine=None):
    ensure_database_schema(bind_engine)


def ensure_payroll_schema(bind_engine=None):
    ensure_database_schema(bind_engine)


def ensure_company_schema(bind_engine=None):
    ensure_database_schema(bind_engine)



# ---------------------------------------------------------------------------
# Dynamic Multi-Tenant Engine Cache & Request Session Resolver
# ---------------------------------------------------------------------------
engines = {}
_engine_lock = threading.Lock()
_initialized_db_urls = set()


def get_tenant_db_url(company_id: str) -> str:
    if not DATABASE_URL.startswith("sqlite"):
        return DATABASE_URL

    is_vercel = _check_is_vercel()
    base_dir = "/tmp" if is_vercel else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    if company_id in ("sky-ariana", "cashbook_sky_prod", "sky"):
        db_file = os.path.join(base_dir, "cashbook_skyariana.db").replace("\\", "/")
    else:
        db_file = os.path.join(base_dir, "cashbook.db").replace("\\", "/")
    return f"sqlite:///{db_file}"


def get_tenant_session(request=None, company_id=None):
    try:
        if not company_id:
            if request and hasattr(request, "headers"):
                company_id = request.headers.get("X-Company-Id", "bawar-star")
            else:
                company_id = "bawar-star"

        if (
            not IS_SQLITE
            or company_id in ("bawar-star", "cashbook_bawar_prod", "bawar", "all")
            or not company_id
        ):
            return SessionLocal()

        if company_id not in engines:
            with _engine_lock:
                if company_id not in engines:
                    db_url = get_tenant_db_url(company_id)
                    tenant_engine_options = {"pool_pre_ping": True, "pool_recycle": 240}
                    if db_url.startswith("sqlite"):
                        tenant_engine_options["connect_args"] = {"check_same_thread": False}
                    elif db_url.startswith("postgresql+pg8000"):
                        tenant_engine_options["connect_args"] = {
                            "ssl_context": ssl.create_default_context(),
                            "timeout": 30,
                        }

                    tenant_engine = create_engine(db_url, **tenant_engine_options)
                    Base.metadata.create_all(bind=tenant_engine)
                    ensure_sqlite_schema(bind_engine=tenant_engine)
                    ensure_user_schema(bind_engine=tenant_engine)
                    ensure_payroll_schema(bind_engine=tenant_engine)
                    ensure_company_schema(bind_engine=tenant_engine)

                    from . import models

                    TenantSession = sessionmaker(
                        autocommit=False, autoflush=False, bind=tenant_engine
                    )
                    db_temp = TenantSession()
                    try:
                        if not db_temp.query(models.User).first():
                            master_db = SessionLocal()
                            try:
                                master_users = master_db.query(models.User).all()
                                for u in master_users:
                                    db_temp.add(models.User(
                                        username=u.username,
                                        password_hash=u.password_hash,
                                        full_name=u.full_name,
                                        role=u.role,
                                        is_active=u.is_active,
                                        must_change_password=u.must_change_password,
                                    ))
                                db_temp.commit()
                            finally:
                                master_db.close()

                        if not db_temp.query(models.Setting).first():
                            db_temp.add(
                                models.Setting(
                                    company_name="SKY ARIANA LTD",
                                    default_currency="USD",
                                    print_footer_text="Prepared by SKY ARIANA LTD",
                                )
                            )
                            db_temp.commit()
                    except Exception:
                        db_temp.rollback()
                    finally:
                        db_temp.close()

                    engines[company_id] = tenant_engine
                    _initialized_db_urls.add(db_url)

        target_engine = engines.get(company_id, engine)
        TenantSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=target_engine
        )
        return TenantSessionLocal()
    except Exception as err:
        import logging
        logging.getLogger("cashbook").error(f"Tenant session fallback to default SessionLocal: {err}")
        return SessionLocal()


from fastapi import Request


def get_db(request: Request = None):
    db = get_tenant_session(request)
    try:
        yield db
    finally:
        db.close()
