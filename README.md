# PMB UNJANI — Landing Page & CMS

Landing page Penerimaan Mahasiswa Baru Universitas Jenderal Achmad Yani lengkap dengan CMS internal.

**Stack:** Next.js 16.2.4 (App Router, TypeScript) · React 19 · MongoDB (Mongoose) · Tailwind CSS · next-intl

## Fitur

**Halaman Publik**
- Hero slideshow yang dikelola dari CMS dengan countdown gelombang
- Jalur seleksi, jadwal aktif & mendatang, pengumuman
- Kalkulator biaya PMB (embedded, bukan iframe) — kalkulasi biaya per prodi/kelas/jadwal secara interaktif
- Dokumen biaya & manual book (PDF), FAQ accordion
- Feed Instagram (via Graph API), popup promosi
- Statistik jumlah fakultas & program studi

**CMS Internal (`/admin`)**
- Autentikasi JWT (httpOnly cookie), refresh token, RBAC (superadmin / admin / editor)
- Manajemen: hero, jalur seleksi, jadwal, biaya, dokumen, pengumuman, FAQ, program studi, fakultas, popup, pengaturan situs
- Rich text editor TipTap, upload gambar & PDF dengan validasi magic-number
- Audit log aktivitas admin

**SEO & Keamanan**
- Metadata per halaman, `sitemap.xml`, `robots.txt`
- JSON-LD (Organization, BreadcrumbList, NewsArticle)
- Security headers: HSTS, CSP, X-Frame-Options, Permissions-Policy
- ISR (Incremental Static Regeneration) — halaman di-cache dan diperbarui tiap 60 detik

## Menjalankan Lokal

```bash
npm install
cp .env.example .env.local   # isi nilai env yang diperlukan
npm run seed                 # buat superadmin + data contoh
npm run dev                  # http://localhost:9500


rm -rf node_modules package-lock.json
npm cache clean --force
npm install --include=optional
npm run build
```

Admin: `http://localhost:9500/id/admin/login`

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Dev server di port 9500 dengan hot reload |
| `npm run build` | Build produksi (TypeScript check + bundle) |
| `npm start` | Jalankan build produksi di port 9500 |
| `npm run lint` | ESLint — cek kualitas & potensi error kode |
| `npm run seed` | Isi database dengan superadmin + konten contoh |

## Variabel Environment

Lihat `.env.example`. Minimal yang wajib diisi:

| Variabel | Keterangan |
|----------|------------|
| `MONGO_URI` | MongoDB Atlas SRV URI (primary) |
| `MONGO_DIRECT_URI` | Fallback jika SRV tidak bisa di-resolve (aaPanel/server) |
| `JWT_SECRET` | Secret untuk access token JWT |
| `JWT_REFRESH_SECRET` | Secret untuk refresh token JWT |
| `NEXT_PUBLIC_SITE_URL` | URL publik situs, misal `https://pmb.unjani.ac.id` |
| `INSTAGRAM_ACCESS_TOKEN` | (Opsional) Token Graph API untuk feed Instagram |

## Deploy ke Produksi (CentOS 9 + aaPanel)

```bash
npm run build
pm2 start ecosystem.config.js
```

File `ecosystem.config.js` sudah tersedia di root project — menjalankan Next.js dalam **cluster mode** (multi-core) dengan PM2.

**Nginx di aaPanel** — tambahkan di dalam block `server {}` untuk caching static assets:

```nginx
gzip on;
gzip_comp_level 5;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

location /_next/static/ {
    proxy_pass http://127.0.0.1:9500;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location / {
    proxy_pass http://127.0.0.1:9500;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_connect_timeout 60s;
    proxy_read_timeout 60s;
}
```

## Struktur Utama

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (public)/      # Halaman publik (landing, jalur, kalkulator, dll)
│   │   └── admin/         # CMS internal
│   └── api/               # API routes (auth, upload, data)
├── components/
│   ├── public/            # Komponen halaman publik
│   ├── admin/             # Komponen CMS
│   └── ui/                # Komponen UI generik
├── lib/                   # db.ts, auth, seo, fileStorage, dll
├── models/                # Mongoose models
└── i18n/                  # Konfigurasi next-intl (id/en)
```
