# RSAS-SATISFACTION

**Sistem Survei Kepuasan Pasien dan Monitoring Mutu Pelayanan — RSAU Prof. dr. Abdulrachman Saleh (RSAS).**

Aplikasi frontend untuk prototipe dan kiosk/tablet. Dibangun dengan Vite, React, TypeScript strict, React Router, Tailwind CSS, Lucide, Recharts, date-fns, Zod, dan QRCode. Komponen memakai pola kartu, form, badge, dan dialog seperti shadcn/ui. Tidak menggunakan backend, Firebase, Supabase, atau database server.

## Menjalankan

Node.js 22.12+ atau 24 LTS dan npm. Instalasi dikunci dalam `package-lock.json`.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Untuk pengujian browser produksi:

```sh
npx playwright install chromium   # bila Chromium belum tersedia
npm run build
npm run test:e2e
```

Runner memakai `/usr/bin/chromium` jika tersedia, atau Chromium bawaan Playwright. Variabel opsional `CHROMIUM_PATH` memilih executable lain. Tidak ada variabel rahasia yang dibutuhkan. Aplikasi memerlukan browser modern dengan Web Crypto (`crypto.randomUUID`), localStorage, dan secure context HTTPS/localhost. Buka satu tab pengisian aktif per kiosk. Pengujian mencakup viewport 375, 768, 1440 piksel; draf, refresh data/pengaturan, keyboard, backup/merge/restore, penolakan impor salah skema, cetak PDF, QR, snapshot versi, response rate, serta audit RTL. Pemeriksaan axe-core WCAG A/AA otomatis mencakup landing, survei, dan dashboard; ini bukan sertifikasi aksesibilitas menyeluruh. Screenshot/PDF/trace tes berada dalam `test-results/` (diabaikan Git).

## Fitur yang diimplementasikan

- Landing, survei anonim U1–U9 dengan label pilihan spesifik, null hanya pada U4/U8, satu fokus per langkah, progres, draf lokal, tinjau, persetujuan privasi, dan submit UUID satu kali. Tombol Survei Baru mereset jawaban/consent dan memakai versi kuesioner aktif.
- Tautan unit aktif `/survei/:slug`, mode kiosk `/survei?kiosk=1`, dan pengaturan kiosk perangkat. Slug nonaktif/tidak dikenal ditolak. Tidak mengumpulkan nama, NIK, nomor rekam medis, alamat, diagnosis, atau telepon.
- Sepuluh unit awal; tambah/edit unit, subunit, kategori, layanan, target internal, dan aktif/nonaktif. Penghapusan unit sengaja diganti nonaktif untuk mempertahankan histori. Slug tidak berubah otomatis ketika nama diganti. Mengubah slug membatalkan tautan lama dan memerlukan cetak QR baru.
- Dashboard dari data lokal aktual, KPI, tren harian/mingguan/bulanan, distribusi, tabel respons, rerata indikator, heatmap unit, drill-down, peringkat dengan jumlah sampel. Operasional mulai kosong; tidak ada contoh yang ditampilkan sebagai hasil pasien.
- Filter unit, bulan/triwulan/tahun berjalan, semua periode/rentang tanggal khusus, dan versi kuesioner. Preset memakai waktu lokal browser. Tabel tren tersedia untuk membaca angka grafik. Periode sebelumnya dihitung sebagai rentang kalender berurutan dengan durasi sama.
- Pengalaman tambahan rumah sakit, pertanyaan spesifik Farmasi/Laboratorium/Radiologi/Rawat Inap/IGD, dan NPS dilaporkan terpisah; tidak mengubah IKM.
- Kuesioner: edit teks/pilihan inti, bobot, pertanyaan tambahan, wajib/opsional, urutan, konteks unit, aktif/nonaktif. Simpan selalu membuat versi unik baru. Versi lama menjadi snapshot immutable dalam data. Draf yang sudah dimulai menyelesaikan versi semula. Analisis dipisah per versi untuk menghindari pencampuran metodologi.
- Komentar dibatasi 500 karakter, ditampilkan melalui escaping React tanpa HTML mentah. Kategorisasi kata kunci lokal transparan, koreksi manual, Pareto dan label tinjauan manusia untuk kata kunci keselamatan. Ini bukan model AI, diagnosis, atau penilaian outcome klinis.
- RTL dengan judul, unit, unsur, bukti agregat, prioritas, PIC jabatan, target, status Baru/Proses/Selesai/Verifikasi, PDSA, review dan audit perubahan lokal.
- Laporan dengan filter, identitas RSAS, jumlah sampel, metodologi/bobot, IKM/kategori, tabel U1–U9, agregat keluhan, RTL, CSV, JSON, serta CSS cetak A4/PDF browser. Tidak menggunakan jsPDF; gunakan **Cetak / PDF → Simpan sebagai PDF**. Komentar bebas tidak dicetak dalam laporan agregat. RTL difilter menurut target tanggal dalam periode laporan.
- QR per unit: unduh PNG atau cetak label meja. Origin publik dapat dikonfigurasi sebelum mencetak. Logo bawaan dan favicon menggunakan gambar RSAS dari `docs/WhatsApp Image 2026-11-05 at 08.20.42.jpeg`. Logo dapat diganti dengan unggahan lokal PNG/JPEG/WebP, dikompres ke maksimal 256 px.
- Pengaturan tema navy/teal, teks pemberitahuan, kiosk, denominator kunjungan manual, backup/restore dan penghapusan namespace dengan konfirmasi ganda.
- Simulasi deterministik 180 respons, berlabel DATA SIMULASI. Dibuat saat tombol Aktifkan Simulasi pertama digunakan. Respons deterministik untuk tanggal acuan yang sama; UUID sumber operasional tetap unik. Mode UI bertahan di sessionStorage; dataset terpisah di localStorage. Ekspor simulasi diberi nama SIMULASI dan flag `isDemo: true`.

