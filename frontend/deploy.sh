PROJECT=alrprod
BUCKET=alrs-frontend-static
BACKEND_BUCKET=galleries-backend-bucket
URL_MAP=galleries-url-map
CERT_NAME=galleries-cert
PROXY=galleries-https-proxy
FORWARD_RULE=galleries-https-rule

# 1) backend bucket (enable CDN)
gcloud compute backend-buckets create galleries-backend-bucket \
  --gcs-bucket-name=alrs-frontend-static --enable-cdn --project=alrprod

# 2) url map
gcloud compute url-maps create galleries-url-map \
  --default-backend-bucket=alleries-backend-bucket --project=alrprod

# 3) managed SSL cert
gcloud compute ssl-certificates create galleries-cert \
  --domains=galleries.alluringlensstudios.com --project=alrprod

# 4) target HTTPS proxy (attach cert + url map)
gcloud compute target-https-proxies create galleries-https-proxy \
  --url-map=galleries-url-map --ssl-certificates=galleries-cert --project=alrprod

# 5) forwarding rule (global) -> gives you an IP
gcloud compute forwarding-rules create galleries-https-rule \
  --global --target-https-proxy=galleries-https-proxy --ports=443 --project=alrprod

# show the IP to configure DNS
gcloud compute forwarding-rules describe galleries-https-rule --global --project=alrprod --format="value(IPAddress)"



34.36.81.221


412832979617

gcloud projects add-iam-policy-binding alrprod \
  --member="serviceAccount:service-412832979617@gcp-sa-loadbalancing.iam.gserviceaccount.com" \
  --role="roles/compute.loadBalancerServiceAgent" || true

# 2) Grant Storage objectViewer to the load-balancer/compute service account(s)
gcloud storage buckets add-iam-policy-binding gs://alrs-frontend-static \
  --member="serviceAccount:service-412832979617@gcp-sa-loadbalancing.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer" || true

# 3) For some setups also add the compute system service account (fallback)
gcloud storage buckets add-iam-policy-binding gs://alrs-frontend-static \
  --member="serviceAccount:service-412832979617@compute-system.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer" || true