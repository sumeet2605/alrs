output "artifact_registry_repo" {
  description = "Artifact Registry repository id"
  value       = google_artifact_registry_repository.docker_repo.id
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_service.backend.status[0].url
}

output "gcs_active_bucket" {
  value = google_storage_bucket.active.name
}

output "gcs_archive_bucket" {
  value = google_storage_bucket.archive.name
}
