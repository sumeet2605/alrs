# Create secrets in Secret Manager from var.secrets map
resource "google_secret_manager_secret" "secrets" {
  for_each  = var.secrets
  secret_id = lower(replace(each.key, "/", "_"))
  project   = var.project_id

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "secret_versions" {
  for_each   = var.secrets
  secret     = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}
