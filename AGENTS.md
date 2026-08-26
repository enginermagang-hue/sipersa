# AGENTS.md

## Project
"Sistem Persuratan" — Nuxt 4 + Nitro single-repo app (letter management: surat masuk/keluar, disposisi, arsip, admin). Client code in `app/`, server API in `server/`, shared zod schemas in `lib/`. UI: Nuxt UI v4 + Tailwind CSS v4 (`app/assets/css/main.css` is `@import "tailwindcss"; @import "@nuxt/ui";`). All UI text/messages are Indonesian.

## Commands
- `npm run dev` — dev server on `http://localhost:3000`
- `npm run build` — production build; `npm run preview` — serve the build; `npm run generate` — static export
- No lint/typecheck/test scripts exist. `npm run build` is the main sanity check.
- **JANGAN jalankan `npm run build` untuk verifikasi perubahan kode.** Hanya jalankan jika user secara eksplisit meminta build.
- Sebelum mulai mengubah kode, cek apakah dev server sudah berjalan (port 3000 via `curl -s -o NUL -w "%{http_code}" http://localhost:3000` atau `netstat -ano | findstr :3000`). Jika sudah jalan, JANGAN start ulang. Jika belum, tanyakan ke user.
- `postinstall` runs `nuxt prepare` (regenerates `.nuxt` + tsconfig refs). Run `npx nuxi prepare` after changing `nuxt.config.ts` or deleting `.nuxt`.

## Database (Turso/SQLite)
- `@libsql/client`; empty `NUXT_TURSO_URL` → local file DB `.data/local.db` (gitignored). All DB access is server-side only.
- Migrations auto-run on startup (`server/plugins/migrate.ts` → `server/utils/migrate.ts`): `CREATE TABLE IF NOT EXISTS` + `ensureColumn` ALTERs + seed. Seeded admin: `admin` / `admin123` (role `admin`) + 4 default klasifikasi. No manual migrate step.
- Schema changes: add to `server/utils/migrate.ts` (both the CREATE block and any `ensureColumn` for existing tables).

## Auth & RBAC
- Session cookie `sid` (httpOnly). `server/middleware/auth.ts` guards every `/api/**` except `/api/auth/login`; it sets `event.context.auth` (userId, role, status, nama, username, email).
- Roles: `admin`, `staff_tu`, `pimpinan`. Server-side admin checks are inline per endpoint (`if (auth.role !== 'admin') throw createError(...403)`), not a shared guard. Frontend redirects in `app/middleware/auth.global.ts`.
- `sessionSecret` in runtimeConfig is declared but **unused** — session tokens are random UUIDs, not signed. `sessionMaxAge` is used.

## Google login (OAuth2)
- Server-side OAuth, no package: `server/api/auth/google.get.ts` (start → 302 to Google) + `server/api/auth/google/callback.get.ts` (exchange code → match user by `google_id` or `email` → create `sid` session → redirect `/`). Helpers in `server/utils/google-oauth.ts`, CSRF state cookie in `server/utils/google-state.ts`.
- Config: `NUXT_GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (redirect URI must be registered in Google Console). Missing config → redirect `/login?error=google-config` (never 500).
- Unknown email → `/login?error=google-unregistered` (no auto-create). Errors shown via `?error=` on login page (`GOOGLE_ERROR_MESSAGES` in `app/pages/login.vue`). Auth guard bypasses `/api/auth/google*`.

## File upload → Dropbox
- Upload routes (surat-masuk/keluar/arsip create+update) accept **multipart form data, not JSON** — parse with `readFormWithFile()` in `server/utils/body.ts` (fields + single file). Reuse it for new upload endpoints.
- Files live on Dropbox (token app, server-only via `server/utils/dropbox.ts`); DB stores the stable Dropbox file id in `file_drive_id`. Folders: `/Surat Masuk`, `/Surat Keluar`, `/Arsip` (`DROPBOX_FOLDERS`).
- Prefer OAuth2 refresh token (`NUXT_DROPBOX_APP_KEY/SECRET/REFRESH_TOKEN`); static `NUXT_DROPBOX_TOKEN` expires ~4h (fallback only).

## Conventions
- Letter numbers auto-generated per year in `server/utils/no.ts`: `NNN/SM-INST/<RomanMonth>/<Year>` (masuk), `NNN/SK-INST/...` (keluar). Prefix hardcoded per table call site.
- Soft delete: `deleted_at` column; every list query filters `deleted_at IS NULL`; restore = set NULL (see `server/api/arsip/[id]/restore.post.ts`).
- Log activity on login/CRUD/disposisi/revoke via `logActivity()` in `server/utils/logger.ts`.
- Validate bodies with shared zod schemas in `lib/validations.ts` (add new schemas there).
- Excel export uses exceljs (`server/api/laporan/export.post.ts`); "PDF" is a print-friendly page + `window.print()` (no server PDF lib).
- Nitro: `bodySize: 25` MB, `/api/**` route rule `csr: false` (SSR-only).

## Env & deploy
- Copy `.env.example` → `.env` (never commit `.env`). Vars are `NUXT_`-prefixed (runtimeConfig in `nuxt.config.ts`).
- Vercel: `vercel.json` hanya berisi `buildCommand: "nuxt build"` (Vercel auto-detect Nuxt lalu membuat serverless function sendiri). JANGAN pakai `functions: { "api/**": ... }` — app ini tidak punya direktori `api/` sehingga build gagal. `maxDuration` (default 60s) diatur di Vercel Dashboard (Project Settings → Functions).

## One-off scripts
- `scripts/migrate-dropbox.mjs` — idempotent, moves legacy Dropbox files from root into folders by DB `file_drive_id`; needs `.env`; `node scripts/migrate-dropbox.mjs`.
