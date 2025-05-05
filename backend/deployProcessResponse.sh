#!/bin/bash

# Optional: Set project (only if you need to switch projects)
# gcloud config set project roundrobin-clean

# Deploy process_response
gcloud functions deploy process_response \
  --project="roundrobin-clean" \
  --region="us-central1" \
  --runtime python310 \
  --trigger-http \
  --entry-point process_response \
  --source process_response \
  --allow-unauthenticated \
  --timeout=60s \
  --memory=256MB \
  --env-vars-file .env.yaml


