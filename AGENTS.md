# PMB Unjani — Instruksi Agent

Landing page & CMS Penerimaan Mahasiswa Baru UNJANI (package.json:5). Versi saat ini: 1.2.0 (package.json:3).

## Stack

- Next.js 16.2.4 App Router + React 19.2.5, TypeScript 5.6 (package.json:33,36,59)
- Runtime Node.js >= 20.9.0 (package.json:6-8); production via PM2 (ecosystem.config.js)
- Database MongoDB, ODM Mongoose 8.9 (package.json:32, src/lib/db.ts:58-63)
- Tailwind CSS 3.4 (package.json:57, tailwind.config.ts)
- i18n dua bahasa id/en via next-intl (package.json:34, messages/id.json, messages/en.json)
- Editor konten Tiptap, validasi Zod, JWT via jose, upload via formidable + sharp (package.json:19-43)

## Perintah

- Dev: `yarn dev` → `next dev -p 9531` (package.json:11)
- Build: `yarn build` → `next build` (package.json:12)
- Start production: `yarn start` → `next start -p 9531` (package.json:13)
- Lint: `yarn lint` → `eslint .` (package.json:14)
- Seed DB: `yarn seed` → `tsx scripts/seed.ts` (package.json:15)
- Test: UNKNOWN — tidak ada script test maupun framework test di package.json

## Struktur

- `src/app/[locale]/(public)/` — halaman publik ber-locale (pengumuman, jadwal, biaya-pendidikan, jalur-seleksi, kalkulator, kontak, manual-book)
- `src/app/admin/` — halaman CMS admin, tanpa prefix locale (login, dashboard, 14 modul CRUD)
- `src/app/api/` — route handler: `admin/*` (terproteksi), `auth/*` (login/logout/me), `files`, `popup-image`, `program-studi` (publik)
- `src/components/` — `admin/` (shell CMS), `public/` (landing page), `ui/` (Button, Card, RippleLoader, SearchableSelect)
- `src/lib/` — util inti: db, auth, adminGuard, rbac, permissions, rateLimit, sanitize, fileStorage, http, seo, siteSettings, activityLog
- `src/models/` — 15 skema Mongoose, satu file per koleksi
- `src/i18n/` + `messages/` — routing & kamus next-intl
- `src/proxy.ts` — middleware global: auth admin, CSRF, RBAC, locale routing
- `scripts/` — seed.ts, clean-next-dev.js
- `public/`, `uploads/` — aset statis & file upload (UPLOAD_DIR di .env)

## Konvensi

- Model: file PascalCase per entitas; pola `models.X || model('X', Schema)` + `InferSchemaType`, opsi `{ timestamps: true, versionKey: false }` (src/models/Pengumuman.ts:20-31)
- Field DB berbahasa Indonesia + varian `_en` untuk terjemahan (`judul`/`judul_en`); flag umum: `aktif`, `urutan`, `pinned` (src/models/Pengumuman.ts:5-15)
- Route API: satu `route.ts` per folder kebab-case; CRUD = `/api/admin/<entitas>` (GET list + POST) dan `/api/admin/<entitas>/[id]` (PUT + DELETE); impor/ekspor di subfolder `import|export|template`
- Tiap route API mendeklarasikan `export const runtime = 'nodejs'` (49 file, mis. src/app/api/admin/faq/route.ts:8)
- Akses DB: selalu `await connectDb()` sebelum query; koneksi di-cache global — jangan buat koneksi Mongoose sendiri (src/lib/db.ts:49-81)
- Guard handler admin: `const guard = await requireAdmin(req, '<minRole>'); if ('error' in guard) return guard.error;` — role: editor < admin < superadmin (src/lib/adminGuard.ts:6-19, src/lib/rbac.ts:3-5)
- Lapis kedua di `src/proxy.ts`: redirect ke /admin/login, cek CSRF origin untuk POST/PUT/PATCH/DELETE `/api/admin/*`, RBAC per path via src/lib/permissions.ts (src/proxy.ts:94-148)
- Validasi: Zod `schema.safeParse(body)` → 400 `{ error: 'Data tidak valid', details: parsed.error.issues }` (src/app/api/admin/faq/route.ts:31-35)
- Respons: sukses `{ item }` / `{ items }`, error `{ error: <pesan> }` (src/app/api/admin/faq/route.ts:25,47; src/lib/http.ts:7-9)
- Setiap mutasi menulis audit log via `writeAuditLog` (src/app/api/admin/faq/route.ts:38-46)
- Halaman admin CRUD: subfolder `tambah/`, `[id]/edit/`, form dipakai ulang di `_form/` (src/app/admin/pengumuman/)
- Path alias impor `@/*` → `./src/*` (tsconfig.json:26-29)

## Dokumen wajib dibaca sebelum bekerja

- docs/ARCHITECTURE.md — arsitektur, route, auth, integrasi
- docs/DATA-MODEL.md — skema koleksi MongoDB
- docs/UI-CURRENT.md — halaman, komponen, pola form

## Aturan

- Bahasa dokumen dan komentar: Indonesia
- Jangan sentuh: .env, migration yang sudah dijalankan, config auth
- Jangan tambah/upgrade dependency tanpa persetujuan eksplisit
- Jangan refactor di luar scope; temuan dilaporkan, bukan diperbaiki
- Jika ragu, berhenti dan tanya — jangan mengasumsikan

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
