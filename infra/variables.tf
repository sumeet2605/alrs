variable "project_id" {
  description = "GCP project id"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-south1" # Mumbai (India)
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "asia-south1-a"
}

variable "artifact_repo_name" {
  description = "Artifact Registry repository id"
  type        = string
  default     = "alrs-repo"
}

variable "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "alrs-db"
}

variable "db_version" {
  description = "Cloud SQL Postgres version"
  type        = string
  default     = "POSTGRES_15"
}

variable "db_user" {
  description = "DB user name"
  type        = string
  default     = "alrs_user"
}

variable "db_password" {
  description = "DB password (sensitive). Provide through tfvars or CI secret injection."
  type        = string
  sensitive   = true
  default     = ""
}

variable "service_account_id" {
  description = "Service account id for Cloud Run"
  type        = string
  default     = "alrs-cloudrun-sa"
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "alrs-backend"
}

variable "image_uri" {
  description = "Artifact Registry image URI (full): e.g. asia-south1-docker.pkg.dev/<project>/<repo>/alrs-backend:latest"
  type        = string
}

# Non-sensitive list of secret ids (keys)
variable "secret_names" {
  description = "List of secret ids to create in Secret Manager (e.g. [\"DB_PASSWORD\",\"JWT_SECRET\"])"
  type        = list(string)
  default     = ["DB_PASSWORD", "SECRET_KEY", "RESEND_API_KEY", "EMAIL_SENDER", "GCS_BUCKET_NAME"]
}

# Sensitive map of secret values keyed by secret id (values supplied securely)
variable "secret_values" {
  description = "Map of secret id -> secret value (sensitive). Provide via CI or terraform.tfvars (secure)."
  type        = map(string)
  sensitive   = true
  default     = {}
}

# GCS settings
variable "gcs_active_bucket" {
  description = "Bucket name for recent assets"
  type        = string
  default     = "alrs-gallery-active"
}

variable "gcs_archive_bucket" {
  description = "Bucket name for archived assets"
  type        = string
  default     = "alrs-gallery-archive"
}
