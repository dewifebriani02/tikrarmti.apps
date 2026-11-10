# Tikrarmti Apps — Developer Reference

**Versi dokumen:** 1.0
**Tanggal:** 2026-05-14
**Status:** Living document — update setiap ada perubahan struktural
**Audience:** Developer (frontend, backend, fullstack), tech lead, kontributor baru

> Dokumen ini adalah **single source of truth** teknis untuk repositori `tikrarmti.apps`.
>
> **Hierarki sumber kebenaran:**
> 1. **Kode di `app/`** — kebenaran tentang what is, sekarang
> 2. **`docs/DEVELOPER_REFERENCE.md`** (file ini) — kebenaran tentang konvensi & arsitektur
> 3. **Supabase Database** — kebenaran tentang data schema & RLS
> 4. **`types/supabase.ts`** — generated types (read-only)

---

## Daftar Isi

1. [Pengantar Singkat](#1-pengantar-singkat)
2. [Quick Start](#2-quick-start)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Tech Stack & Versi](#4-tech-stack--versi)
5. [Struktur Repositori](#5-struktur-repositori)
6. [Routing & Halaman](#6-routing--halaman)
7. [Data Model & Database](#7-data-model--database)
8. [Server Actions & API](#8-server-actions--api)
9. [Autentikasi & RBAC](#9-autentikasi--rbac)
10. [Komponen UI & Design System](#10-komponen-ui--design-system)
11. [State Management & Data Fetching](#11-state-management--data-fetching)
12. [Coding Conventions](#12-coding-conventions)
13. [Testing Strategy](#13-testing-strategy)
14. [Build, Lint, & CI](#14-build-lint--ci)
15. [Deployment & Environments](#15-deployment--environments)
16. [Keamanan & Compliance](#16-keamanan--compliance)
17. [Roadmap Teknis](#17-roadmap-teknis)
18. [Onboarding Checklist](#18-onboarding-checklist)
19. [Glossary & Referensi](#19-glossary--referensi)

---

## 1. Pengantar Singkat

**Tikrarmti Apps** adalah aplikasi web untuk **Markaz Tikrar Indonesia (MTI)** — platform penghafalan Al-Qur'an digital dengan metode Tikrar 7-tahap.

### 1.1 Arsitektur informasi (locked)

**Multi-role, hierarchical access:**

```
Thalibah (peserta aktif)
  ├─ /dashboard              → progres harian, statistik, jurnal, tashih
  ├─ /jurnal-harian         → input jurnal Tikrar (7 tahap)
  ├─ /tashih                → input rekaman bacaan untuk validasi
  ├─ /perjalanan-saya        → timeline milestone & status kelulusan
  └─ /daftar-ulang          → konfirmasi akad & re-enrollment batch

Muallimah (pengajar)
  ├─ /dashboard              → statistik halaqah, thalibah aktif
  ├─ /management-tashih      → penilaian rekaman tashih thalibah
  └─ /management-halaqah    → info halaqah, jadwal, daftar thalibah

Musyrifah (pengawas)
  ├─ /dashboard              → monitoring kedisiplinan, SP
  └─ /management-surat-peringatan → terbitkan SP untuk thalibah

Admin (pengelola)
  ├─ /dashboard              → overview keseluruhan
  ├─ /admin/users           → manajemen user
  ├─ /admin/batch-program    → manajemen batch & program
  ├─ /admin/selection       → proses seleksi thalibah
  └─ /admin/certificate     → sertifikat & kelulusan
```

### 1.2 Alur Bisnis Utama

| Fase | Deskripsi | Status |
|---|---|---|
| **Onboarding** | Registrasi, lengkapi profil, buat akun | ✅ |
| **Pendaftaran & Seleksi** | Pilih batch, ujian tulis & lisan, hasil seleksi | ✅ |
| **Daftar Ulang** | Konfirmasi akad, pilih halaqah, pairing sistem | ✅ |
| **Siklus Belajar Harian** | Tashih + Jurnal 7-tahap Tikrar | ✅ |
| **Monitoring Kedisiplinan** | Dashboard stats, SP system, dropout auto | ✅ |
| **Evaluasi & Kelulusan** | Ujian akhir pekan 13, kelulusan pekan 13, sertifikat | 🟡 |

> **Prinsip arah:** fokus pada stabilitas siklus belajar harian, kualitas penilaian tashih, dan otomasi monitoring kedisiplinan.

---

## 2. Quick Start

### 2.1 Prasyarat

| Tool | Versi Minimum | Catatan |
|------|---------------|---------|
| Node.js | 18.17+ | Disarankan LTS terbaru |
| npm | 9+ | Bawaan Node.js |
| Git | 2.30+ | |
| Akun Supabase | — | Akses ke project `nmbvklixthlqtkkgqnjl` |

> **Stack pinned:** Next.js **14.2.35** + React **18.3.1**. Jangan upgrade ke Next 16 / React 19 — ada breaking changes yang sudah di-rollback.

### 2.2 Setup pertama kali

```bash
cd tikrarmti.apps
npm install
cp .env.example .env.local
npx supabase gen types typescript --project-id nmbvklixthlqtkkgqnjl > types/supabase.ts
npm run dev
```

Aplikasi terbuka di **<http://localhost:3006>**

### 2.3 Skrip yang tersedia

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server (port 3006) |
| `npm run build` | Production build (regenerate build info) |
| `npm run start` | Production server lokal |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript strict check (tsc --noEmit) |
| `npm run gen-types` | Regenerate types/supabase.ts |
| `npm run generate-build-info` | Regenerate build metadata |
| `npm run update-selection` | Update status seleksi batch |
| `npm run debug:jurnal` | Cek isi jurnal harian (debug) |
| `npm run test:block-mapping` | Validasi mapping blok hafalan |

### 2.4 Konvensi `.env`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3006"

# reCAPTCHA (wajib untuk registrasi)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="..."
RECAPTCHA_SECRET_KEY="..."

# Rate Limiting (production)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Optional
NEXT_PUBLIC_SENTRY_DSN="..."
```

`.env.local` **tidak** di-commit. Selalu tambahkan variabel baru ke `.env.example`.

---

## 3. Arsitektur Sistem

### 3.1 High-Level Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                      BROWSER (User)                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Server Comp.    │  │  Client Comp.    │  │  Admin UI    │ │
│  │  (RSC, default)  │  │  ("use client")  │  │  (preview)   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┘ │
└───────────┼─────────────────────┼───────────────────────────────────┘
            │ render               │ events
┌───────────▼─────────────────────▼───────────────────────────────────┐
│                    NEXT.JS APP ROUTER (14.2.35)                   │
│   Route groups: (public) | (protected) | (admin)                 │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Route Handlers   │   Server Actions   │   Middleware       │    │
│  │  (api/...)        │   ("use server")   │   (auth/CSRF)     │    │
│  └────────┬──────────────────┬─────────────────┬─────────────┘    │
└───────────┼──────────────────┼─────────────────┼───────────────────┘
            │                  │                 │
            │            ┌─────▼─────┐   ┌─────▼──────┐
            │            │   RBAC    │   │   Auth     │
            │            │  (lib/)   │   │  (Supabase)│
            │            └─────┬─────┘   └─────────────┘
            │                  │
       ┌────▼──────────────────▼────┐
       │      Supabase Client       │
       │  (Server / Admin / SSR)  │
       └────────────┬───────────────┘
                    │
            ┌───────▼────────┐
            │  Supabase DB   │
            │  PostgreSQL    │
            └────────────────┘
```

### 3.2 Pola arsitektural inti

1. **Server-first rendering.** Default semua page adalah React Server Component (RSC). `"use client"` dipakai hanya saat butuh state/event/browser API.
2. **Server Actions sebagai mutasi.** Mutasi data lewat function `"use server"` di `app/actions/` atau route handler `app/api/`.
3. **RLS as Final Guard.** Keamanan data mutlak di level database (Row Level Security), bukan hanya di server code.
4. **Hierarchical RBAC.** Role sistem berbasis peringkat (admin 100, musyrifah 80, muallimah 60, thalibah 40, calon_thalibah 20).
5. **Fail Fast.** Konfigurasi kritis hilang → crash di startup, bukan saat request user.

### 3.3 Boundary tanggung jawab

| Layer | Boleh | Tidak boleh |
|---|---|---|
| **`src/app/<route>/page.tsx`** | Layout halaman, fetching data via RSC | Logika bisnis di body komponen |
| **`components/`** | UI presentational, state lokal kecil | Akses Supabase langsung |
| **`lib/rbac.ts`** | Auth & authorization | UI, database query |
| **`lib/supabase/`** | Supabase client singleton | Logika domain |
| **`lib/schemas/`** | Zod validation schemas | Business logic |

---

## 4. Tech Stack & Versi

### 4.1 Runtime & framework

| Tool | Versi | Catatan |
|---|---|---|
| Next.js | **14.2.35** | App Router, Server Actions |
| React | 18.3.1 | RSC + Hooks API |
| React DOM | 18.3.1 | |
| TypeScript | ^5 | Strict mode aktif |

### 4.2 Data layer

| Tool | Versi | Catatan |
|---|---|---|
| Supabase | ^2.86.0 | PostgreSQL + Auth + Storage |
| @supabase/ssr | ^0.8.0 | Server-side rendering support |
| @upstash/redis | ^1.35.7 | Rate limiting (production) |
| @upstash/ratelimit | ^2.0.7 | Rate limiting helpers |

### 4.3 UI

| Tool | Versi | Catatan |
|---|---|---|
| Tailwind CSS | ^3.4.8 | Styling |
| Tailwind Animate | ^1.0.7 | Animasi |
| @radix-ui/* | ^1.x | shadcn/ui primitives |
| lucide-react | ^0.555.0 | Icon set |
| clsx | ^2.1.1 | Conditional class |
| tailwind-merge | ^3.4.0 | Merge classes |

### 4.4 Utility

| Tool | Versi | Catatan |
|---|---|---|
| zod | ^4.2.1 | Validation |
| swr | ^2.3.8 | Data fetching |
| date-fns | ^4.1.0 | Date formatting |
| dompurify | ^3.3.0 | HTML sanitization |

### 4.5 Monitoring & Analytics

| Tool | Versi | Catatan |
|---|---|---|
| @sentry/nextjs | ^10.32.1 | Error tracking |
| react-hot-toast | ^2.6.0 | Toast (legacy) |
| sonner | ^2.0.7 | Toast (current) |

---

## 5. Struktur Repositori

### 5.1 Top-level

```
tikrarmti.apps/
├── app/                    # Next.js App Router
├── components/              # Shared UI components
├── lib/                    # Business logic, utilities
├── types/                  # TypeScript types (generated + custom)
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── supabase/              # Migrations
├── docs/                  # Documentation
└── hooks/                 # Custom hooks (legacy)
```

### 5.2 `app/` — struktur

```
app/
├── (public)/                    # Route group: tanpa auth
│   ├── layout.tsx
│   ├── page.tsx                 # Landing
│   ├── login/
│   └── register/
├── (protected)/                 # Route group: butuh login + RBAC
│   ├── layout.tsx               # SECURITY GATE & ROLE SYNTHESIS
│   ├── dashboard/               # Per-role dashboard
│   ├── jurnal-harian/           # Jurnal Tikrar 7-tahap
│   ├── tashih/                 # Input rekaman tashih
│   ├── perjalanan-saya/         # Timeline milestone
│   ├── daftar-ulang/           # Re-enrollment
│   └── admin/                  # Admin panel (protected + admin check)
│       ├── users/
│       ├── batch-program/
│       ├── selection/
│       └── certificate/
├── api/                        # REST API routes
│   ├── auth/
│   ├── admin/
│   └── ...
└── layout.tsx                   # Root layout
```

---

## 6. Routing & Halaman

### 6.1 Route map utama

**Public group `(public)`** — tanpa sidebar/auth:

| Path | Tipe | Status |
|---|---|---|
| `/` | Landing | ✅ |
| `/login` | Auth | ✅ |
| `/register` | Auth | ✅ |

**Protected group `(protected)`** — butuh auth + RBAC:

| Path | Tipe | Role | Status |
|---|---|---|---|
| `/dashboard` | Multi-role dashboard | semua | ✅ |
| `/jurnal-harian` | Input jurnal Tikrar | thalibah | ✅ |
| `/tashih` | Input rekaman tashih | thalibah | ✅ |
| `/perjalanan-saya` | Timeline milestone | thalibah | ✅ |
| `/daftar-ulang` | Re-enrollment | thalibah | ✅ |
| `/admin/users` | Manajemen user | admin | ✅ |
| `/admin/batch-program` | Manajemen batch | admin | ✅ |
| `/admin/selection` | Seleksi thalibah | admin/musyrifah | ✅ |

### 6.2 Layout strategi

```
app/layout.tsx                       → root: <html><body>{children}</body></html>
app/(public)/layout.tsx              → tanpa sidebar
app/(protected)/layout.tsx            → RBAC gate + role synthesis
app/(protected)/admin/layout.tsx       → admin-only + preview mode
```

---

## 7. Data Model & Database

### 7.1 Tabel utama

| Tabel | Deskripsi |
|---|---|
| `users` | User profiles dengan hierarchical roles |
| `batches` | Batch program (14 pekan) |
| `programs` | Program dalam batch (Tikrar Tahfidz, dll) |
| `halaqah` | Kelas/kelompok belajar |
| `pendaftaran_tikrar_tahfidz` | Registrasi thalibah |
| `daftar_ulang_submissions` | Re-enrollment thalibah |
| `muallimah_registrations` | Registrasi muallimah |
| `musyrifah_registrations` | Registrasi musyrifah |
| `jurnal_records` | Jurnal harian Tikrar (7 tahap) |
| `tashih_records` | Catatan validasi bacaan |
| `exam_attempts` | Hasil ujian |
| `exam_questions` | Bank soal ujian |
| `presensi` | Kehadiran halaqah |
| `study_partners` | Pairing thalibah |
| `activity_logs` | Log aktivitas |
| `audit_logs` | Log audit |
| `system_logs` | Log sistem/error |

### 7.2 RLS Policies

**Prinsip:** Semua tabel berisi data user wajib RLS aktif.

Contoh pola standar:
```sql
-- User akses data sendiri
CREATE POLICY "Users can access own data"
ON table_name
FOR SELECT
USING (user_id = auth.uid());

-- Admin akses semua
CREATE POLICY "Admin can access all"
ON table_name
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND 'admin' = ANY(users.roles)
  )
);
```

---

## 8. Server Actions & API

### 8.1 Route handler structure

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/rbac'
import { createServerClient } from '@/lib/supabase/server'
import { ApiResponses } from '@/lib/api-responses'
import { adminRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rl = await adminRateLimit.check(request)
    if (!rl.success) return ApiResponses.rateLimited()

    // 2. Auth check
    const authError = await requireAdmin()
    if (authError) return authError

    // 3. Input validation
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return ApiResponses.validationError(parsed.error)

    // 4. Business logic
    // ...

    return ApiResponses.success(data)
  } catch (e) {
    return ApiResponses.internalError()
  }
}
```

### 8.2 API response format

```typescript
// Success
{ success: true, data: {...}, message?: string }

// Error
{ success: false, error: { code: string, message: string } }
```

**Dilarang:** Mengirim `error.message`, `error.hint`, `error.code` Supabase ke client.

---

## 9. Autentikasi & RBAC

### 9.1 Hierarki Role (ROLE_RANKS)

| Role | Rank | Akses |
|---|---|---|
| `admin` | 100 | Penuh — semua fitur + Preview Mode |
| `musyrifah` | 80 | Panel musyrifah, monitoring jurnal, SP |
| `muallimah` | 60 | Panel pengajar, tashih, nilai |
| `thalibah` | 40 | Thalibah aktif — jurnal, tashih, profil |
| `calon_thalibah` | 20 | Pendaftar baru — pendaftaran & seleksi |

### 9.2 Sistem Role Array

User dapat memiliki **lebih dari satu role** (misal: admin sekaligus muallimah). Role disimpan di kolom `roles text[]` di tabel `users`.

```typescript
// ✅ BENAR — cek dengan roles array
const isAdmin = userData.roles?.includes('admin') ?? false

// ❌ SALAH — gunakan single role field (deprecated)
const isAdmin = userData.role === 'admin'
```

### 9.3 Session Management

Session bertahan **7 hari** dengan konfigurasi:
- JWT Expiry: `604800` (7 hari)
- Refresh Token Rotation: ON
- Cookie: `httpOnly`, `secure` (production), `sameSite: 'lax'`

Middleware otomatis refresh token saat expired.

---

## 10. Komponen UI & Design System

### 10.1 Hirarki komponen

| Lokasi | Contoh | Aturan |
|---|---|---|
| `components/ui/` | `Button`, `Dialog`, `Select` | shadcn primitives — jangan diedit |
| `components/admin/` | `UserTable`, `BatchManagementTab` | Komposisi admin, reusable |
| `components/layout/` | `DashboardSidebar`, `Topbar` | Layout/chrome global |

### 10.2 Server vs Client Component

**Default: Server Component.** Jangan tambahkan `'use client'` kecuali butuh:
- React state/effect
- Browser API
- Event handler

### 10.3 Styling

- Pakai Tailwind utility classes langsung
- Token warna: `mti-green`, `mti-gold`
- Helper: `cn()` dari `lib/utils.ts` untuk merge classes

---

## 11. State Management & Data Fetching

### 11.1 Server state

| Konteks | Tool | Catatan |
|---|---|---|
| Server Component | `createServerClient()` | Hormati RLS |
| Client interaktif | SWR | Cache + revalidate |
| Mutasi user | Server Action atau API route | |

### 11.2 Form state

- Simple: `useState` per field
- Complex: controlled state + Zod validation
- **Selalu** disable submit button selama in-flight

---

## 12. Coding Conventions

### 12.1 TypeScript

- `strict` mode aktif
- Hindari `any` — gunakan `unknown` lalu narrow
- Import via path alias `@/` — bukan `../../../lib/...`

### 12.2 Penamaan

| Item | Konvensi | Contoh |
|---|---|---|
| File komponen | PascalCase | `DashboardSidebar.tsx` |
| File hook | camelCase, prefix `use` | `useAdminPaginated.ts` |
| Variable & function | camelCase | `getUserRoles`, `isAdmin` |
| Type & interface | PascalCase | `User`, `JurnalHarianRow` |
| Boolean variable | `is`/`has`/`can` prefix | `isAdmin`, `hasActiveBatch` |

> **Bahasa:** identifier kode = **Inggris**. String UI = **Bahasa Indonesia**.

### 12.3 Larangan

| Anti-pattern | Alternatif |
|---|---|
| `from '@/lib/auth-middleware'` | `from '@/lib/rbac'` |
| `userData.role === 'admin'` | `userData.roles?.includes('admin')` |
| `error.message` di response | `ApiResponses.databaseError(error)` |
| `any` | Tipe eksplisit / `unknown` + narrow |
| `'use client'` di seluruh halaman | Server wrapper + client island |

---

## 13. Testing Strategy

### 13.1 Status saat ini

Testing belum terimplementasi penuh. Fokus saat ini:
- Manual testing di browser
- TypeScript strict mode (`npm run type-check`)
- ESLint (`npm run lint`)

### 13.2 Roadmap testing

- Unit tests untuk utilities
- Integration tests untuk API routes
- E2E tests untuk critical user flows

---

## 14. Build, Lint, & CI

### 14.1 Quality gates

```bash
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run build             # Production build
```

### 14.2 Pre-commit hooks

Wajib menjalankan quality gates sebelum commit.

---

## 15. Deployment & Environments

### 15.1 Environment

| Environment | URL | Tujuan |
|---|---|---|
| Local | `http://localhost:3006` | Development |
| Staging | TBD | Testing sebelum production |
| Production | `https://markaztikrar.id` | Live |

### 15.2 Deployment flow

1. Merge ke `main`
2. CI/CD run build
3. Deploy ke Vercel/hosting
4. Monitor Sentry untuk error

---

## 16. Keamanan & Compliance

### 16.1 Prinsip keamanan

1. **Server-Side Authority** — validasi sesi & hak akses hanya di server
2. **RLS as Final Guard** — keamanan data mutlak di level DB
3. **Fail Fast** — config kritis hilang → crash di startup
4. **Whitelist, not Blacklist** — validasi input via enum/whitelist

### 16.2 Checklist endpoint baru

- [ ] Rate limiter dipasang
- [ ] Auth check via `lib/rbac.ts`
- [ ] Input divalidasi (Zod/whitelist)
- [ ] UUID parameter divalidasi
- [ ] Response pakai `ApiResponses.*`
- [ ] Tidak ada `error.message`/`hint` Supabase di response
- [ ] Pemilihan client tepat (`createServerClient` vs `createSupabaseAdmin`)

---

## 17. Roadmap Teknis

### 17.1 Fitur yang akan datang

- [ ] Integration Zoom API untuk auto-generate meeting
- [ ] Smart assignment algorithm untuk pairing thalibah
- [ ] Schedule conflict detection
- [ ] Waitlist auto-promotion
- [ ] Notification system (email/push)
- [ ] Analytics dashboard

### 17.2 Technical debt

- [ ] TypeScript `strict: true` penuh
- [ ] Fix endpoint yang masih expose `error.message`
- [ ] Audit log konsisten di semua operasi sensitif

---

## 18. Onboarding Checklist

### 18.1 Setup lokal

- [ ] Clone repo
- [ ] `npm install`
- [ ] Setup `.env.local`
- [ ] `npm run gen-types`
- [ ] `npm run dev` bisa jalan

### 18.2 Memahami codebase

- [ ] Baca DEVELOPER_REFERENCE.md
- [ ] Pahami hierarchical RBAC
- [ ] Pahami alur Tikrar 7-tahap
- [ ] Pahami RLS policies

### 18.3 Kontribusi pertama

- [ ] Pick issue kecil dari backlog
- [ ] Buat branch `feat/<nama>`
- [ ] Ikuti coding conventions
- [ ] Lint & type-check hijau
- [ ] Submit PR dengan checklist lengkap

---

## 19. Glossary & Referensi

| Istilah | Definisi |
|---|---|
| **Tikrar** | Metode pengulangan hafalan Al-Qur'an 7-tahap |
| **Tashih** | Validasi bacaan oleh muallimah |
| **Murajaah** | Mengulang hafalan tanpa melihat mushaf |
| **Halaqah** | Kelas/kelompok belajar |
| **Thalibah** | Peserta halaqah/murid |
| **Muallimah** | Pengajar/ustadzah |
| **Musyrifah** | Pengawas/disiplin |
| **SP** | Surat Peringatan (disciplinary notice) |

---

*Last updated: 2026-05-14*