## Batasan frontend-only: wajib dipahami

**Data hanya berada di browser, perangkat, dan origin yang sama. Deploy ke Vercel tidak menyinkronkan pengisian ponsel ke dashboard pusat. QR dari perangkat lain membuka form dan menyimpan lokal pada perangkat pemindai.** Tidak ada sinkronisasi otomatis atau dashboard terpusat real-time.

Tanpa backend, gunakan **kiosk/tablet RSAS pada satu perangkat**, atau prosedur konsolidasi manual berikut:

1. Di masing-masing kiosk/browser/origin, buka **Impor & ekspor → Unduh backup JSON**.
2. Pindahkan file dengan media yang disetujui RSAS ke perangkat dashboard.
3. Pilih JSON, periksa pratinjau **Merge**, kemudian terapkan. UUID respons yang sama tidak dihitung dua kali.
4. Unduh backup hasil konsolidasi. Catat perangkat dan periode yang sudah diterima agar coverage jelas.

Browser privat, membersihkan data situs, berpindah browser/domain, atau kuota dapat menyebabkan data tidak tersedia/hilang. Tidak ada pemulihan server. Backup sebelum membersihkan browser. Jangan hanya mengandalkan snapshot lingkungan pengembangan untuk data survei.

Dashboard sengaja tidak menampilkan PIN sebagai autentikasi aman. **Tidak ada kontrol akses aman di frontend ini.** Pengguna browser dapat membuka dashboard, mengubah localStorage, atau membaca ekspor. Audit RTL juga tidak tahan manipulasi. Tidak menyimpan kredensial atau sengaja mengumpulkan data pasien sensitif. Komentar bebas tetap dapat memuat informasi pribadi yang dimasukkan responden; tinjau dan batasi distribusinya. Tidak ada telemetri, font eksternal, atau unggahan data survei ke pihak ketiga. QR generation dan logo compression berjalan lokal.

