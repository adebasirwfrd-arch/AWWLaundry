#!/usr/bin/env bash
# Push production env vars to Vercel via CLI.
# Prasyarat: vercel login && vercel link (di folder apps/web)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/scripts/vercel-env-production.env"
WEB_DIR="$ROOT/apps/web"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "File tidak ditemukan: $ENV_FILE"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Belum login Vercel. Jalankan: vercel login"
  exit 1
fi

cd "$WEB_DIR"

if [[ ! -d ".vercel" ]]; then
  echo "Project belum di-link. Jalankan dari apps/web:"
  echo "  vercel link"
  exit 1
fi

echo "Mengirim env ke Vercel (production)..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  echo "  → $key"
  vercel env add "$key" production --value "$value" --yes --force </dev/null >/dev/null
done < "$ENV_FILE"

echo "Selesai. Redeploy di Vercel dashboard."
