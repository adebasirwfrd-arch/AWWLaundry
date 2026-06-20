# AWW Laundry — Environment Variables & Secrets

> Panduan lengkap variabel lingkungan untuk development, staging, dan production.  
> **Jangan commit file `.env` ke git.** Gunakan `.env.example` sebagai template.

---

## 0. AWW Laundry — Project Instance Configuration

> Konfigurasi aktual project AWW Laundry.  
> **Secret asli** disimpan di `.env.local` (gitignored). Repo GitHub: [adebasirwfrd-arch/AWWLaundry](https://github.com/adebasirwfrd-arch/AWWLaundry.git)

### Repositori & Mobile

| Variable | Nilai | Rahasia? |
|---|---|:---:|
| `GITHUB_REPO` | `https://github.com/adebasirwfrd-arch/AWWLaundry.git` | — |
| `EAS_PROJECT_ID` | `56aa0cad-497c-4e5f-af20-1d866f93e8b7` | — |
| Expo setup | `npm i -g eas-cli` → `eas init --id 56aa0cad-497c-4e5f-af20-1d866f93e8b7` | — |
| EAS ↔ GitHub | Connect repo di [expo.dev](https://expo.dev) → Project → GitHub Integration | — |

### Phase 1 — MVP (Sudah Dikonfigurasi)

| Variable | Nilai / Status | Rahasia? | Dari Mana |
|---|---|:---:|---|
| `NODE_ENV` | `development` | — | Local |
| `APP_URL` | `http://localhost:3000` | — | Dev |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | — | Dev |
| `NEXT_PUBLIC_APP_NAME` | `AWW Laundry` | — | — |
| `SUPABASE_PROJECT_ID` | `svsakpnvikwrdoxxnfys` | — | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://svsakpnvikwrdoxxnfys.supabase.co` | — | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...JJ3EG_8` *(lihat .env.local)* | — | Supabase → API Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...h2LqM0A` *(lihat .env.local)* | ✅ | Supabase → API Settings |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_lKK2f4wOPmu375srmx71sg_L_og-nGs` | — | Supabase |
| `DATABASE_URL` | `postgresql://postgres.svsakpnvikwrdoxxnfys:[DB_PASSWORD]@...pooler.supabase.com:6543/postgres` | ✅ | Supabase → Settings → Database → Connection string |
| `DIRECT_URL` | Port `5432` (direct, tanpa pooler) | ✅ | Supabase → Database |
| `AUTH_SECRET` | Generated — *(lihat .env.local)* | ✅ | `npx auth secret` |
| `AUTH_URL` | `http://localhost:3000` | — | Dev |
| `AUTH_TRUST_HOST` | `true` | — | Production wajib |
| `AUTH_GOOGLE_ID` | `1056146520050-scqqdt75ablueftnaf5453ctctl6r7m2.apps.googleusercontent.com` | — | Google Cloud |
| `AUTH_GOOGLE_SECRET` | `GOCSPX-_Letl-••••••••` *(lihat .env.local)* | ✅ | Google Cloud → OAuth Client |
| Google Project ID | `csms-application-478203` | — | Google Cloud Console |
| `BREVO_API_KEY` | `xkeysib-••••••••` *(lihat .env.local)* | ✅ | Brevo → API Keys |
| `BREVO_SENDER_EMAIL` | `adeazhar.wfrd@gmail.com` | — | Brevo (verified sender) |
| `BREVO_SENDER_NAME` | `AWW Laundry` | — | — |

#### ⚠️ Google OAuth — Redirect URI Wajib Diperbaiki

Saat ini di Google Console redirect hanya `http://localhost:3000`. **Auth.js membutuhkan:**

| Environment | Authorized Redirect URI |
|---|---|
| Development | `http://localhost:3000/api/auth/callback/google` |
| Production | `https://app.awwlaundry.com/api/auth/callback/google` |

| Environment | Authorized JavaScript Origin |
|---|---|
| Development | `http://localhost:3000` |
| Production | `https://app.awwlaundry.com` |

#### ⚠️ DATABASE_URL — Password DB Belum Diisi

`anon key` dan `service role key` **bukan** password database PostgreSQL.  
Ambil dari: **Supabase Dashboard → Project Settings → Database → Database password** → paste ke `[DB_PASSWORD]` di `DATABASE_URL`.

---

### Phase 2 — Payment, Storage, Real-time (DUMMY — Update Nanti)

| Variable | Nilai Dummy | Rahasia? | Fungsi | Status |
|---|---|:---:|---|:---:|
| `REDIS_URL` | `rediss://default:DUMMY@DUMMY.upstash.io:6379` | ✅ | BullMQ, cache, rate limit | ⏳ Belum setup |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-DUMMY_REPLACE_ME` | ✅ | Payment backend | ⏳ Belum setup |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-DUMMY_REPLACE_ME` | — | Payment frontend | ⏳ Belum setup |
| `MIDTRANS_IS_PRODUCTION` | `false` | — | Sandbox mode | ⏳ Belum setup |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | `SB-Mid-client-DUMMY_REPLACE_ME` | — | QRIS/GoPay browser | ⏳ Belum setup |
| `S3_ENDPOINT` | `https://DUMMY.r2.cloudflarestorage.com` | — | Cloudflare R2 | ⏳ Belum setup |
| `S3_ACCESS_KEY_ID` | `DUMMY_ACCESS_KEY` | ✅ | Upload file | ⏳ Belum setup |
| `S3_SECRET_ACCESS_KEY` | `DUMMY_SECRET_KEY` | ✅ | Storage secret | ⏳ Belum setup |
| `S3_BUCKET_NAME` | `aww-laundry` | — | Nama bucket | ⏳ Belum setup |
| `S3_PUBLIC_URL` | `https://cdn.awwlaundry.com` | — | CDN URL | ⏳ Belum setup |
| `SOCKET_SERVER_URL` | `http://localhost:3001` | — | WebSocket server | ⏳ Belum setup |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | — | Client WebSocket | ⏳ Belum setup |

---

### Phase 3 — AI Analysis (Sudah Dikonfigurasi)

| Variable | Nilai | Rahasia? | Fungsi |
|---|---|:---:|---|
| `OPENAI_API_KEY` | `sk-proj-••••••••` *(lihat .env.local)* | ✅ | Chatbot + business AI |
| `OPENAI_MODEL_CHATBOT` | `gpt-4o-mini` | — | Chatbot pelanggan (murah) |
| `OPENAI_MODEL_BUSINESS` | `gpt-4o-mini` | — | AI analysis owner/manager |

---

### Phase 4 — Mobile & Notifikasi

| Variable | Nilai / Status | Platform | Fungsi | Status |
|---|---|---|---|:---:|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api` (dev) | Mobile | Base API | ✅ |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Sama dengan `AUTH_GOOGLE_ID` | Mobile | Google login web | ✅ |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | *(buat di Google Console)* | iOS | Google login | ⏳ |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | *(buat di Google Console)* | Android | Google login | ⏳ |
| `EAS_PROJECT_ID` | `56aa0cad-497c-4e5f-af20-1d866f93e8b7` | Mobile | EAS Build | ✅ |
| `FCM_SERVER_KEY` | `DUMMY_FCM_SERVER_KEY` | Android | Push notification | ⏳ |
| `FONNTE_API_KEY` | `DUMMY_FONNTE_API_KEY` | Opsional | WhatsApp | ⏳ |
| `WABLAS_API_KEY` | `DUMMY_WABLAS_API_KEY` | Opsional | WhatsApp | ⏳ |

---

### File Environment Project

```
aww-laundry/
├── .env.example     ← Template publik (aman di-commit, tanpa secret asli)
├── .env.local       ← Secret asli (GITIGNORED — jangan commit!)
└── .gitignore       ← Melindungi .env.local & client_secret*.json
```

**Setup cepat:**
```bash
cp .env.example .env.local
# Edit .env.local — isi DATABASE_URL password & secret lainnya
```

---

## Ringkasan per Fase

| Fase | Env Wajib | Opsional |
|---|---|---|
| **Phase 1 — MVP** | Database, Auth, Google OAuth, Brevo, App URL | Sentry, Redis |
| **Phase 2 — Ops** | + Redis/BullMQ, Midtrans, R2/S3, Socket.io | Xendit (alternatif) |
| **Phase 3 — AI** | + OpenAI | — |
| **Phase 4 — Scale** | + WhatsApp, Push (FCM/APNs), EAS | Pusher/Ably |

---

## 1. Core Application

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `NODE_ENV` | ✅ | `development` | `development` · `staging` · `production` |
| `APP_URL` | ✅ | `http://localhost:3000` | URL publik web app (tanpa trailing slash) |
| `API_URL` | ✅ | `http://localhost:3000/api` | Base URL API |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` | Exposed ke browser (OAuth redirect, links) |
| `NEXT_PUBLIC_APP_NAME` | — | `AWW Laundry` | Nama tampilan aplikasi |

**Generate secret acak:**
```bash
openssl rand -base64 32
```

---

## 2. Database — PostgreSQL

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@localhost:5432/aww_laundry` | Connection string Prisma |
| `DIRECT_URL` | — | sama dengan DATABASE_URL | Direct connection (Supabase pooler) |

**Provider rekomendasi:** Supabase · Railway · Neon · self-hosted PostgreSQL 16

```env
# Local (docker-compose)
DATABASE_URL="postgresql://aww:aww_secret@localhost:5432/aww_laundry?schema=public"

# Supabase (dengan pooler)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

---

## 3. Authentication — Auth.js v5

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `AUTH_SECRET` | ✅ | `(32+ char random)` | Encrypt session JWT — **RAHASIA** |
| `AUTH_URL` | ✅ | `http://localhost:3000` | Base URL untuk Auth.js (sama dengan APP_URL) |
| `AUTH_TRUST_HOST` | ✅ (prod) | `true` | Wajib di Vercel/production |

```bash
# Generate AUTH_SECRET
npx auth secret
# atau
openssl rand -base64 33
```

---

## 4. Google OAuth (Login & Sign Up)

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `AUTH_GOOGLE_ID` | ✅ | `123456789-abc.apps.googleusercontent.com` | Client ID |
| `AUTH_GOOGLE_SECRET` | ✅ | `GOCSPX-xxxxxxxx` | Client Secret — **RAHASIA** |

**Cara dapatkan:**
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. **Authorized redirect URIs:**
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://app.awwlaundry.com/api/auth/callback/google`

**Mobile (Expo) — tambahan:**
| Variable | Wajib | Keterangan |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ✅ | Sama dengan `AUTH_GOOGLE_ID` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | ✅ (iOS) | iOS OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | ✅ (Android) | Android OAuth client ID |

---

## 5. Email — Brevo (Sendinblue)

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `BREVO_API_KEY` | ✅ | `xkeysib-xxxxxxxx` | API key — **RAHASIA** |
| `BREVO_SENDER_EMAIL` | ✅ | `noreply@awwlaundry.com` | Email pengirim (harus terverifikasi di Brevo) |
| `BREVO_SENDER_NAME` | — | `AWW Laundry` | Nama pengirim |
| `BREVO_TEMPLATE_VERIFY_EMAIL` | — | `1` | Template ID verifikasi email |
| `BREVO_TEMPLATE_RESET_PASSWORD` | — | `2` | Template ID reset password |
| `BREVO_TEMPLATE_MONTHLY_REPORT` | — | `3` | Template ID laporan PDF bulanan |

**Cara dapatkan:** [Brevo](https://www.brevo.com/) → SMTP & API → API Keys

---

## 6. Payment Gateway — Midtrans (Rekomendasi)

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `MIDTRANS_SERVER_KEY` | ✅ (Phase 2) | `SB-Mid-server-xxxxxxxx` | Server key — **RAHASIA** |
| `MIDTRANS_CLIENT_KEY` | ✅ (Phase 2) | `SB-Mid-client-xxxxxxxx` | Client key (boleh public di frontend) |
| `MIDTRANS_IS_PRODUCTION` | ✅ | `false` | `false` = sandbox · `true` = production |
| `MIDTRANS_WEBHOOK_SECRET` | — | custom string | Verifikasi signature webhook |

**Frontend (boleh public):**
| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Snap/QRIS di browser |

**Webhook URL:** `https://app.awwlaundry.com/api/v1/webhooks/midtrans`

### Alternatif: Xendit

| Variable | Keterangan |
|---|---|
| `XENDIT_SECRET_KEY` | Secret API key — **RAHASIA** |
| `XENDIT_WEBHOOK_TOKEN` | Token verifikasi webhook |
| `NEXT_PUBLIC_XENDIT_PUBLIC_KEY` | Public key (frontend) |

> Pilih **satu** gateway utama (Midtrans atau Xendit), tidak perlu keduanya.

---

## 7. Redis & Job Queue — Upstash

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `REDIS_URL` | ✅ (Phase 2) | `rediss://default:pass@host.upstash.io:6379` | BullMQ + cache + rate limit |
| `UPSTASH_REDIS_REST_URL` | — | `https://xxx.upstash.io` | Alternatif REST (edge) |
| `UPSTASH_REDIS_REST_TOKEN` | — | `AXxx...` | Token REST — **RAHASIA** |

**Cara dapatkan:** [Upstash Console](https://console.upstash.com/) → Create Redis Database

---

## 8. Real-time — Socket.io / Pusher

### Opsi A: Self-hosted Socket.io

| Variable | Wajib | Contoh |
|---|---|---|
| `SOCKET_SERVER_URL` | ✅ | `https://ws.awwlaundry.com` |
| `SOCKET_CORS_ORIGIN` | ✅ | `https://app.awwlaundry.com` |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | URL yang diakses client |

### Opsi B: Pusher / Ably (managed)

| Variable | Keterangan |
|---|---|
| `PUSHER_APP_ID` | App ID |
| `PUSHER_KEY` | Key (public) |
| `PUSHER_SECRET` | Secret — **RAHASIA** |
| `PUSHER_CLUSTER` | e.g. `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | Client key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Client cluster |

---

## 9. File Storage — Cloudflare R2 / AWS S3

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `S3_ENDPOINT` | ✅ (Phase 2) | `https://xxx.r2.cloudflarestorage.com` | R2 atau S3 endpoint |
| `S3_ACCESS_KEY_ID` | ✅ | `xxxxxxxx` | Access key — **RAHASIA** |
| `S3_SECRET_ACCESS_KEY` | ✅ | `xxxxxxxx` | Secret key — **RAHASIA** |
| `S3_BUCKET_NAME` | ✅ | `aww-laundry` | Nama bucket |
| `S3_REGION` | ✅ | `auto` | R2: `auto` · S3: `ap-southeast-1` |
| `S3_PUBLIC_URL` | — | `https://cdn.awwlaundry.com` | CDN/public URL untuk file |

**Digunakan untuk:** bukti transfer, avatar upload, logo cabang, PDF laporan bulanan

---

## 10. AI — OpenAI (Phase 3)

| Variable | Wajib | Contoh | Keterangan |
|---|---|:---:|---|
| `OPENAI_API_KEY` | ✅ (Phase 3) | `sk-proj-xxxxxxxx` | API key — **RAHASIA** |
| `OPENAI_MODEL_CHATBOT` | — | `gpt-4o-mini` | Model chatbot pelanggan (murah) |
| `OPENAI_MODEL_BUSINESS` | — | `gpt-4o` | Model AI analysis owner/manager |
| `OPENAI_MAX_TOKENS` | — | `2048` | Batas token per response |
| `AI_RATE_LIMIT_PER_DAY` | — | `50` | Limit query business AI per user |

**Cara dapatkan:** [OpenAI Platform](https://platform.openai.com/api-keys)

---

## 11. WhatsApp Notifikasi (Phase 4 — Opsional)

### Fonnte

| Variable | Keterangan |
|---|---|
| `FONNTE_API_KEY` | API key — **RAHASIA** |
| `FONNTE_DEVICE_ID` | ID device WhatsApp |

### Wablas

| Variable | Keterangan |
|---|---|
| `WABLAS_API_KEY` | API key — **RAHASIA** |
| `WABLAS_BASE_URL` | `https://solo.wablas.com/api` |

---

## 12. Push Notification — Mobile (Phase 4)

| Variable | Wajib | Keterangan |
|---|---|:---:|---|
| `EXPO_PUBLIC_PROJECT_ID` | ✅ | Expo project ID (EAS) |
| `FCM_SERVER_KEY` | ✅ (Android) | Firebase Cloud Messaging — **RAHASIA** |
| `APNS_KEY_ID` | ✅ (iOS) | Apple Push Notification key ID |
| `APNS_TEAM_ID` | ✅ (iOS) | Apple Developer Team ID |
| `APNS_KEY_PATH` | ✅ (iOS) | Path ke file `.p8` (jangan commit!) |

**Setup:** Expo → EAS → Credentials (FCM + APNs dikelola EAS)

---

## 13. Monitoring & Logging

| Variable | Wajib | Keterangan |
|---|---|:---:|---|
| `SENTRY_DSN` | — | Error tracking server — **RAHASIA** |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Error tracking client (boleh public) |
| `SENTRY_AUTH_TOKEN` | — | CI/CD release tracking |
| `AXIOM_TOKEN` | — | Log aggregation — **RAHASIA** |
| `AXIOM_DATASET` | — | Nama dataset log |

---

## 14. Mobile — Expo / EAS

| Variable | Wajib | Keterangan |
|---|---|:---:|---|
| `EXPO_PUBLIC_API_URL` | ✅ | `https://app.awwlaundry.com/api` |
| `EXPO_PUBLIC_SOCKET_URL` | — | WebSocket URL |
| `EAS_PROJECT_ID` | ✅ | UUID project EAS |
| `EXPO_PUBLIC_APP_ENV` | — | `development` · `staging` · `production` |

**EAS Secrets (disimpan di EAS, bukan .env):**
```bash
eas secret:create --name AUTH_SECRET --value "..."
eas secret:create --name DATABASE_URL --value "..."
```

---

## 15. Security & Rate Limiting

| Variable | Default | Keterangan |
|---|---|---|
| `RATE_LIMIT_REQUESTS` | `100` | Request per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window dalam ms |
| `CRON_SECRET` | — | Proteksi endpoint cron (laporan PDF) — **RAHASIA** |
| `WEBHOOK_SECRET_MIDTRANS` | — | Verifikasi webhook payment |
| `ENCRYPTION_KEY` | — | Enkripsi data sensitif at-rest (opsional) |

```bash
# Generate CRON_SECRET
openssl rand -hex 32
```

---

## Template `.env` — Development (Phase 1 MVP)

Salin ke `apps/web/.env.local`:

```env
# ── App ──────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="AWW Laundry"

# ── Database ─────────────────────────────────────
DATABASE_URL="postgresql://aww:aww_secret@localhost:5432/aww_laundry?schema=public"

# ── Auth.js ──────────────────────────────────────
AUTH_SECRET=                                    # npx auth secret
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# ── Google OAuth ─────────────────────────────────
AUTH_GOOGLE_ID=                                 # Google Cloud Console
AUTH_GOOGLE_SECRET=                             # RAHASIA

# ── Brevo Email ──────────────────────────────────
BREVO_API_KEY=                                  # RAHASIA
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME="AWW Laundry"

# ── Phase 2+ (kosongkan dulu) ────────────────────
# REDIS_URL=
# MIDTRANS_SERVER_KEY=
# MIDTRANS_CLIENT_KEY=
# MIDTRANS_IS_PRODUCTION=false
# S3_ENDPOINT=
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_BUCKET_NAME=
# OPENAI_API_KEY=
# SENTRY_DSN=
```

---

## Template `.env` — Production

```env
NODE_ENV=production
APP_URL=https://app.awwlaundry.com
NEXT_PUBLIC_APP_URL=https://app.awwlaundry.com

DATABASE_URL=                                   # RAHASIA — production DB
AUTH_SECRET=                                    # RAHASIA — generate baru, beda dari dev
AUTH_URL=https://app.awwlaundry.com
AUTH_TRUST_HOST=true

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=                             # RAHASIA

BREVO_API_KEY=                                  # RAHASIA
BREVO_SENDER_EMAIL=noreply@awwlaundry.com

REDIS_URL=                                      # RAHASIA
MIDTRANS_SERVER_KEY=                            # RAHASIA — production key
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=true
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=

S3_ENDPOINT=
S3_ACCESS_KEY_ID=                               # RAHASIA
S3_SECRET_ACCESS_KEY=                           # RAHASIA
S3_BUCKET_NAME=aww-laundry-prod
S3_PUBLIC_URL=https://cdn.awwlaundry.com

OPENAI_API_KEY=                                 # RAHASIA
SENTRY_DSN=                                     # RAHASIA
NEXT_PUBLIC_SENTRY_DSN=

SOCKET_SERVER_URL=https://ws.awwlaundry.com
NEXT_PUBLIC_SOCKET_URL=https://ws.awwlaundry.com

CRON_SECRET=                                    # RAHASIA
```

---

## Di Mana Menyimpan Secrets per Environment

| Environment | Rekomendasi |
|---|---|
| **Local dev** | `apps/web/.env.local` (gitignored) |
| **Vercel (web)** | Project Settings → Environment Variables |
| **Railway/Fly (workers)** | Service Variables dashboard |
| **EAS (mobile)** | `eas secret:create` atau EAS dashboard |
| **CI/CD (GitHub Actions)** | Repository Secrets |
| **Team sharing** | 1Password / Doppler / Infisical |

---

## Checklist Setup Awal (Urutan Disarankan)

- [ ] 1. PostgreSQL — `DATABASE_URL`
- [ ] 2. Generate — `AUTH_SECRET`
- [ ] 3. Google Cloud — `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`
- [ ] 4. Brevo — `BREVO_API_KEY` + verifikasi sender email
- [ ] 5. Deploy staging — set `APP_URL` + `AUTH_URL`
- [ ] 6. (Phase 2) Upstash Redis — `REDIS_URL`
- [ ] 7. (Phase 2) Midtrans sandbox — payment keys
- [ ] 8. (Phase 2) Cloudflare R2 — storage keys
- [ ] 9. (Phase 3) OpenAI — `OPENAI_API_KEY`
- [ ] 10. (Phase 4) Expo EAS + Firebase FCM + Apple APNs

---

## ⚠️ Aturan Keamanan

1. **Jangan commit** `.env`, `.env.local`, `.env.production` ke git
2. Tambahkan ke `.gitignore`: `.env*` kecuali `.env.example`
3. Prefix `NEXT_PUBLIC_` / `EXPO_PUBLIC_` = **boleh** terekspos ke browser
4. Tanpa prefix = **server-only** — jangan pernah kirim ke client
5. Gunakan **key berbeda** untuk development vs production
6. Rotate secrets jika pernah bocor atau karyawan keluar
7. Midtrans `SERVER_KEY` dan `OPENAI_API_KEY` adalah yang paling kritis
