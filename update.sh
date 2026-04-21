#!/usr/bin/env bash
set -euo pipefail

echo "Creating missing monorepo structure (safe mode)..."

# Function: create dir if not exists
ensure_dir() {
  if [ ! -d "$1" ]; then
    mkdir -p "$1"
    echo "Created dir: $1"
  else
    echo "Exists dir:  $1"
  fi
}

# Function: create file if not exists
ensure_file() {
  if [ ! -f "$1" ]; then
    touch "$1"
    echo "Created file: $1"
  else
    echo "Exists file:  $1"
  fi
}

# Root dirs
ensure_dir backend
ensure_dir frontend
ensure_dir infra/caddy
ensure_dir infra/docker

# Backend
ensure_dir backend/alembic
ensure_file backend/alembic.ini
ensure_file backend/.env

# Frontend
ensure_file frontend/Dockerfile
ensure_file frontend/.env.local

# Infra
ensure_file infra/caddy/Caddyfile
ensure_file infra/docker/docker-compose.yml

# Root shared files
ensure_file .env
ensure_file .gitignore
ensure_file README.md

echo
echo "Done."
