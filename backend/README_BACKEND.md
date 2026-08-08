# Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`

Interactive docs: `http://127.0.0.1:8000/docs`

SQLite tables are created automatically in `cashbook.db`.

## Performance notes

- Payroll/report calculations prefetch salary history in batches grouped by
  employee, avoiding per-employee N+1 queries.
- CSV and Excel imports generate transaction numbers in memory and use bulk
  inserts instead of querying for each row.
- Ledger, export, and client-ledger filters and pagination are executed in SQL.
- Dashboard summaries use aggregate database queries instead of reducing the
  complete transaction set in Python.
- Common accounting lookup columns are indexed.
- DDL work is guarded so request handlers do not repeat schema operations.
- FastAPI gzip compression is enabled for responses larger than 1,000 bytes.

For the complete architecture and verification commands, see the repository
root's [PERFORMANCE.md](../PERFORMANCE.md).

## Backend verification

From the repository root:

```bash
python3 -m unittest discover -s backend/tests
python3 -m pytest backend/tests -q
```
