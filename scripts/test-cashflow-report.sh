#!/usr/bin/env sh
# Wrapper — jalankan dari mana saja dalam monorepo
cd "$(dirname "$0")/../apps/web" || exit 1
exec npx tsx scripts/test-cashflow-report.ts "$@"
