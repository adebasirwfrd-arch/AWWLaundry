#!/usr/bin/env bash
# Salin AUTH_* dari monorepo root .env.local ke apps/web/.env.local
# Middleware Edge tidak bisa baca root env via fs — harus ada di apps/web/.env.local
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/.env.local"
DEST="$ROOT/apps/web/.env.local"

if [[ ! -f "$SRC" ]]; then
  echo "Tidak ditemukan: $SRC"
  exit 1
fi

touch "$DEST"
for KEY in AUTH_SECRET AUTH_URL AUTH_TRUST_HOST NEXT_PUBLIC_APP_URL NEXT_PUBLIC_APP_NAME; do
  LINE=$(grep -m1 "^${KEY}=" "$SRC" || true)
  [[ -z "$LINE" ]] && continue
  if grep -q "^${KEY}=" "$DEST" 2>/dev/null; then
    sed -i.bak "s|^${KEY}=.*|${LINE}|" "$DEST" && rm -f "$DEST.bak"
  else
    echo "$LINE" >> "$DEST"
  fi
  echo "  ✓ $KEY"
done
echo "Selesai → $DEST"
