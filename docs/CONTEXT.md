Konteks produk:
Desain antarmuka web untuk KneeFit3D, software perencanaan praoperasi Total Knee Arthroplasty (TKA) berbasis AI. Sistem menerima dua citra X-ray lutut (AP dan lateral), lalu menghasilkan (1) rekonstruksi tulang lutut 3D, (2) deteksi landmark anatomi, dan (3) rekomendasi ukuran & tipe implan TKA beserta metrik kesesuaiannya. Ini adalah alat bantu keputusan (decision support), bukan pengganti keputusan dokter.
Pengguna & konteks pakai:
Pengguna utama adalah staf medis non-teknis — dokter ortopedi, radiolog, dan staf klinis — yang mengoperasikan dari workstation rumah sakit (desktop-first). Alur harus bisa dijalankan dari awal sampai akhir tanpa keahlian teknis. Prioritaskan kejelasan, kepercayaan, dan minim risiko salah baca.
Arah visual (tone):
Estetika medis yang bersih, tenang, dan terpercaya. Light theme sebagai default dengan opsi dark theme untuk viewer 3D. Satu warna aksen klinis (mis. biru medis atau teal), warna status yang color-blind safe, tipografi berketerbacaan tinggi, banyak white space, hierarki data jelas namun tidak berantakan meski padat informasi. Hindari kesan "mainan" atau terlalu ramai.
Halaman/layar yang perlu didesain:

Login & keamanan — autentikasi yang menegaskan privasi data medis (de-identifikasi, pembatasan akses).
Worklist / dashboard kasus — daftar kasus pasien dengan status pemrosesan real-time (queued → processing → ready for review → reviewed), pencarian/filter, dan indikator antrean job asinkron. Status per kasus ditampilkan dengan badge berwarna yang jelas.
Halaman unggah citra — unggah sepasang X-ray (AP + lateral) per pasien, dengan slot terpisah dan preview. Sertakan validasi kualitas citra (peringatan bila posisi lutut kurang tepat, kontras rendah, atau ada artefak besar) sebelum diproses.
Halaman detail & viewer 3D interaktif — inti aplikasi:

Viewer 3D model tulang lutut (femur distal & tibia proksimal) yang bisa diputar, di-zoom, di-pan (Three.js/VTK.js).
Toggle untuk menampilkan/menyembunyikan landmark anatomi (mechanical axis, epicondylar region, tibial plateau, dll.).
Panel metrik anatomi (lebar mediolateral, ukuran AP, kemiringan tibia).
Tombol "Rekomendasi Ukuran Implan" langsung di dalam viewer 3D. Saat ditekan, sistem menampilkan kandidat implan berperingkat (paling sesuai / alternatif / tidak disarankan) langsung di konteks model 3D — idealnya implan ter-overlay secara virtual pada tulang (virtual fitting) sehingga dokter melihat kecocokan bentuknya secara visual, disertai skor kesesuaian di panel samping/melayang. Pengguna bisa berpindah antar kandidat ukuran dan melihat perubahan fitting-nya secara real-time.
State loading asinkron yang jelas (skeleton/progress) karena rekonstruksi difusi berat — antarmuka harus tetap responsif.


Halaman laporan (exportable) — rangkuman terstandardisasi berisi citra input, snapshot model 3D, dan rekomendasi ukuran implan akhir, yang bisa diekspor ke dokumen (PDF).

Prinsip transparansi keputusan (wajib ditonjolkan):
Setiap rekomendasi ukuran implan yang muncul dari tombol tersebut harus selalu disertai Implant Fit Scoring yang mudah dibaca: RMSE global, maximum over/under hang, overhang mediolateral, undercoverage tibia, dan risiko notching. Visualisasikan dengan gauge/bar/badge berwarna, bukan sekadar angka mentah, agar dokter dapat menilai dasar rekomendasi sebelum memutuskan.
Komponen & state pendukung:
Rancang empty state, error state, peringatan kualitas citra, indikator proses asinkron, dan disclaimer klinis ("rekomendasi bersifat estimatif; keputusan akhir tetap pada dokter"). Pastikan aksesibilitas (kontras WCAG AA, navigasi keyboard, ukuran target sentuh memadai).
Deliverable yang diminta:
Buat wireframe/mockup hi-fi untuk kelima layar di atas, sistem komponen (tombol, badge status, kartu metrik, panel fitting implan), dan skema warna + tipografi yang konsisten.