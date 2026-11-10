# feat: implement RSAS patient satisfaction survey and local quality dashboard

Repository sebelumnya kosong. Perubahan ini menyediakan aplikasi Vite/React/TypeScript untuk survei anonim RSAS, kiosk satu perangkat, dashboard SKM, dan konsolidasi manual antarperangkat.

- Wizard U1–U9 dengan draf, null terkontrol, privacy consent, review, snapshot versi, dan submit UUID.
- IKM presisi 1/9, kategori sebelum pembulatan, incomplete-data guard, analisis unit/periode/versi, jumlah sampel, grafik/tabel, dan metrik pengalaman tambahan terpisah.
- Master unit/subunit, kuesioner berversi, keluhan kata kunci transparan dengan koreksi manual, RTL/PDSA dan audit lokal.
- Laporan A4/PDF browser, CSV aman, QR lokal, backup JSON tervalidasi, merge/deduplikasi/pratinjau, restore dan penghapusan ganda.
- Data simulasi deterministik berlabel dan terpisah. Tidak ada data pasien awal, backend, autentikasi aman, atau sinkronisasi lintas perangkat.
- Dokumentasi menjalankan, Vercel SPA routing, batasan privasi/localStorage, konsolidasi manual, dan rencana migrasi backend.

Validasi lokal lulus: TypeScript strict, ESLint, Prettier, 31 unit tests Vitest, build produksi, serta 6 tests Playwright Chromium pada 375/768/1440 px termasuk pemeriksaan axe-core WCAG A/AA untuk landing, survei, dan dashboard. Workflow GitHub Actions disediakan; belum diklaim sudah dijalankan di GitHub. Browser tests mencakup tambah unit → survei → refresh → dashboard → backup → merge → restore → laporan PDF/QR; mode simulasi terpisah; navigasi keyboard, snapshot kuesioner, response rate dan audit RTL.

Batasan: data browser/origin saja; satu tab pengisian aktif per kiosk; komentar bebas perlu ditinjau; kategori/flag keselamatan berbasis kata kunci bukan AI/penilaian klinis. Tidak melakukan deployment Vercel. Cetak memakai print-to-PDF browser, bukan jsPDF.
