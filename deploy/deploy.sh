#!/usr/bin/env bash
# Ejecutar en la VM, dentro de /opt/clickpass (clon del repo).
# Requiere: git, docker, .env en apps/backend/.env (no se versiona).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== git pull =="
git pull --ff-only

echo "== docker build (arquitectura nativa de esta VM) =="
docker build -f apps/backend/Dockerfile -t clickpass-backend:latest .

echo "== restart via systemd =="
sudo systemctl restart clickpass-backend
sudo systemctl status clickpass-backend --no-pager
