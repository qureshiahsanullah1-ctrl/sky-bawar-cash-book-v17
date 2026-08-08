# Cash Book Deployment Guide

This guide describes how to run, orchestrate, and deploy the Cash Book Web Application both locally and in production.

---

## 1. Local Orchestration (Docker Compose)

You can launch the complete application stack (React frontend and FastAPI backend) locally in containerized form using the provided `docker-compose.yml` file.

### Prerequisites
- Docker and Docker Compose (or Docker Desktop) installed.

### Launching the Stack
Run the following command in the root folder of the repository:
```bash
docker compose up --build
```

This command will:
1. Build the backend image using `backend/Dockerfile` (FastAPI).
2. Build the frontend image using `frontend/Dockerfile` (React + Nginx).
3. Spin up both containers.
4. Mount the volume `backend_data` to ensure the local SQLite database (`cashbook.db`) is persisted when containers are stopped/restarted.

### Accessing the Applications
- **React Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend / Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

To stop the containers:
```bash
docker compose down
```

To stop containers and wipe the local containerized database:
```bash
docker compose down -v
```

---

## 2. Production Deployment

### Option A: Serverless Monorepo Deployment (Vercel)

The repository contains a pre-configured `vercel.json` file. It allows you to deploy **both** layers to Vercel as a single project.

#### Steps:
1. Import the repository into your Vercel Dashboard.
2. Select **Vite** as the framework preset.
3. Keep the repository root as the Vercel project root.
4. **Do not modify the build settings**. The committed `vercel.json` already configures Vercel to:
   - Run `npm --prefix frontend ci` for installation.
   - Run `npm --prefix frontend run build` for compiling the React assets.
   - Publish static assets from `frontend/dist`.
   - Route `/api/*` and `/health` requests to Vercel Serverless Functions running the FastAPI backend via `api/index.py`.
5. Connect your Neon PostgreSQL Database in the Vercel Project Settings (Vercel automatically provisions `DATABASE_URL` environment variables).
6. Deploy the project. The frontend automatically routes API requests to the same-origin relative path `/api` without requiring CORS adjustments.

### Option B: Dedicated Backend (Render / Railway / Fly.io)

If you prefer running a persistent FastAPI server (rather than serverless functions), you can deploy the backend independently using the `backend/Dockerfile`.

#### Steps:
1. Create a new Web Service on Render / Railway.
2. Point it to the `backend/` directory of the repository (or set the root/build context to `./backend` in the settings).
3. The platform will automatically detect the `Dockerfile` inside the context.
4. Set the port environment variable (Render uses `PORT`, default `8000`).
5. Configure the following environment variables:
   - `DATABASE_URL`: Connection string for your managed PostgreSQL database (e.g. Neon).
   - `FRONTEND_ORIGINS`: JSON array of allowed origins to permit cross-origin requests from the React frontend (e.g., `["https://cashbook-v11.vercel.app"]`).
6. Deploy. The backend ASGI server launches on port 8000 (or `PORT` environment variable) using:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

### Option C: Production React Frontend (Vercel / Netlify / CDN)

When deploying the frontend separate from the backend:
1. Configure Vite to compile pointing to your production backend.
2. Provide the `VITE_API_URL` environment variable during build:
   - **Environment Variable**: `VITE_API_URL=https://your-backend.render.com`
3. The Vite build process compiles this URL statically into your React code.

---

## 3. Performance deployment checklist

- Run `python3 -m unittest discover -s backend/tests` and
  `python3 -m pytest backend/tests -q` before deployment.
- Run `npm test` and `npm run build` from `frontend/`.
- Keep the Vercel project root at the repository root so the committed build
  command can install and build the frontend correctly.
- Preserve content-hashed filenames in `frontend/dist`; Vercel's `/assets/*`
  rule sets `Cache-Control: public, max-age=31536000, immutable`.
- Confirm the build emitted `.gz` assets from `vite-plugin-compression`.
- Monitor API health and runtime logs after deployment, especially for large
  imports, payroll reports, and dashboard summaries.

See [PERFORMANCE.md](PERFORMANCE.md) for the implementation details and
performance-sensitive development conventions.

---

## 4. End-to-End Handshake Verification

Ensure database schema migration and network connectivity are operational:

### 1. Database Auto-Migration Check
FastAPI database settings invoke declarative schema creation on startup.
Verify tables are successfully initialized in SQLite / Postgres by querying the database health endpoint:
```bash
curl -s http://localhost:8000/api/health
```

Expected response contains:
```json
{
  "backend": "online",
  "database": "connected",
  "api": "ok",
  "status": "ok"
}
```

### 2. CORS Production Handshake Check
To check that the frontend can interact with the backend in production without browser CORS blocks:
Run an options flight precheck command targeting the backend:
```bash
curl -i -X OPTIONS -H "Origin: https://cashbook-v11.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8000/api/transactions
```

Ensure the server responds with HTTP Status 200/204 and headers matching:
- `Access-Control-Allow-Origin: https://cashbook-v11.vercel.app`
- `Access-Control-Allow-Credentials: true`
