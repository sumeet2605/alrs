#!/usr/bin/env bash
set -euo pipefail

# This script is designed to be the main entrypoint for the application service.

# Wait for the DB (optional, but good practice before starting the app)
if [[ "$SQLALCHEMY_DATABASE_URL" == postgres* ]]; then
  echo "Waiting for Postgres..."
  # crude wait: check with psql if available (we rely on container network being ready)
  sleep 5
fi

# Start uvicorn (The migration step is now handled by a separate Cloud Run Job)
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
