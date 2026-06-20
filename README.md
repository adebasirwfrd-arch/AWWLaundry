# AWW Laundry — Franchise Management Platform

Platform manajemen franchise laundry end-to-end. **FRESH • CLEAN • FUN**

## Fitur MVP (Sudah Dibangun)

| Modul | Deskripsi |
|---|---|
| **POS Kasir** | Timbang → hitung harga → print struk + QR tracking |
| **Board Produksi** | Update status: cuci → kering → setrika → lipat → siap |
| **Dashboard Owner** | KPI harian, pipeline order, pendapatan, piutang |
| **Portal Pelanggan** | Lacak cucian real-time via nomor order |
| **Analitik** | Grafik 7 hari, breakdown metode pembayaran |
| **Stok & Pelanggan** | Inventori cabang, daftar pelanggan |
| **Auth + RBAC** | Owner, Manager, Kasir, Worker per cabang |
| **Audit Trail** | Log setiap order, payment, status change |
| **Rainbow Bubbles UI** | GSAP bubbles, design tokens dari logo |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup database (dari root project)
cd packages/database
npx prisma db push
npx tsx prisma/seed.ts
cd ../..

# 3. Jalankan web app
cd apps/web
npm run dev
```

Buka **http://localhost:3000**

### Akun Demo

| Role | Email | Password |
|---|---|---|
| Kasir (POS) | kasir@awwlaundry.com | password123 |
| Pekerja | worker@awwlaundry.com | password123 |
| Manager | manager@awwlaundry.com | password123 |
| Owner | owner@awwlaundry.com | password123 |

### Lacak Cucian (Publik)

http://localhost:3000/track — contoh order: `JKT01-20260618-0100`

## Struktur Project

```
aww-laundry/
├── apps/web/              # Next.js 15 web app
├── packages/
│   ├── database/          # Prisma + SQLite (dev) / PostgreSQL (prod)
│   ├── design-tokens/     # Rainbow Bubbles theme
│   └── shared/            # Utils & constants
└── docs/                  # Blueprint & design system
```

## Tech Stack

- Next.js 15 · React 19 · TypeScript
- Prisma 6 · SQLite (local) / PostgreSQL (Supabase production)
- NextAuth.js v5 · RBAC multi-tenant
- Tailwind CSS · GSAP · Recharts
- Zustand · TanStack Query

## Production (Supabase)

Copy `.env.example` ke `.env.local` dan isi `DATABASE_URL` dari Supabase Dashboard.
Lihat [ENV-SECRETS.md](./docs/ENV-SECRETS.md).

## Dokumentasi

- [BLUEPRINT.md](./docs/BLUEPRINT.md) — Arsitektur lengkap
- [DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) — Rainbow Bubbles theme
- [BRAND-ANIMATION.md](./docs/BRAND-ANIMATION.md) — GSAP & Lottie specs
