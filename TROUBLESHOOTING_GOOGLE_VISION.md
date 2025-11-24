# 🔧 Troubleshooting Google Cloud Vision

## ❌ Error: "Google Vision credentials belum diupload"

### Penyebab:
User memilih model "⚡ Google Cloud Vision" tapi belum upload credentials.

### Solusi:

#### Option 1: Upload Credentials (Recommended)
```
1. Buka Settings → AI & Integrations
2. Scroll ke "Google Cloud Vision (Receipt OCR)"
3. Click "Upload JSON File"
4. Select file credentials dari Google Cloud
5. Click "Save Changes"
6. Coba scan lagi
```

#### Option 2: Pakai Model Lain
```
1. Di dialog "Scan Struk"
2. Pilih model lain:
   - Gemini 2.0 Flash (Gratis)
   - GPT-4o Mini
   - GPT-4o
3. Scan struk
```

---

## ❌ Error: "No auth credentials found"

### Penyebab:
Sama seperti di atas - credentials belum diupload.

### Solusi:
Ikuti Option 1 atau Option 2 di atas.

---

## ❌ Error: "Credentials file not found"

### Penyebab:
File credentials sudah diupload tapi hilang/terhapus dari folder `credentials/`.

### Solusi:
```
1. Re-upload credentials via Settings
2. File akan tersimpan ulang di credentials/google-vision-credentials.json
3. Coba scan lagi
```

---

## ❌ Error: "Invalid Google Cloud credentials JSON format"

### Penyebab:
File yang diupload bukan credentials Google Cloud yang valid.

### Solusi:
```
1. Pastikan download file JSON yang benar dari Google Cloud Console
2. File harus punya struktur:
   {
     "type": "service_account",
     "project_id": "...",
     "private_key": "...",
     ...
   }
3. Re-upload file yang benar
```

---

## ❌ Error: "Google Vision API not enabled"

### Penyebab:
Cloud Vision API belum di-enable di Google Cloud project.

### Solusi:
```
1. Buka https://console.cloud.google.com/
2. Pilih project yang benar
3. Search "Cloud Vision API"
4. Click "Enable"
5. Tunggu beberapa detik
6. Coba scan lagi
```

---

## ⚠️ Warning: "Falling back to AI-based OCR"

### Penyebab:
Google Vision gagal (credentials tidak valid, API error, dll) dan sistem otomatis pakai AI fallback.

### Ini Normal!
Sistem dirancang untuk auto-fallback ke AI (Gemini/GPT) jika Google Vision gagal.

### Jika Ingin Pakai Google Vision:
```
1. Check console log (F12) untuk detail error
2. Verify credentials sudah benar
3. Verify Cloud Vision API sudah enabled
4. Re-upload credentials jika perlu
```

---

## 🔍 Debug Mode

### Check Console Logs:
```javascript
// Buka browser console (F12)
// Look for these messages:

[RECEIPT-SCANNER] Using Google Cloud Vision API
[RECEIPT-SCANNER] Google Vision credentials not configured
[RECEIPT-SCANNER] Falling back to AI-based OCR...

// Or:

[GOOGLE-VISION] Starting OCR processing...
[GOOGLE-VISION] Using credentials from: ...
[GOOGLE-VISION] Error: ...
```

### Check File Exists:
```bash
# Check if credentials file exists
ls -la credentials/google-vision-credentials.json

# Should show:
# -rw------- 1 user user 2345 Nov 24 22:00 google-vision-credentials.json
```

### Check Permissions:
```bash
# Make sure file is readable
chmod 600 credentials/google-vision-credentials.json
```

---

## ✅ Verification Checklist

Sebelum scan struk dengan Google Vision, pastikan:

- [ ] File credentials sudah diupload via Settings
- [ ] File tersimpan di `credentials/google-vision-credentials.json`
- [ ] Cloud Vision API sudah enabled di Google Cloud
- [ ] Service account punya role "Cloud Vision API User"
- [ ] File credentials valid (bisa dibuka sebagai JSON)

---

## 🔄 Auto-Fallback Flow

```
User pilih "Google Cloud Vision"
    ↓
Check credentials uploaded?
    ↓ NO
    ├─→ Check ada API key fallback?
    │   ↓ YES
    │   └─→ Use AI (Gemini/GPT) ✅
    │   ↓ NO
    │   └─→ Show error: "Upload credentials dulu" ❌
    ↓ YES
Try Google Vision OCR
    ↓
Success?
    ↓ YES
    └─→ Return hasil ✅
    ↓ NO
    ├─→ Check ada API key fallback?
    │   ↓ YES
    │   └─→ Use AI (Gemini/GPT) ✅
    │   ↓ NO
    │   └─→ Show error ❌
```

---

## 💡 Tips

### Tip 1: Setup Fallback
Selalu setup minimal 1 API key (OpenRouter/Gemini/OpenAI) sebagai fallback:
```
Settings → AI & Integrations
→ Setup OpenRouter/Gemini API key
→ Jadi kalau Google Vision gagal, otomatis pakai AI
```

### Tip 2: Test Credentials
Setelah upload, langsung test scan struk untuk verify credentials working.

### Tip 3: Keep Backup
Simpan copy file credentials di tempat aman (bukan di Git!).

### Tip 4: Monitor Usage
Check Google Cloud Console untuk monitor usage dan pastikan tidak exceed free tier.

---

## 🆘 Still Having Issues?

1. **Check console logs** (F12) untuk detail error
2. **Re-upload credentials** via Settings
3. **Verify Google Cloud setup**:
   - Project created
   - Cloud Vision API enabled
   - Service account created with correct role
   - JSON key downloaded
4. **Try AI fallback** - Pilih model Gemini/GPT untuk sementara
5. **Contact support** dengan screenshot error + console logs

---

## 📚 Related Documentation

- `GOOGLE_VISION_SETUP_ID.md` - Setup guide lengkap
- `GOOGLE_VISION_VISUAL_GUIDE.md` - Visual guide dengan diagram
- `QUICK_REFERENCE_GOOGLE_VISION.md` - Quick reference

---

**Troubleshooting Guide v1.0** | Google Cloud Vision for Budtrack
