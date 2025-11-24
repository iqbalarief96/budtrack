# 📋 Google Cloud Vision - Quick Reference

## 🚀 Setup Cepat

### 1. Google Cloud Console
```
https://console.cloud.google.com/
→ Create Project
→ Enable "Cloud Vision API"
→ Create Service Account (role: Cloud Vision API User)
→ Download JSON key
```

### 2. Budtrack Settings
```
Settings → AI & Integrations → Google Cloud Vision
→ Click "Upload JSON File"
→ Select downloaded JSON file
→ Save Changes
```

### 3. Pakai!
```
Transactions → Scan Struk
→ Pilih: ⚡ Google Cloud Vision
→ Upload foto
→ Done! (1-2 detik)
```

## 📁 File Storage

File otomatis tersimpan di:
```
credentials/google-vision-credentials.json
```

✅ **Sudah di .gitignore** - Aman, tidak akan ke-commit ke Git!

## 🔧 Environment Variable (Alternative)

**Linux/Mac:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/google-vision.json"
```

**Windows PowerShell:**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\google-vision.json"
```

**Docker Compose:**
```yaml
environment:
  - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-vision.json
```

**.env file:**
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-vision.json
```

## 💰 Pricing

| Usage | Cost |
|-------|------|
| 0 - 1,000 scans/month | **FREE** |
| 1,001 - 5M scans | $1.50 per 1,000 |
| 5M+ scans | $0.60 per 1,000 |

**Untuk personal use: GRATIS!** 🎉

## ⚡ Performance

| Method | Speed | Accuracy |
|--------|-------|----------|
| Google Vision | **1-2s** ⚡⚡⚡ | ⭐⭐⭐⭐ |
| Gemini AI | 3-5s ⚡⚡ | ⭐⭐⭐⭐⭐ |
| GPT-4o | 3-5s ⚡ | ⭐⭐⭐⭐⭐ |

## 🎯 When to Use

### ✅ Use Google Vision:
- Struk jelas & mudah dibaca
- Format sederhana
- Butuh speed (1-2 detik)
- High volume scanning

### ✅ Use AI (Gemini/GPT):
- Struk kompleks
- Banyak item
- Struk blur/tulisan tangan
- Butuh parsing pintar

## 🔄 Auto-Fallback

```
Google Vision gagal?
    ↓
Otomatis pakai AI (Gemini/GPT)
    ↓
User tetap dapat hasil!
```

## 🐛 Common Issues

### "No API key provided"
```
→ Check path di Settings
→ Pastikan file exists
→ Check file permissions (chmod 600)
```

### "API not enabled"
```
→ Enable Cloud Vision API di Google Cloud Console
```

### "Permission denied"
```bash
chmod 600 /path/to/google-vision.json
```

### Still using AI instead of Google Vision
```
→ Normal! Auto-fallback working
→ Check console log for error details
→ Verify credentials path is correct
```

## 📝 Console Logs

Check browser console (F12) untuk debug:

```javascript
[GOOGLE-VISION] Starting OCR processing...
[GOOGLE-VISION] Image buffer size: 123456 bytes
[GOOGLE-VISION] Detected text: ...
[GOOGLE-VISION] Parsed receipt data: {...}
```

## 🔐 Security

✅ **DO:**
- Store credentials outside web root
- Use environment variables in production
- Set file permissions: `chmod 600`
- Add `*.json` to `.gitignore`

❌ **DON'T:**
- Commit credentials to Git
- Share credentials publicly
- Use root/admin permissions

## 📚 Full Documentation

- **`GOOGLE_VISION_SETUP_ID.md`** - Setup lengkap (Bahasa Indonesia)
- `GOOGLE_VISION_INTEGRATION.md` - Technical guide (English)
- `GOOGLE_VISION_QUICKSTART.md` - 5-minute guide
- `SETUP_COMPLETE_SUMMARY.md` - Implementation summary

## 🆘 Need Help?

1. Check console logs (F12)
2. Read `GOOGLE_VISION_SETUP_ID.md`
3. Verify credentials path
4. Test with script: `npx ts-node scripts/test-google-vision.ts image.jpg`

---

**Quick Reference v1.0** | Google Cloud Vision Integration for Budtrack
