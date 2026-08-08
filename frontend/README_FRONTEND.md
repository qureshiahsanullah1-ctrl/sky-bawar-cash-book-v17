# Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The frontend expects the FastAPI backend at `http://localhost:8000`. Override it with `VITE_API_URL` when needed.

## Performance notes

- Dashboard variants and heavy route components are loaded with `React.lazy`
  and `Suspense` to reduce the initial bundle.
- Expensive employee salary calculations are memoized between renders.
- Vite splits dashboards, reports, ledgers, payroll, settings, and other
  feature areas into separate chunks.
- `vite-plugin-compression` emits gzip files for production HTML, JavaScript,
  and CSS assets.
- Vercel applies immutable one-year caching to content-hashed files under
  `/assets/`.

## Frontend verification

```bash
npm test
npm run build
```

The build output is written to `dist/`. See the repository root's
[PERFORMANCE.md](../PERFORMANCE.md) for the full optimization guide.
