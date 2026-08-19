# Nuvora v0.6 — Validation Report

Pemeriksaan yang dilakukan pada source v0.6:

- TypeScript parser digunakan untuk memeriksa sintaks seluruh file `.js` dan `.jsx`.
- Hasil: tidak ditemukan error sintaks.
- Import relatif bernama diperiksa terhadap export module tujuan.
- Hasil: seluruh named import relatif ditemukan.
- Pemanggilan Supabase RPC dibandingkan dengan function yang tersedia pada `schema.sql`.
- Hasil: seluruh RPC yang dipanggil aplikasi tersedia di schema.
- `migration_v06.sql` disediakan untuk upgrade dari v0.5.
- `schema.sql` sudah memuat fresh-install sampai v0.6.

Catatan pengujian runtime:
- `npm install` penuh tidak dapat diselesaikan di environment pembuatan file karena akses package registry mengalami timeout / cache dependency tidak tersedia.
- Karena itu build Vite runtime penuh belum dieksekusi di sini.
- GitHub Actions pada project tetap disiapkan untuk melakukan instalasi dependency dan build di environment GitHub.
- Pengujian cloud Supabase end-to-end memerlukan project Supabase baru dan environment variables yang valid.

Fitur v0.6 yang ditambahkan:
- navigasi 5 menu utama
- Menu hub
- analytics tanpa PII tamu
- in-app notification center
- unread badge
- admin assign order ke project milik pelanggan
- design review versioning
- approve / request changes
- private authenticated design preview
