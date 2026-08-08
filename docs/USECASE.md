# KneeFit3D — Use Case & Alur

Alat bantu keputusan praoperasi TKA. Menerima sepasang X-ray (AP + lateral),
menghasilkan rekonstruksi tulang 3D, dan rekomendasi ukuran implan dengan
skor kesesuaian. **Bukan pengganti keputusan dokter.**

## Aktor
- **Staf klinis** (dokter ortopedi / radiolog). Satu akun seed:
  `a.wibowo@rsudhs.go.id` / `password12`.

## Entitas Database (PostgreSQL)

| Tabel | Kolom penting |
|---|---|
| `users` | email, name, org, password_hash (bcrypt) |
| `patients` | sex (`P`/`L`), age — de-identifikasi, tanpa identitas |
| `cases` | case_code (ID Kasus), patient_id, side (`Kanan`/`Kiri`), status, progress_stage, progress_pct, note, uploaded_at |
| `case_events` | audit setiap transisi status (from → to, actor, waktu) |

Kolom yang diminta pada worklist ↔ DB:
ID Kasus = `case_code` · Pasien P/L + umur = `patients.sex`/`age` ·
Sisi = `side` · Tanggal diunggah = `uploaded_at` · Status = `status` ·
Progres = `progress_stage` + `progress_pct`.

## Status (state machine)

```
                 process              finish
   queued ─────────────▶ processing ─────────▶ ready
     │                       │                   │ review
     │ cancel                │ cancel            ▼
     ▼                       ▼                reviewed
  canceled ◀────────────────┘
     │ reset                          error (kualitas citra gagal)
     ▼                                  │ (Unggah ulang → /upload)
   queued                               ▼
                                     re-upload
```

Enum `case_status`: `queued`, `processing`, `ready`, `reviewed`, `error`, `canceled`.

## Tombol per status (kondisional)

Tombol pada baris worklist berubah otomatis mengikuti status kasus
(sumber tunggal: `src/lib/caseActions.ts`).

| Status | Tampilan progres | Tombol | Efek |
|---|---|---|---|
| `queued` | — | **Batalkan** | `POST /cancel` → `canceled` |
| `processing` | progress bar + stage % | **Batalkan** | `POST /cancel` → `canceled` |
| `ready` | catatan | **Tinjau** (primary) | buka `/reconstruction` |
| `reviewed` | catatan final | **Laporan** | buka `/fitting` (ringkasan) |
| `error` | catatan merah | **Unggah ulang** | buka `/upload` |
| `canceled` | — | **Unggah ulang** | `POST /reset` → `queued` |

## Alur utama (end-to-end)

1. **Login** (`/login`) → `POST /api/auth/login` cek kredensial (bcrypt).
   Sukses → simpan sesi ringan (`sessionStorage`) → `/worklist`.
2. **Worklist** (`/worklist`) → `GET /api/cases` (filter status + pencarian).
   - **Kasus baru** → `POST /api/cases` membuat kasus `queued` baru.
   - Tab filter & pencarian query ke DB; jumlah badge dihitung dari DB.
   - Tombol baris memicu transisi sesuai tabel di atas, lalu refetch.
3. **Unggah X-ray** (`/cases/:id/upload`) → dua slot AP + lateral, validasi
   kualitas citra, lalu **Proses rekonstruksi 3D**.
4. **Rekonstruksi 3D** (`/cases/:id/reconstruction`) → viewer 3D interaktif
   (rotasi/zoom/pan), unduh volume/mesh, **Lanjut ke virtual fitting**.
5. **Virtual Fitting** (`/cases/:id/fitting`) → kandidat ukuran + Implant Fit
   Scoring (SSIM, PSNR, Dice, RMSE). **Konfirmasi Ukuran** →
   `POST /api/cases/:id/review` → status `reviewed` → kembali ke worklist.

## Endpoint API

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | autentikasi seeded |
| GET | `/api/cases?status=&q=` | daftar + jumlah per status |
| GET | `/api/cases/:code` | detail kasus |
| POST | `/api/cases` | buat kasus baru (`queued`) |
| POST | `/api/cases/:code/cancel` | queued/processing → canceled |
| POST | `/api/cases/:code/review` | ready → reviewed |
| POST | `/api/cases/:code/reset` | error/canceled → queued |

Transisi tidak valid ditolak `409` dan setiap transisi tercatat di `case_events`.
