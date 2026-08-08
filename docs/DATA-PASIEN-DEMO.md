# Data Pasien Demo

Daftar pasien yang **terdaftar** di sistem (`PATIENT_REGISTRY` di `src/data/registry.ts`).

Saat demo, ketik salah satu baris di bawah pada halaman **Input X-ray**. Kalau NIK + nama +
tanggal lahir + kelamin cocok persis dengan salah satu entri, aplikasi memasang mesh 3D milik
pasien tersebut ke kasus yang dibuat, dan model itulah yang muncul di halaman Rekonstruksi 3D
serta Virtual Fitting.

Kalau tidak cocok, kasus tetap dibuat — sistem memakai mesh default supaya alur demo tidak putus.

## Daftar pasien

| NIK | Nama lengkap | Tanggal lahir | Kelamin | Mesh femur | Mesh tibia + fibula |
|---|---|---|---|---|---|
| `3273010101580001` | Siti Rahmawati | 1958-01-01 | Perempuan | `models/femur.stl` | `models/tibia-fibula.stl` |
| `3173042509520007` | Bambang Suryana | 1952-09-25 | Laki-laki | `models/femur.stl` | `models/tibia-fibula.stl` |
| `3578011407610012` | Endang Wulandari | 1961-07-14 | Perempuan | `models/femur.stl` | `models/tibia-fibula.stl` |
| `3374061203550004` | Hartono Prasetyo | 1955-03-12 | Laki-laki | `models/femur.stl` | `models/tibia-fibula.stl` |

Semua data di atas fiktif. Usia tidak diketik — dihitung otomatis dari tanggal lahir.

## Catatan

- Pencocokan nama tidak membedakan huruf besar/kecil, tapi ejaan harus persis.
- Sisi lutut (Kanan/Kiri) bebas dipilih; sisi Kiri menampilkan mesh yang dicerminkan.
- Semua entri sementara memakai pasangan STL yang sama karena baru satu set mesh yang tersedia
  (`public/models/`). Menambah pasien dengan mesh berbeda cukup: taruh STL baru di
  `public/models/`, lalu tambahkan barisnya di `PATIENT_REGISTRY`.
- Path mesh ditulis relatif (tanpa `/` di depan); `asset()` di `KneeScene.tsx` yang menambahkan
  base build saat model dimuat.

## Menambah / mengubah daftar

1. Edit array `PATIENT_REGISTRY` di `src/data/registry.ts`.
2. Muat ulang halaman — registry ikut di dalam bundle, tidak ada langkah seed terpisah.
3. Perbarui tabel di dokumen ini agar tetap sinkron.
