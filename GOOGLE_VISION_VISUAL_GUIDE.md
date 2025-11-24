# 📸 Google Cloud Vision - Visual Guide

## 🎯 Setup dalam 3 Langkah

### Langkah 1: Download Credentials dari Google Cloud

```
┌─────────────────────────────────────────┐
│  Google Cloud Console                   │
│  https://console.cloud.google.com       │
├─────────────────────────────────────────┤
│                                         │
│  1. Create Project                      │
│  2. Enable "Cloud Vision API"           │
│  3. Create Service Account              │
│     Role: Cloud Vision API User         │
│  4. Download JSON Key                   │
│                                         │
│     [Download JSON] ← Click this!       │
│                                         │
└─────────────────────────────────────────┘
         ↓
    📄 budtrack-vision-xxxxx.json
```

### Langkah 2: Upload di Budtrack Settings

```
┌─────────────────────────────────────────────────────┐
│  Settings → AI & Integrations                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Google Cloud Vision (Receipt OCR)                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│  Upload file JSON credentials untuk scan struk     │
│  yang lebih cepat                                  │
│                                                     │
│  Upload Credentials JSON                           │
│  ┌──────────────────────────────┐                 │
│  │  [📤 Upload JSON File]       │ ← Click!        │
│  └──────────────────────────────┘                 │
│                                                     │
│  ✅ File uploaded: budtrack-vision-xxxxx.json      │
│                                                     │
│  💡 Tip: Google Vision memberikan OCR yang         │
│  sangat cepat (1-2 detik). Free tier: 1,000       │
│  scan/bulan. Setup di sini                         │
│                                                     │
└─────────────────────────────────────────────────────┘
         ↓
    [Save Changes] ← Click!
         ↓
    ✅ Settings saved successfully!
```

### Langkah 3: Pakai untuk Scan Struk!

```
┌─────────────────────────────────────────────────────┐
│  Transactions → Scan Struk                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Pilih Model AI                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ ⚡ Google Cloud Vision (OCR Langsung)        │  │ ← Select!
│  │ GPT-4o (Best Quality)                        │  │
│  │ GPT-4o Mini                                  │  │
│  │ Gemini 2.0 Flash (Gratis)                   │  │
│  │ Gemini 1.5 Flash                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ℹ️ OCR langsung dari Google Cloud Vision.         │
│  Sangat cepat (1-2 detik) untuk struk yang jelas. │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ 📤 Upload    │  │ 📷 Ambil     │               │
│  │   Foto       │  │   Foto       │               │
│  └──────────────┘  └──────────────┘               │
│                                                     │
└─────────────────────────────────────────────────────┘
         ↓
    Upload foto struk
         ↓
    ⚡ Processing... (1-2 detik)
         ↓
    ✅ Receipt scanned! Found 5 items.
```

## 📊 Comparison

### Before (Manual Path):
```
Step 1: Download JSON                    ✅
Step 2: Upload to server via FTP/SSH    😰
Step 3: Find correct path                🤔
Step 4: Copy path to Settings            📝
Step 5: Save                             ✅

Total: 5 steps, ~10 minutes
```

### After (File Upload):
```
Step 1: Download JSON                    ✅
Step 2: Click "Upload JSON File"         🖱️
Step 3: Select file                      ✅

Total: 3 steps, ~2 minutes
```

**Improvement: 50% faster! 🚀**

## 🎯 What Happens Behind the Scenes

```
User uploads JSON file
    ↓
┌─────────────────────────────────────┐
│ Validation                          │
├─────────────────────────────────────┤
│ ✓ Check file is .json              │
│ ✓ Validate JSON structure          │
│ ✓ Check Google Cloud credentials   │
│   - type                            │
│   - project_id                      │
│   - private_key                     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Save File                           │
├─────────────────────────────────────┤
│ Location:                           │
│ credentials/                        │
│   google-vision-credentials.json    │
│                                     │
│ ✓ Folder in .gitignore             │
│ ✓ Secure permissions               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Save to Database                    │
├─────────────────────────────────────┤
│ UserSettings.googleVisionCredentials│
│ = "credentials/google-vision-..."   │
└─────────────────────────────────────┘
    ↓
✅ Ready to use!
```

## 🔄 Scan Flow

```
User scans receipt
    ↓
Select "⚡ Google Cloud Vision"
    ↓
Upload image
    ↓
┌─────────────────────────────────────┐
│ Backend Processing                  │
├─────────────────────────────────────┤
│ 1. Read credentials from path       │
│ 2. Initialize Google Vision client  │
│ 3. Send image to Google Vision API  │
│ 4. Receive OCR text (1-2 seconds)   │
│ 5. Parse text into structured data  │
│    - Store name                     │
│    - Date                           │
│    - Total amount                   │
│    - Items list                     │
│ 6. Validate totals                  │
│ 7. Return JSON                      │
└─────────────────────────────────────┘
    ↓
Display results to user
    ↓
✅ Transaction created!
```

## 🛡️ Security

```
┌─────────────────────────────────────┐
│ Security Measures                   │
├─────────────────────────────────────┤
│ ✓ credentials/ in .gitignore        │
│ ✓ Only authenticated users upload   │
│ ✓ JSON validation before save       │
│ ✓ Fixed filename (no user input)    │
│ ✓ Path validation when reading      │
│ ✓ File not accessible via web       │
└─────────────────────────────────────┘
```

## 💰 Cost

```
┌─────────────────────────────────────┐
│ Google Cloud Vision Pricing         │
├─────────────────────────────────────┤
│ First 1,000 scans/month    FREE 🎉  │
│ 1,001 - 5M scans          $1.50/1K  │
│ 5M+ scans                 $0.60/1K  │
└─────────────────────────────────────┘

For personal use: Stay in FREE tier! 🎊
```

## ⚡ Performance

```
┌──────────────────┬──────────┬──────────┐
│ Method           │ Speed    │ Accuracy │
├──────────────────┼──────────┼──────────┤
│ Google Vision    │ 1-2s ⚡⚡⚡│ ⭐⭐⭐⭐   │
│ Gemini AI        │ 3-5s ⚡⚡ │ ⭐⭐⭐⭐⭐  │
│ GPT-4o           │ 3-5s ⚡  │ ⭐⭐⭐⭐⭐  │
└──────────────────┴──────────┴──────────┘
```

## 🎉 Success!

```
┌─────────────────────────────────────┐
│                                     │
│         ✅ Setup Complete!          │
│                                     │
│  You now have 3 OCR options:        │
│                                     │
│  ⚡ Google Vision - Fast & Free     │
│  🤖 Gemini - Smart AI               │
│  ✨ GPT-4o - Premium Quality        │
│                                     │
│  With auto-fallback if one fails!   │
│                                     │
└─────────────────────────────────────┘
```

---

**Visual Guide v1.0** | Google Cloud Vision Integration for Budtrack
