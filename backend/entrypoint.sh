#!/usr/bin/env bash
set -euo pipefail

# wait for the DB if using postgres (simple retry)
if [[ "$SQLALCHEMY_DATABASE_URL" == postgres* ]]; then
  echo "Waiting for Postgres..."
  # crude wait: check with psql if available (we rely on container network being ready)
  # If you want more robust wait, use `wait-for-it` or `dockerize`.
  sleep 5
fi

# run migrations
echo "Running alembic migrations..."
alembic upgrade head

# Start uvicorn
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
