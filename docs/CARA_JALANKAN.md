# Cara Menjalankan KneeFit3D

## Prasyarat
- Node.js (sudah ada)
- PostgreSQL lokal (perlu diinstal)

## 1. Install PostgreSQL (Windows)
Pilih salah satu — jalankan di prompt Claude Code dengan awalan `!` atau di PowerShell admin:

```
! choco install postgresql
```
atau unduh installer: https://www.postgresql.org/download/windows/

Catat user & password superuser (default installer: user `postgres`).

## 2. Buat database
```
! psql -U postgres -c "CREATE DATABASE kneefit3d;"
```

## 3. Set koneksi
Edit `server/.env` bila user/password berbeda dari default:
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/kneefit3d
PORT=4000
```

## 4. Buat tabel + seed data
```
npm run db:setup
```
Output sukses: `✓ setup complete. Login: a.wibowo@rsudhs.go.id / password12`

## 5. Jalankan web + API bersamaan
```
npm run dev:all
```
- Web  : http://localhost:5173
- API  : http://localhost:4000/api/health

Atau dua terminal terpisah: `npm run server` dan `npm run dev`.

## Login
`a.wibowo@rsudhs.go.id` / `password12`

## Struktur
- `src/` — frontend React (Vite + Tailwind)
- `server/` — API Express + PostgreSQL (`schema.sql`, seed di `src/scripts/setup.ts`)
- `USECASE.md` — alur, state machine status, kondisi tombol
