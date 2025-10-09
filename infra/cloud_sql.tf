resource "google_sql_database_instance" "postgres" {
  provider         = google
  name             = var.cloud_sql_instance_name
  project          = var.project_id
  database_version = var.db_version
  region           = var.region

  settings {
    # Micro tier to keep costs low (db-f1-micro)
    tier = "db-f1-micro"

    disk_autoresize = true
    disk_size       = 10
  }

  deletion_protection = false
  # Optional: enable private IP later
}

resource "google_sql_database" "db" {
  provider = google
  name     = "alrs"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "google_sql_user" "db_user" {
  provider = google
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
  password = var.db_password
}