Gunakan satu tab survei aktif per kiosk. Pembaruan membaca snapshot terbaru dan menerima storage events dari tab lain, tetapi localStorage bukan database transaksional lintas tab/perangkat. Untuk penggunaan nyata skala luas, kontrol akses, retensi, enkripsi/backup terkelola, dan sinkronisasi harus ditangani backend.

## Perhitungan dan disiplin data

`src/domain/analytics.ts` berisi pure functions `calculateElementMean`, `calculateIkm`, `classifyIkm`, `aggregateResponses`, `groupResponsesByUnit`, `getTrends`, `calculateResponseRate`, `getPriorityElements`. `mergeImportedResponses` berada di repository interoperabilitas.

1. Untuk filter unit/periode/versi yang sama, ambil rerata valid (1–4) per U1…U9 dan simpan `validResponseCount`. Nilai null dikecualikan, bukan diganti 4.
2. Bobot sama adalah **1/9 presisi penuh**. Jalur bobot sama menggunakan jumlah rerata /9 untuk menghindari akumulasi floating point 1/9. Kustom: bobot nonnegatif dan total 1 dengan toleransi numerik 1e-9; laporan menandai metodologi berubah.
3. `rawIKM = Σ(mean(Ui) × wi)`; `IKM = rawIKM × 25`. Bila salah satu unsur tidak memiliki data valid, IKM **tidak tersedia**, sedangkan rerata unsur lainnya tetap ditampilkan.
4. Kategori dihitung dari nilai penuh, **sebelum pembulatan tampilan**: A ≥88,31–100; B ≥76,61 dan <88,31; C ≥65 dan <76,61; D ≥25 dan <65. Rentang kontinu ini menghindari celah pecahan di antara batas dua desimal dalam tabel regulasi. Tampilan dua desimal menggunakan Intl.NumberFormat; nilai 88,3099 ditampilkan 88,31 tetapi tetap B. Tidak membulatkan angka untuk menaikkan kategori.
5. IKM gabungan berasal dari seluruh respons pada filter. **Rata-rata IKM unit** adalah rerata indeks unit yang lengkap dan dilabeli berbeda, dengan coverage. Bukan rata-rata tertimbang indeks unit atau ukuran kausalitas/kualitas klinis.
6. Rating 3–4 (%) adalah metrik internal tersendiri dari seluruh jawaban inti valid. Tambahan rating/NPS tidak masuk IKM. NPS = %9–10 dikurangi %0–6, hanya jawaban NPS valid.
7. `n < 30` diberi flag sampel kecil, aturan heuristik internal, bukan ambang hukum. Peringkat hanya diberikan untuk unit n ≥30 dengan IKM lengkap, dalam filter yang sama. Tidak ada klaim representativitas statistik atau sebab-akibat.
8. Response rate hanya tersedia bila denominator manual unit memiliki rentang tanggal **sama persis** dengan filter. `n survei valid / kunjungan memenuhi kriteria ×100`. Definisi denominator ditampilkan. Bila kuesioner berganti versi dalam periode, operator wajib menetapkan denominator yang sesuai kriteria versi terpilih. Survei melebihi kunjungan diberi peringatan, tidak dipotong menjadi 100%.
9. Timestamp disimpan UTC ISO; filter/tampilan menggunakan tanggal kalender lokal browser, rentang akhir inklusif. Tidak ada IKM palsu ketika nol data.

## Penyimpanan dan interoperabilitas

Adapter terpisah di `src/repositories/storage.ts`. Satu dataset tervalidasi ditulis atomik per namespace (daripada beberapa kunci yang dapat setengah tersimpan saat kuota habis):

- `rsas.skm.v1.dataset` — operasional, termasuk `units`, `questionnaires`, `responses`, `actions`, `manualVolumes`, `feedbackLabels`, `settings`.
- `rsas.skm.v1.demo.dataset` — simulasi saja.
- `rsas.skm.v1.draft` / `rsas.skm.v1.demo.draft` — draf tanpa identitas.
- `rsas.skm.v1.mode` di sessionStorage — hanya pilihan mode UI.

