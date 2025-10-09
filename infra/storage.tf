# Active bucket (standard)
resource "google_storage_bucket" "active" {
  name     = var.gcs_active_bucket
  location = var.region
  project  = var.project_id
  uniform_bucket_level_access = true
  force_destroy = false

  lifecycle_rule {
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 1095
    }
  }
}

# Archive bucket (Nearline)
resource "google_storage_bucket" "archive" {
  name     = var.gcs_archive_bucket
  location = var.region
  project  = var.project_id
  storage_class = "NEARLINE"
  uniform_bucket_level_access = true
  force_destroy = false

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 1460
    }
  }
}
