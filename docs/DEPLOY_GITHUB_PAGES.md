# Deploy ke GitHub Pages

Build khusus yang membungkus seluruh aplikasi jadi **satu berkas `index.html`**.
Berdiri sendiri: tidak mengubah `package.json`, `vite.config.ts`, atau berkas
lama mana pun. Build `dist/` yang biasa tetap jalan seperti sebelumnya.

## Build

```
node scripts/build-gh-pages.mjs
```

Keluaran:

```
gh-pages/
├── index.html      1,45 MB   ← seluruh JS + CSS + gambar ter-inline
├── .nojekyll
└── models/         18,80 MB
    ├── femur.stl
    ├── tibia-fibula.stl
    ├── GCK4_knee_reconstruction.glb
    └── GCK4_knee_with_implant.glb
```

Mesh 3D sengaja tidak ikut di-inline — 19 MB base64 bikin tab berat sebelum apa
pun tampil. Semua kode aplikasi tetap satu berkas HTML.

Cek lokal:
```
npx serve gh-pages
```

## Cara terbit — pilih satu

### A. Otomatis (workflow sudah disiapkan)

`.github/workflows/gh-pages.yml` mem-build dan menerbitkan tiap kali ada push ke
`main`. Sekali saja: **Settings → Pages → Source = "GitHub Actions"**.

Syaratnya `public/models/` ikut ter-commit (19 MB) — runner tidak punya berkas
itu kalau tidak ada di repo. Saat ini `public/` masih untracked.

### B. Manual

Unggah isi folder `gh-pages/` ke branch `gh-pages`, lalu **Settings → Pages →
Source = "Deploy from a branch" → `gh-pages` / root**.

## Alamatnya

`https://<user>.github.io/<repo>/`

Jalan di subpath maupun di root: path aset relatif dan rutenya pakai hash
(`.../#/worklist`), jadi tidak perlu aturan rewrite apa pun di server.

## Yang perlu diperhatikan

- **Publik.** GitHub Pages di repo publik bisa diakses siapa saja. Kata sandi
  dicocokkan di browser dan ada di dalam bundle — gerbang demo, bukan keamanan.
  Jangan taruh data pasien asli.
- **Data per-pengunjung.** Tiap orang yang membuka punya IndexedDB sendiri di
  browsernya; kasus tidak dibagikan antar pengunjung.
- **Font.** `index.html` masih memuat Google Fonts dari internet. Tanpa koneksi,
  huruf jatuh ke font sistem — sisanya tetap jalan.
- **Model pertama kali lambat.** GLB 6–9 MB diunduh saat halaman Rekonstruksi /
  Virtual Fitting dibuka, dan kanvas baru menggambar setelah model siap (render
  on-demand: sebelum ada interaksi, frame pertama bisa terlihat kosong sesaat).
- Kalau `gh-pages/` tidak ingin ikut ter-commit, tambahkan barisnya ke
  `.gitignore` — folder ini hasil build, aman dibuat ulang kapan saja.

## Login demo

`a.wibowo@rsudhs.go.id` / `password12`
