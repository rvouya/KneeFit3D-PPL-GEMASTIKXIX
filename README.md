# KneeFit3D

Perencanaan praoperasi Total Knee Arthroplasty (TKA) berbasis AI. Input sepasang
X-ray (AP + Lateral) → rekonstruksi tulang 3D → rekomendasi ukuran implan + skor
kesesuaian. **Alat bantu keputusan, bukan pengganti keputusan dokter.**

## Status

Aplikasi berjalan **standalone**: satu bundle statis, tanpa backend dan tanpa
database. Semua data tersimpan di IndexedDB browser pengguna.

Model ML sungguhan **belum ada**. Angka SSIM/PSNR/Dice/RMSE dan rekomendasi
ukuran berasal dari fungsi deterministik di `src/lib/pipeline.ts` — cukup untuk
menjalankan alur ujung-ke-ujung, bukan hasil inferensi.

## Arsitektur

```
PPL/
├── src/                    React + Vite + Tailwind + react-three-fiber
│   ├── lib/db.ts               Penyimpanan IndexedDB (pengganti PostgreSQL + Express)
│   ├── lib/api.ts              Fasad data yang dipakai semua halaman
│   ├── lib/pipeline.ts         Keluaran pipeline ML (stub deterministik)
│   ├── data/registry.ts        Registry pasien + akun demo
│   ├── components/viewer/      Kanvas 3D (STL & GLB)
│   └── pages/                  Login · Worklist · Upload · Rekonstruksi · Fitting · Laporan
├── public/models/          Mesh STL & GLB (±19 MB)
├── scripts/                Build satu-berkas HTML untuk GitHub Pages
└── docs/                   Panduan (daftar di bawah)
```

Alur satu kasus: **Upload** (X-ray + identitas pasien) → `createCase()` menjalankan
stub pipeline lalu menyimpan record → **Rekonstruksi 3D** → **Virtual Fitting**
(konfirmasi ukuran menyimpan snapshot kanvas) → **Laporan** siap cetak.

## Menjalankan

```bash
npm install
npm run dev                          # http://localhost:5173
```

Tidak perlu database. Satu kasus contoh dibuat otomatis saat pertama dibuka.

Login: `a.wibowo@rsudhs.go.id` / `password12` — konstanta di `src/data/registry.ts`,
dicocokkan di browser. Gerbang demo, bukan kontrol keamanan.

## Build

```bash
npm run build                        # dist/ — situs statis biasa
node scripts/build-gh-pages.mjs      # gh-pages/ — satu index.html + models/
```

Keduanya harus diakses lewat HTTP, bukan dobel-klik berkasnya: browser menolak
memuat ES module dari `file://`. Coba lokal dengan `npm run preview` atau
`npx serve gh-pages`.

Jangan buka `index.html` di root repo — itu template Vite yang menunjuk ke
`/src/main.tsx` (TSX mentah); hasilnya halaman kosong.

## Dokumen

| Berkas | Isi |
|---|---|
| [docs/CARA_JALANKAN.md](docs/CARA_JALANKAN.md) | Menjalankan, build, cadangan data |
| [docs/DEPLOY_GITHUB_PAGES.md](docs/DEPLOY_GITHUB_PAGES.md) | Terbit ke `user.github.io/repo/` |
| [docs/DATA-PASIEN-DEMO.md](docs/DATA-PASIEN-DEMO.md) | Pasien terdaftar untuk demo |
| [docs/USECASE.md](docs/USECASE.md) | Alur, state machine status, kondisi tombol |
| [docs/PANDUAN_MODEL.md](docs/PANDUAN_MODEL.md) | Menaruh model ML |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Rancangan layar |

## Backend (tidak aktif)

`server/` (Node + Express + PostgreSQL) dan `ml/` (Python + FastAPI) masih ada di
disk tapi di-gitignore dan tidak dipakai. Versi terakhir yang ter-commit ada di
commit `2415914`.

Rancangan saat backend dinyalakan lagi: **web** → **server (Node)** → **ml (FastAPI)**.
Node memanggil ML lewat HTTP; kalau ML mati → fallback stub, web tetap jalan.
FastAPI hanya pembungkus HTTP untuk kode model Python — Node tidak bisa
menjalankan PyTorch/MONAI, Python bisa.

Empat tahap pipeline (semuanya masih kerangka kosong):

| Tahap | File | Input | Output |
|---|---|---|---|
| Data preprocessing | `ml/pipeline/preprocessing.py` | AP + LAT | normalized, spacing, quality |
| 3D Reconstruction | `ml/pipeline/reconstruction.py` | normalized | segmentation.nii.gz, femur/tibia STL, confidence, landmarks |
| Penentuan Ukuran Implan | `ml/pipeline/implant_sizing.py` | landmarks | kandidat ukuran + skor |
| Virtual Fitting | `ml/pipeline/virtual_fitting.py` | mesh + ukuran (S/M/L/XL) | SSIM, PSNR, Dice, RMSE, fit score |

Kontrak I/O di `ml/schemas.py` (Python) & `server/src/ml.ts` (Node) — samakan
field-nya. Tabel DB untuk I/O model: `case_images` (input) · `reconstructions` ·
`implant_candidates` · `fit_metrics` · `pipeline_runs` (status job) · `case_files`
(berkas keluaran). Skema: `server/schema.sql`.

Menghidupkan lagi: kembalikan berkasnya ke git (`git add -f server ml`), pulihkan
skrip npm-nya, ubah `src/lib/api.ts` agar memanggil `fetch('/api/...')`, dan
aktifkan kembali `server.proxy` di `vite.config.ts`.

## Catatan

- Data per-browser. Bersihkan data situs ⇒ semua kasus hilang. Cadangan lewat
  `api.exportBackup()` / `api.importBackup()` / `api.resetAll()` di `src/lib/api.ts`
  (belum ada tombolnya di UI).
- Halaman Laporan memuat nama, NIK, dan tanggal lahir pasien. Perlakukan sebagai
  dokumen rekam medis; jangan pakai data pasien asli untuk demo publik.
