#!/usr/bin/env bash
set -euo pipefail

# This script is designed to be run as a Cloud Run Job once per deployment.

# 1. Wait for the DB to be ready (Essential for a successful migration)
if [[ "$SQLALCHEMY_DATABASE_URL" == postgres* ]]; then
  echo "Waiting for Postgres..."
  # Simple wait: You might need a more robust external tool like wait-for-it.sh 
  # for production resilience, but this simple sleep can work for basic setups.
  sleep 5
fi

# 2. Run migrations
echo "Running alembic upgrade head..."
alembic upgrade head

# 3. Exit. The job is complete.
echo "Alembic migrations finished successfully."
exit 0
