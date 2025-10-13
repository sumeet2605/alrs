# Create the secret metadata (no versions)
resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(var.secret_names)
  project   = var.project_id
  secret_id = each.key
  replication {
    # use user_managed with a replica closest to your region to avoid provider automatic syntax issues
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

# Create a secret version with the secret_data from var.secret_values[secret_name]
# Note: secret_data will be stored in Terraform state if provided here.
resource "google_secret_manager_secret_version" "secret_versions" {
  for_each   = { for name in var.secret_names : name => name }

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = lookup(var.secret_values, each.key, "")
}