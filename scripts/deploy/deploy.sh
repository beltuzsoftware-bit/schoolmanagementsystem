#!/bin/bash
# VPS Deploy Orchestration Script for KuMMi School Management System
set -e

# Resolve the absolute path to the project root directory (two levels up from scripts/deploy)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_DIR"

echo "=== Navigated to project root: $APP_DIR ==="

echo "=== Pulling latest changes from Git ==="
git pull

echo "=== Installing Dependencies ==="
npm install

echo "=== Generating Database Client ==="
npx prisma generate

echo "=== Building Next.js Standalone Application ==="
npm run build

echo "=== Running Standalone Postbuild Copy ==="
npm run postbuild

echo "=== Ensuring Logs directory exists ==="
mkdir -p logs

echo "=== Starting/Reloading Application via PM2 ==="
pm2 startOrReload scripts/deploy/ecosystem.config.js

echo "=== Deployment Completed Successfully ==="
