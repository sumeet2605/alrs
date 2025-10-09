terraform {
  required_version = ">= 1.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.50"
    }
    googlebeta = {
      source  = "hashicorp/google-beta"
      version = ">= 4.50"
    }
  }
  backend "local" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "googlebeta" {
  project = var.project_id
  region  = var.region
}
