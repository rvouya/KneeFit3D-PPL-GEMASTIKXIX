# Cara Menjalankan KneeFit3D

Aplikasi berjalan **standalone**: tidak ada backend, tidak ada database yang
perlu diinstal. Semua data tersimpan di browser (IndexedDB).

## Prasyarat
- Node.js

## 1. Install dependensi
```
npm install
```

## 2. Mode pengembangan
```
npm run dev
```
Buka http://localhost:5173

## 3. Build untuk dibagikan
```
npm run build
npm run preview        # cek hasil build di http://localhost:4173
```

Isi folder `dist/` adalah situs statis lengkap (termasuk `dist/models/`, ±19 MB).
Unggah folder itu ke hosting statis mana pun — Netlify, Vercel, GitHub Pages,
Cloudflare Pages — tanpa konfigurasi tambahan.

> Harus diakses lewat HTTP, bukan dobel-klik `dist/index.html`: browser menolak
> memuat ES module dari `file://`. Cukup `npx serve dist` atau `npm run preview`
> di komputer mana pun.

## Login
`a.wibowo@rsudhs.go.id` / `password12`

Akun ini konstanta di `src/data/registry.ts`. Tanpa server, kata sandi dicocokkan
di browser — ini gerbang demo, bukan kontrol keamanan.

## Data

Kasus tersimpan di IndexedDB `kneefit3d` pada browser yang dipakai. Artinya:

- Ganti browser / komputer ⇒ data tidak ikut.
- Bersihkan data situs ⇒ semua kasus hilang.
- Saat pertama dibuka, satu kasus contoh (`KF-2419-0092`) dibuat otomatis.

Cadangan tersedia lewat `api.exportBackup()`, `api.importBackup(json)`, dan
`api.resetAll()` di `src/lib/api.ts` (belum ada tombolnya di UI).

## Struktur
- `src/` — frontend React (Vite + Tailwind + react-three-fiber)
- `src/lib/db.ts` — penyimpanan IndexedDB (pengganti PostgreSQL + Express)
- `src/lib/pipeline.ts` — keluaran pipeline ML (stub deterministik)
- `src/data/registry.ts` — registry pasien + akun demo
- `public/models/` — mesh STL & GLB
- `docs/USECASE.md` — alur, state machine status, kondisi tombol

## Backend

`server/` (Express + PostgreSQL) dan `ml/` (FastAPI) masih ada di disk tapi
di-gitignore dan tidak dipakai mode standalone. Versi terakhir yang ter-commit
ada di commit `2415914`. Untuk menghidupkannya lagi: kembalikan skrip npm-nya,
ubah `src/lib/api.ts` agar memanggil `fetch('/api/...')`, dan aktifkan kembali
`server.proxy` di `vite.config.ts`.
