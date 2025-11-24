# Google Cloud Vision - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get Google Cloud Credentials (5 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable Cloud Vision API:
   - Click "APIs & Services" → "Library"
   - Search "Cloud Vision API"
   - Click "Enable"
4. Create service account:
   - Click "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name it "budtrack-vision"
   - Role: "Cloud Vision API User"
5. Download JSON key:
   - Click on the service account
   - "Keys" tab → "Add Key" → "Create new key"
   - Choose "JSON"
   - Save the file (e.g., `google-vision-credentials.json`)

### Step 2: Upload Credentials to Server

**Option A: Environment Variable (Recommended)**
```bash
# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/google-vision-credentials.json"

# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\google-vision-credentials.json"

# Add to .env file
echo 'GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-vision-credentials.json' >> .env
```

**Option B: Database (via Settings UI)**
1. Go to Settings page
2. Add field for "Google Vision Credentials Path"
3. Enter: `/path/to/google-vision-credentials.json`
4. Save

### Step 3: Update UI (1 minute)

Edit `components/ReceiptScanner.tsx`:

```typescript
const MODELS = [
    { id: 'google-vision', name: '⚡ Google Cloud Vision', provider: 'google-vision' }, // ← Add this line
    // ... existing models
];
```

### Step 4: Test It! (1 minute)

**Option A: Via Test Script**
```bash
npx ts-node scripts/test-google-vision.ts ./test-receipt.jpg
```

**Option B: Via UI**
1. Open Budtrack
2. Click "Scan Struk"
3. Select "Google Cloud Vision"
4. Upload a receipt image
5. Should process in 1-2 seconds!

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] Cloud Vision API enabled
- [ ] Service account created with correct role
- [ ] JSON credentials downloaded
- [ ] Credentials uploaded to server
- [ ] Environment variable set (or database configured)
- [ ] UI updated with Google Vision option
- [ ] Test scan successful

## 🎯 Expected Results

### Success:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "store_name": "Indomaret",
      "date": "2025-11-24",
      "total_amount": 42000,
      "category": "Belanja",
      "description": "Belanja Indomaret"
    },
    "items": [
      { "name": "Susu", "quantity": 2, "unit_price": 15000, "total_price": 30000 },
      { "name": "Roti", "quantity": 1, "unit_price": 12000, "total_price": 12000 }
    ]
  },
  "message": "Receipt scanned! Found 2 items."
}
```

### Processing Time:
- Google Vision: **1-2 seconds** ⚡
- AI-based (GPT/Gemini): **3-5 seconds** 🐌

## 🐛 Troubleshooting

### Error: "No API key provided"
**Solution:** Set GOOGLE_APPLICATION_CREDENTIALS environment variable

### Error: "Permission denied"
**Solution:** Check file permissions: `chmod 600 /path/to/credentials.json`

### Error: "API not enabled"
**Solution:** Enable Cloud Vision API in Google Cloud Console

### Fallback to AI
**This is normal!** If Google Vision fails, it automatically uses AI-based OCR as backup.

## 💰 Cost

**Free Tier:** 1,000 scans/month
**After free tier:** $1.50 per 1,000 scans

For personal use, you'll likely stay in the free tier!

## 📊 Performance Comparison

| Method | Speed | Accuracy | Setup | Cost |
|--------|-------|----------|-------|------|
| Google Vision | ⚡⚡⚡ | ⭐⭐⭐⭐ | 🔧 Medium | 💰 Free tier |
| Gemini AI | ⚡⚡ | ⭐⭐⭐⭐⭐ | ✅ Easy | 💰 Free/Paid |
| GPT-4o | ⚡ | ⭐⭐⭐⭐⭐ | ✅ Easy | 💰💰 Paid |

## 🎉 You're Done!

Your Budtrack now has **3 OCR options**:
1. **Google Vision** - Fast direct OCR
2. **Gemini** - Smart AI parsing
3. **GPT-4o** - Premium AI parsing

The system automatically falls back if one fails!

## 📚 More Info

- Full guide: `GOOGLE_VISION_INTEGRATION.md`
- UI guide: `GOOGLE_VISION_UI_INTEGRATION.md`
- Implementation details: `GOOGLE_VISION_IMPLEMENTATION_SUMMARY.md`

## 🆘 Need Help?

Check the console logs:
```bash
# Look for these log messages:
[GOOGLE-VISION] Starting OCR processing...
[GOOGLE-VISION] Detected text: ...
[GOOGLE-VISION] Parsed receipt data: ...
```

If you see errors, check:
1. Credentials file exists and is readable
2. GOOGLE_APPLICATION_CREDENTIALS is set correctly
3. Cloud Vision API is enabled in Google Cloud
4. Service account has correct permissions