Kegagalan kuota tidak menghapus snapshot sebelumnya. Data rusak/versi tak dikenal membuka panel pemulihan untuk unduh salinan mentah sebelum hapus ganda. Skema v1 adalah satu-satunya versi yang didukung; tidak ada migrasi destruktif otomatis.

JSON memuat `schemaVersion`, `exportedAt`, `sourceInstanceId`, master, snapshot kuesioner, respons, RTL, volume, label, dan pengaturan. Batas impor 15 MB dan koleksi berbatas; Zod menolak format/versi/field tak dikenal, nilai/skala/UUID/timestamp/referensi yang tidak valid. Tidak ada evaluasi kode impor. Checksum opsional belum diterapkan; file bukan bukti integritas atau autentisitas.

- **Merge**: response UUID dedup; konflik respons/master mempertahankan lokal, jumlah konflik ditampilkan. Versi kuesioner sama dengan konten berbeda atau slug unit bentrok membatalkan merge. ID RTL/volume/label sama mempertahankan lokal. Pengaturan, identitas perangkat, dan versi aktif lokal tetap dipertahankan. Periksa unit aktif setelah menerima unit dari sumber lain.
- **Restore**: mengganti seluruh namespace aktif, termasuk pengaturan, setelah dua konfirmasi; identitas perangkat tujuan tetap. Cadangkan sebelum restore. Simulasi tidak dapat diimpor ke operasional dan sebaliknya.
- **CSV**: seluruh sel di-quote, quote di-escape, dan prefix formula `=`, `+`, `-`, `@` termasuk whitespace awal diproteksi dengan apostrof. CSV adalah ekspor baca; konsolidasi menggunakan JSON.

## Struktur

```text
src/app/             router, layout, store
src/components/      UI, filter, KPI, grafik, tabel
src/pages/           public/survey, analytics, management, tools
src/data/            master awal, kuesioner, generator simulasi
src/domain/          TypeScript/Zod, perhitungan dan analisis murni
src/repositories/    localStorage dan interoperabilitas
src/hooks/           filter analisis
src/lib/             CSV aman
src/styles/          Tailwind, desain RSAS, responsif, A4 print
src/tests/           unit tests Vitest
e2e/                 alur browser Playwright
vercel.json          SPA rewrites
```

## Deployment Vercel

Hubungkan repository di Vercel, preset **Vite**, build `npm run build`, output `dist`, Node.js 24. Tidak ada environment variable aplikasi wajib. Atau gunakan CLI resmi yang sudah diautentikasi:

```sh
vercel
vercel --prod
```

`vercel.json` mengarahkan route SPA ke `index.html`; refresh `/admin/dashboard` atau `/survei/igd` tetap bekerja. Setelah deploy, set origin publik pada halaman QR dan cetak label baru. Ini mendokumentasikan langkah deploy, **bukan klaim aplikasi sudah dipublikasikan**. Preview Vercel dan domain produksi adalah origin berbeda dan memiliki data terpisah. Aplikasi bisa dipakai tanpa backend setelah dimuat; tidak ada service worker atau jaminan cold-start offline.

## Rencana migrasi ke backend

Pertahankan kontrak repository/domain. Ganti adapter localStorage dengan API terautentikasi yang menyimpan PostgreSQL (Supabase dengan kebijakan akses yang benar dapat menjadi opsi pada tahap berikutnya, bukan bagian aplikasi saat ini). Pisahkan endpoint submit anonim dan endpoint Tim Mutu dengan kontrol peran di server. Tambahkan validasi server/idempotency UUID, audit immutable, pagination, pengelolaan versi/konflik, consent/retensi, backup, kontrol ekspor dan pemantauan keamanan. Pilih proses konsolidasi data lama dengan identitas sumber dan dry-run sebelum migrasi. Penggunaan kesehatan sungguhan memerlukan peninjauan keamanan, privasi, aksesibilitas, dan metodologi oleh pihak RSAS yang berwenang.
