# Cloud Run service (google-beta provider used for some advanced annotations)
resource "google_cloud_run_service" "backend" {
  provider = googlebeta
  name     = var.cloud_run_service_name
  location = var.region
  project  = var.project_id

  template {
    metadata {
      annotations = {
        # Attach Cloud SQL instance to the Cloud Run service
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres.connection_name
        # Keep revision retention low; autoscaling settings can be adjusted
        "autoscaling.knative.dev/maxScale" = "3"
      }
    }

    spec {
      containers {
        image = var.image_uri

        resources {
          limits = {
            cpu    = "0.25"    # small CPU to save costs
            memory = "512Mi"
          }
        }

        env {
          name  = "SQLALCHEMY_DATABASE_URL"
          value = "postgresql+psycopg2://${var.db_user}:${var.db_password}@/alrs?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }

        # If you prefer secret injection via secret manager, map them with secret env below (example)
        # Use google_cloud_run_service_iam_member to allow Cloud Run access to secrets (already done via service account IAM)
      }

      service_account_name = google_service_account.cloudrun_sa.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Make sure only the service account can invoke (tighten by default). For allowing public access, change member to "allUsers".
resource "google_cloud_run_service_iam_member" "invoker" {
  project = google_cloud_run_service.backend.project
  location = google_cloud_run_service.backend.location
  service  = google_cloud_run_service.backend.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
