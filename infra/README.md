# infra/ — Terraform for ALRS (India-optimized)

This Terraform configuration provisions a minimal production-ready GCP stack for Alluring Lens Studios (ALRS) optimized for low OPEX in India (asia-south1).

## What it creates
- Enables required GCP APIs
- Artifact Registry (Docker)
- Cloud SQL (Postgres, db-f1-micro)
- Secret Manager secrets (from variable map)
- Cloud Run service (small CPU/memory limits)
- GCS buckets for active assets and archive with lifecycle rules
- Service account with IAM bindings for Cloud Run

## Quick start (local)
1. Install Terraform v1.2+ and gcloud, authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
