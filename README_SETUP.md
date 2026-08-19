
## Supabase project yang sudah terhubung

Project Ref:
`givfuaphcjyvvumztdcl`

Project URL:
`https://givfuaphcjyvvumztdcl.supabase.co`

Publishable key sudah dikonfigurasi di client Nuvora.
Secret key / service_role tidak digunakan di frontend.

Untuk fresh database, jalankan:
`supabase/schema.sql`


# Nuvora v0.7 — Production Lifecycle, Analytics Detail & Android Release Prep

Nuvora tetap project baru dari nol.

## Fitur utama yang sudah dibangun
- Register / login
- Customer / Admin role
- CRUD undangan
- Editor undangan
- Cover + galeri
- Rundown, story, gift, Maps, music, streaming, dress code
- Publish / unpublish
- Guest Management
- Import/export Excel
- RSVP + ucapan
- Personal guest link
- QR Guest Pass
- QR/manual check-in
- Katalog tema
- Paket dan order
- Invoice print / Save as PDF
- Pembayaran manual + approval
- Revisi/chat Customer ↔ Admin
- Private Design Preview
- Design Approval
- Analytics
- In-app Notification Center
- PWA
- Android debug APK workflow

## Baru di v0.7

### 1. Production Lifecycle
Admin dapat memberi tahap produksi:
1. Brief Masuk
2. Desain Dikerjakan
3. Menunggu Review
4. Revisi
5. Finalisasi
6. Dipublish
7. Selesai

Customer dapat melihat timeline produksinya langsung dari halaman Pesanan.

Update tahap produksi juga membuat in-app notification jika kategori Production tidak dimatikan oleh pengguna.

### 2. Analytics Detail
Analytics sekarang mempunyai:
- filter 7 / 30 / 90 hari / semua data
- grafik open per hari
- total open
- perkiraan unique session
- RSVP
- conversion RSVP / open
- Maps click
- gift copy

Analytics tidak mengirim nama, email, WhatsApp, atau isi pesan tamu.

### 3. Notification Preferences
Di Profil setiap pengguna dapat memilih kategori notifikasi:
- Order
- Pembayaran
- Pesan revisi
- Approval desain
- Tahap produksi

Preference berlaku untuk notifikasi baru. Notifikasi lama tidak otomatis dihapus.

### 4. Navigasi Mobile
Tetap memakai 5 menu utama:
- Home
- Tema
- Buat
- Pesanan
- Menu

Badge notifikasi diperbarui berkala selama aplikasi terbuka.

### 5. Android Release Prep
Tersedia:
- CAMERA permission patcher
- debug APK workflow
- signed release AAB workflow

File:
`.github/workflows/build-android-release-aab.yml`

Signed AAB membutuhkan GitHub Secrets:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Cloud build juga membutuhkan:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Keystore TIDAK disertakan dalam repository/ZIP.

## Database

Fresh install:
`supabase/schema.sql`

Upgrade dari v0.6:
`supabase/migration_v07.sql`

## Membuat akun Admin

Setelah user mendaftar, ambil UUID user dari Supabase Authentication lalu jalankan:

```sql
update public.profiles
set role='admin'
where id='UUID_USER_ADMIN';
```

Login ulang setelah role diperbarui.

## Tentang fitur eksternal

Yang belum dianggap aktif:
- payment gateway otomatis
- push notification Android/iOS
- WhatsApp API otomatis
- email transactional
- upload ke Google Play Console otomatis

Fitur tersebut memerlukan provider/account/credential masing-masing.

## Checklist cloud end-to-end

1. Register
2. Email confirmation bila aktif
3. Login/logout
4. Pilih tema
5. Buat order
6. Upload bukti pembayaran
7. Admin approve
8. Buat/edit project
9. Upload cover/gallery
10. Admin assign project ke order
11. Admin update production lifecycle
12. Private design preview
13. Admin kirim design review
14. Customer approve/request changes
15. Publish
16. Personal guest link
17. Import Excel
18. RSVP
19. Wishes
20. Analytics
21. QR Guest Pass
22. QR check-in
23. Notification Center/preferences
24. PWA install
25. Debug APK
26. Signed AAB setelah signing secrets tersedia
