from app.crud import accounts as crud_accounts, transactions as crud_transactions, settings as crud_settings, backups as crud_backups, imports_exports as crud_imports_exports, reports as crud_reports
from app.crud import payroll as payroll_crud
from app.services import payroll as payroll_services
import os
import sys
import unittest
from datetime import date
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Dynamically resolve and add backend to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock memory database URL before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base
from app import models, schemas


class MainEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = SessionLocal()

        # Seed settings required for transaction defaults
        self.db.add(
            models.Setting(
                company_name="Cashbook Of All companies",
                default_exchange_rate=64.3,
                default_currency="AFN",
            )
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_validation_rejects_negative_transaction_amount(self):
        # Verify Pydantic validation rejects negative numerical amounts for cash_in_afn
        with self.assertRaises(ValidationError) as ctx:
            schemas.TransactionCreate(
                date=date.today(),
                account_name="Test Client",
                detail="Negative Cash In Test",
                transaction_type="cash_in",
                cash_in_afn=-50.0,  # Invalid negative amount!
                exchange_rate=64.3,
                payment_method="cash",
                category="other",
                note="Testing Note",
            )
        # Verify the validation error mentions the cash_in_afn constraint
        self.assertIn("cash_in_afn", str(ctx.exception))
        self.assertIn("greater than or equal to 0", str(ctx.exception))

    def test_transaction_updates_rolling_ledger_totals(self):
        # Ensure Test Client account exists
        account = models.Account(
            name="Test Client", opening_balance_afn=0, opening_balance_usd=0
        )
        self.db.add(account)
        self.db.commit()

        # Check initial summary values
        initial_totals = crud_reports.summary(self.db)
        self.assertEqual(0, initial_totals["cash_in_afn"])
        self.assertEqual(0, initial_totals["afn_balance"])

        # Create cash_in transaction of 5000 AFN
        tx_payload = schemas.TransactionCreate(
            date=date(2026, 7, 17),
            account_name="Test Client",
            detail="Sales Income",
            transaction_type="cash_in",
            cash_in_afn=5000.0,
            exchange_rate=64.3,
            payment_method="cash",
            category="other",
            note="Payment received",
        )
        crud_transactions.create_transaction(self.db, tx_payload)

        # Confirm summary contains updated values
        updated_totals = crud_reports.summary(self.db)
        self.assertEqual(5000.0, updated_totals["cash_in_afn"])
        self.assertEqual(5000.0, updated_totals["afn_balance"])

    def test_hierarchical_multi_branch_summary(self):
        # 1. Create Groups
        group_a = models.Group(name="Group A")
        group_b = models.Group(name="Group B")
        self.db.add_all([group_a, group_b])
        self.db.commit()

        # 2. Create Branches
        kabul = models.Branch(name="Kabul", group_id=group_a.id)
        kandahar = models.Branch(name="Kandahar", group_id=group_a.id)
        herat = models.Branch(name="Herat", group_id=group_b.id)
        self.db.add_all([kabul, kandahar, herat])
        self.db.commit()

        # 3. Create transactions for each branch
        account = models.Account(
            name="Branch Client", opening_balance_afn=0, opening_balance_usd=0
        )
        self.db.add(account)
        self.db.commit()

        tx1 = schemas.TransactionCreate(
            date=date(2026, 7, 17),
            account_name="Branch Client",
            detail="Kabul Inflow",
            transaction_type="cash_in",
            cash_in_afn=1000.0,
            branch_id=kabul.id,
        )
        tx2 = schemas.TransactionCreate(
            date=date(2026, 7, 17),
            account_name="Branch Client",
            detail="Kandahar Inflow",
            transaction_type="cash_in",
            cash_in_afn=2000.0,
            branch_id=kandahar.id,
        )
        tx3 = schemas.TransactionCreate(
            date=date(2026, 7, 17),
            account_name="Branch Client",
            detail="Herat Inflow",
            transaction_type="cash_in",
            cash_in_afn=4000.0,
            branch_id=herat.id,
        )

        crud_transactions.create_transaction(self.db, tx1)
        crud_transactions.create_transaction(self.db, tx2)
        crud_transactions.create_transaction(self.db, tx3)

        # 4. Check consolidated summary (neither group nor branch parameter)
        totals_all = crud_reports.summary(self.db)
        self.assertEqual(7000.0, totals_all["cash_in_afn"])
        self.assertEqual(7000.0, totals_all["afn_balance"])

        # 5. Check Group A summary (should sum Kabul and Kandahar)
        totals_group_a = crud_reports.summary(self.db, group_id=group_a.id)
        self.assertEqual(3000.0, totals_group_a["cash_in_afn"])
        self.assertEqual(3000.0, totals_group_a["afn_balance"])

        # 6. Check Kabul Branch summary (should just return Kabul)
        totals_kabul = crud_reports.summary(self.db, branch_id=kabul.id)
        self.assertEqual(1000.0, totals_kabul["cash_in_afn"])
        self.assertEqual(1000.0, totals_kabul["afn_balance"])

        # 7. Check Herat Branch summary (should just return Herat)
        totals_herat = crud_reports.summary(self.db, branch_id=herat.id)
        self.assertEqual(4000.0, totals_herat["cash_in_afn"])
        self.assertEqual(4000.0, totals_herat["afn_balance"])


if __name__ == "__main__":
    unittest.main()
