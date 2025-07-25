#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Create uploads directory if it doesn't exist
mkdir -p uploads 