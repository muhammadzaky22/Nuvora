# Nuvora v0.7 — Validation Report

## Pemeriksaan source

Dilakukan pemeriksaan sintaks seluruh `.js` dan `.jsx` dengan TypeScript transpile parser.

Hasil:
- Syntax errors: **0**

Dilakukan pemeriksaan named relative imports terhadap export module tujuan.

Hasil:
- Missing named imports: **0**

Dilakukan pencocokan semua pemanggilan Supabase `.rpc(...)` dengan function yang tersedia di `schema.sql`.

RPC yang ditemukan:
- add_order_message
- add_production_event
- assign_order_invitation
- create_design_review
- create_order
- respond_design_review
- review_payment
- submit_payment
- update_notification_preferences
- update_order_status

Hasil:
- Missing RPC functions: **0**

## Android helper tests

`prepare-android.mjs` diuji menggunakan AndroidManifest contoh.

Hasil:
- CAMERA permission berhasil ditempatkan di dalam `<manifest>`.

`configure-release-signing.mjs` diuji menggunakan `build.gradle` contoh.

Hasil:
- signingConfigs.release berhasil ditambahkan.
- release build berhasil diarahkan ke signingConfig release pada file contoh.

## Batas pengujian

Full runtime test berikut belum dapat dilakukan tanpa environment eksternal:
- Supabase cloud end-to-end
- real camera QR scan pada perangkat fisik
- GitHub Actions online build
- signed AAB dengan keystore asli
- Google Play upload

Project tidak menganggap bagian tersebut berhasil sampai diuji dengan account/credential yang sebenarnya.
