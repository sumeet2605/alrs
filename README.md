# Alluring Lens Studios CRM & Gallery

Full-stack CRM and client gallery system for Alluring Lens Studios.

The application has two main parts:

- `backend/` - FastAPI API server
- `frontend/` - Vite + React web app

## What this project is for

This repo is intended to support studio operations such as:

- Client gallery management
- Photo favorites
- Gallery downloads
- Lead capture
- WhatsApp conversation tracking
- Admin workflows
- Authentication and user management

## Tech stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- PostgreSQL or SQLite for local development
- Local, Google Cloud Storage, or S3-compatible object storage

### Frontend

- React
- TypeScript
- Vite
- Material UI
- Ant Design
- Axios
- React Router

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── gallery/
│   │   ├── leads/
│   │   ├── whatsapp/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── .env.example
└── README.md
```

## Local setup

### 1. Clone the repo

```bash
git clone https://github.com/sumeet2605/alrs.git
cd alrs
```

### 2. Create local environment file

```bash
cp .env.example .env
```

Update `.env` with your local database, storage, frontend URL, and integration settings.

For quick local development, SQLite can be used. For serious development and production, PostgreSQL is preferred.

## Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"OK"}
```

API docs:

```text
http://localhost:8000/docs
```

## Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Generate frontend API client

Start the backend first, then run:

```bash
cd frontend
npm run generate:api
```

The frontend generation script reads the backend OpenAPI schema from the local API server.

## Storage modes

The backend supports three storage modes:

- `local` for development
- `gcs` for Google Cloud Storage
- `spaces` for DigitalOcean Spaces or compatible object storage

Start with `local`. Move to object storage only when the deployment path is stable.

## WhatsApp module

The backend contains WhatsApp-related routes for:

- Webhook verification
- Incoming message storage
- Lead creation from incoming numbers
- Admin conversation listing
- Admin message viewing
- Outbound text sending

Before using this in production, add payload signature validation and stronger admin authentication.

## Development commands

Backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

Frontend build:

```bash
cd frontend
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

## Production readiness checklist

This project is not production-ready until the following are completed:

- Add backend Dockerfile
- Add frontend Dockerfile
- Add docker-compose.yml
- Add PostgreSQL migration workflow
- Add clear startup config validation
- Add webhook signature validation
- Add reusable admin authentication dependency
- Add backend tests
- Add frontend build checks in CI
- Remove committed media, build, and cache files if present
- Add deployment guide for DigitalOcean or Cloud Run

## Next engineering priority

Make the app runnable from a fresh machine using one command. After that, add deployment automation. New CRM features should wait until the base is reproducible.
