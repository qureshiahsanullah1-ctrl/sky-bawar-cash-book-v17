# Performance Guide

This document records the performance improvements currently included on the
`perf-improvements` branch and explains how to verify them.

## Backend optimizations

- **Payroll batch prefetching:** salary history is loaded once and grouped by
  employee for payroll/report calculations instead of issuing a query per
  employee or month.
- **Bulk import sequencing:** CSV and Excel imports use an in-memory transaction
  number sequencer and bulk inserts rather than querying the database for every
  imported row.
- **Database-level filtering and pagination:** ledger, export, and client-ledger
  endpoints apply filters, limits, and offsets in SQL. Use the paginated ledger
  endpoint for large datasets:
  `GET /api/clients/{client_id}/ledger-paginated`.
- **Dashboard aggregation:** dashboard summaries use aggregate SQL queries rather
  than loading and reducing all transactions in application code.
- **Indexes:** common accounting and reporting lookup columns are indexed to
  reduce scan work as transaction volume grows.
- **Request safety:** schema/DDL work is guarded so request handlers do not
  repeatedly perform database-definition operations.
- **Response compression:** FastAPI's `GZipMiddleware` compresses responses
  larger than 1,000 bytes.

## Frontend and build optimizations

- **Route-level lazy loading:** dashboard variants and heavier pages are loaded
  with `React.lazy` and `Suspense`, reducing the initial JavaScript payload.
- **Memoized payroll calculations:** expensive employee salary calculations are
  memoized so unrelated renders do not repeat the same work.
- **Code splitting:** Vite emits separate chunks for dashboards, reports,
  ledgers, settings, payroll, and other feature areas.
- **Compressed static assets:** `vite-plugin-compression` emits gzip assets for
  production JavaScript, CSS, and HTML files.
- **Immutable browser caching:** `/assets/*` responses use a one-year,
  immutable `Cache-Control` policy. Vite's content-hashed filenames ensure that
  changed assets receive new URLs.

## Performance-sensitive conventions

1. Keep large-list filtering and pagination in SQL, not in React or Python
   after fetching the full dataset.
2. Prefer batch reads and bulk writes for imports and payroll/report workflows.
3. Preserve content hashes for static assets; do not rename generated assets to
   stable filenames that would invalidate immutable caching.
4. Keep heavy route components lazy-loaded unless they are required for the
   initial authenticated shell.
5. Add a regression test when changing query shape, pagination behavior, or
   payroll calculations.

## Verification

Run the backend checks from the repository root:

```bash
python3 -m unittest discover -s backend/tests
python3 -m pytest backend/tests -q
```

Run the frontend checks:

```bash
cd frontend
npm test
npm run build
```

The production build should complete successfully and emit both normal and
`.gz` assets under `frontend/dist`. The frontend test suite currently contains a
legacy `salaryIntegration.test.js` source-pattern check that may fail when
implementation details are refactored; treat that known check separately from
runtime and build failures.

## Deployment notes

The committed `vercel.json` runs the frontend build from the repository root,
serves `frontend/dist`, routes API requests to the FastAPI entry point, and
applies immutable caching to hashed assets. Keep those root-level Vercel build
settings intact when deploying performance changes.
