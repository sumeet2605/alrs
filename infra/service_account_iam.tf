resource "google_service_account" "cloudrun_sa" {
  account_id   = var.service_account_id
  display_name = "ALRS Cloud Run Service Account"
  project      = var.project_id
}

# Cloud SQL client role
resource "google_project_iam_member" "sa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Secret Manager accessor
resource "google_project_iam_member" "sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Storage object admin (for uploading/downloading images). If you want read-only, change role to roles/storage.objectViewer
resource "google_project_iam_member" "sa_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
