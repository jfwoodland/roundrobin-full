#!/bin/bash

# Optional: Set project (only if you need to switch projects)
# gcloud config set project roundrobin-clean

# Deploy handle_call
gcloud functions deploy handle_call \
  --project="roundrobin-clean" \
  --region="us-central1" \
  --runtime python310 \
  --trigger-http \
  --entry-point handle_call \
  --source=handle_call \
  --allow-unauthenticated \
  --timeout=60s \
  --memory=256MB \
  --env-vars-file .env.yaml


