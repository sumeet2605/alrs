import os
import json
from typing import Any, Dict
from google.cloud import tasks_v2  # type: ignore
from google.protobuf import timestamp_pb2  # type: ignore
from app.config import GCP_PROJECT_ID
from app.settings import settings
from google.oauth2 import service_account #type: ignore


def enqueue_image_processing(filename: str, path_original: str, owner_id: str, gallery_id: str) -> Dict[str, Any]:
    """Create a Cloud Tasks HTTP task that will call the worker endpoint to process an image.

    Expects the following environment variables to be set (or fall back to settings):
      - CLOUD_TASKS_QUEUE: queue name
      - CLOUD_TASKS_LOCATION: location (region)
      - CLOUD_TASKS_WORKER_URL: full URL of the worker endpoint (e.g. https://svc-...run.app/api/v1/process-image)
      - CLOUD_TASKS_OIDC_SERVICE_ACCOUNT: (optional) service account to attach OIDC token for auth
    """
    queue = settings.CLOUD_TASKS_QUEUE
    location = settings.CLOUD_TASKS_LOCATION
    worker_url = settings.CLOUD_TASKS_TARGET_URL
    oidc_sa = settings.CLOUD_TASKS_OIDC_SERVICE_ACCOUNT

    if not queue or not location or not worker_url:
        raise RuntimeError("CLOUD_TASKS_QUEUE, CLOUD_TASKS_LOCATION and CLOUD_TASKS_WORKER_URL must be set to enqueue tasks")

    if settings.DEBUG:
        creds = service_account.Credentials.from_service_account_file("alrprod-task.json")
        client = tasks_v2.CloudTasksClient(credentials=creds)
    else: 
        client = tasks_v2.CloudTasksClient()

    project = getattr(settings, "GCP_PROJECT_ID", None) or GCP_PROJECT_ID
    if not project:
        raise RuntimeError("GCP project id not configured")

    parent = client.queue_path(project, location, queue)
    print(worker_url)
    payload = {
        "filename": filename,
        "path_original": path_original,
        "owner_id": owner_id,
        "gallery_id": gallery_id,
    }

    task: Dict[str, Any] = {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": worker_url,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(payload).encode(),
        }
    }

    # Attach OIDC token if service account provided (Cloud Run worker can verify)
    if oidc_sa:
        task["http_request"]["oidc_token"] = {"service_account_email": oidc_sa}

    response = client.create_task(parent=parent, task=task)
    return {"name": response.name}
