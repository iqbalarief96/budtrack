# Setup Google Cloud Vision untuk Scan Struk

## 🚀 Panduan Cepat (5 Menit)

Google Cloud Vision memberikan OCR yang sangat cepat (1-2 detik) untuk scan struk, dibandingkan AI biasa yang butuh 3-5 detik.

**✨ MUDAH!** Upload file JSON langsung via Settings UI - tidak perlu manual copy file!

### Langkah 1: Buat Akun Google Cloud (Gratis)

1. Buka https://console.cloud.google.com/
2. Login dengan akun Google
3. Buat project baru (atau pilih yang sudah ada)

### Langkah 2: Aktifkan Cloud Vision API

1. Di Google Cloud Console, cari "Cloud Vision API"
2. Klik "Enable" (Aktifkan)
3. Tunggu beberapa detik sampai aktif

### Langkah 3: Buat Service Account

1. Buka menu "APIs & Services" → "Credentials"
2. Klik "Create Credentials" → "Service Account"
3. Isi nama: `budtrack-vision`
4. Role: Pilih "Cloud Vision API User"
5. Klik "Done"

### Langkah 4: Download Credentials JSON

1. Klik service account yang baru dibuat
2. Tab "Keys" → "Add Key" → "Create new key"
3. Pilih format "JSON"
4. File akan otomatis terdownload (contoh: `budtrack-vision-xxxxx.json`)

### Langkah 5: ~~Upload ke Server~~ (SKIP - Nanti upload via UI)

### Langkah 6: Upload di Budtrack (MUDAH!)

1. Buka **Settings** → **AI & Integrations**
2. Scroll ke bawah ke bagian "Google Cloud Vision (Receipt OCR)"
3. Klik **"Upload JSON File"**
4. Pilih file JSON yang tadi didownload
5. Klik **Save Changes**

✅ **Selesai!** File otomatis tersimpan di `credentials/google-vision-credentials.json`

### Langkah 7: Test!

1. Buka halaman Transactions
2. Klik "Scan Struk"
3. Pilih model: **⚡ Google Cloud Vision**
4. Upload foto struk
5. Harusnya proses dalam 1-2 detik! ⚡

## 💰 Biaya

- **Gratis**: 1,000 scan pertama per bulan
- **Setelah itu**: $1.50 per 1,000 scan

Untuk penggunaan pribadi, kemungkinan besar akan tetap gratis!

## 🎯 Kapan Pakai Google Vision?

✅ **Pakai Google Vision jika:**
- Struk jelas dan mudah dibaca
- Butuh proses cepat (1-2 detik)
- Struk format sederhana

✅ **Pakai AI (Gemini/GPT) jika:**
- Struk kompleks dengan banyak item
- Struk blur atau tulisan tangan
- Butuh parsing yang lebih pintar

## 🔄 Fallback Otomatis

Jangan khawatir! Jika Google Vision gagal (misalnya credentials belum disetup), sistem akan otomatis fallback ke AI-based OCR (Gemini/GPT).

## 🐛 Troubleshooting

### Error: "No API key provided"
**Solusi:** Pastikan path credentials sudah benar di Settings

### Error: "Permission denied"
**Solusi:** Cek permission file:
```bash
chmod 600 /path/to/google-vision.json
```

### Error: "API not enabled"
**Solusi:** Pastikan Cloud Vision API sudah di-enable di Google Cloud Console

### Masih pakai AI padahal sudah setup
**Ini normal!** Artinya Google Vision gagal dan otomatis fallback ke AI. Cek console log untuk detail error.

## 📊 Perbandingan

| Metode | Kecepatan | Akurasi | Setup | Biaya |
|--------|-----------|---------|-------|-------|
| Google Vision | ⚡⚡⚡ (1-2s) | ⭐⭐⭐⭐ | 🔧 Medium | 💰 Free tier |
| Gemini AI | ⚡⚡ (3-5s) | ⭐⭐⭐⭐⭐ | ✅ Easy | 💰 Free/Paid |
| GPT-4o | ⚡ (3-5s) | ⭐⭐⭐⭐⭐ | ✅ Easy | 💰💰 Paid |

## 🎉 Selesai!

Sekarang Budtrack punya 3 opsi OCR:
1. **Google Vision** - Cepat untuk struk sederhana
2. **Gemini** - Pintar untuk struk kompleks
3. **GPT-4o** - Premium quality

Sistem akan otomatis fallback jika satu gagal!

## 📚 Dokumentasi Lengkap

Untuk dokumentasi teknis lengkap dalam bahasa Inggris:
- `GOOGLE_VISION_INTEGRATION.md` - Setup lengkap
- `GOOGLE_VISION_QUICKSTART.md` - Quick start guide
- `GOOGLE_VISION_IMPLEMENTATION_SUMMARY.md` - Detail implementasi

## 🆘 Butuh Bantuan?

Cek console log di browser (F12) untuk melihat error detail:
```
[GOOGLE-VISION] Starting OCR processing...
[GOOGLE-VISION] Error: ...
```

Atau hubungi developer untuk bantuan!
