# Google Cloud Vision API Integration Guide

## Overview
This guide explains how to integrate Google Cloud Vision API for OCR receipt scanning in Budtrack.

## Features
- Direct OCR text extraction using Google Cloud Vision API
- Automatic parsing of receipt data (store name, date, total, items)
- Fallback to AI-based OCR (OpenAI/Gemini) if Google Vision fails
- Support for multiple image formats (JPEG, PNG, etc.)

## Setup Instructions

### 1. Get Google Cloud Vision API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Grant the role: "Cloud Vision API User"
5. Create and download the JSON key:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file

### 2. Upload Credentials to Server

You have two options:

#### Option A: Upload JSON file to server
```bash
# Upload the JSON file to your server
# Recommended location: /path/to/budtrack/credentials/google-vision.json
```

#### Option B: Use environment variable
```bash
# Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
```

### 3. Configure in Budtrack Settings

1. Go to **Settings** page in Budtrack
2. Navigate to **AI Settings** section
3. Add the path to your Google Vision credentials JSON file
4. Save settings

## Usage

### Using Google Cloud Vision for Receipt Scanning

When scanning a receipt, you can now select "Google Cloud Vision" as the OCR provider:

```typescript
// In your receipt scanner component
const model = 'google-vision'; // or 'google-cloud-vision'

// The API will automatically use Google Vision
const response = await fetch('/api/scan-receipt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageBase64: imageData,
    model: model
  })
});
```

### Fallback Mechanism

If Google Cloud Vision fails (e.g., credentials not configured, API error), the system will automatically fall back to AI-based OCR using OpenAI or Gemini.

## API Structure

### Files Modified/Created

1. **lib/google-vision-ocr.ts** (NEW)
   - Main Google Vision integration
   - Text detection and parsing logic
   - Receipt data extraction

2. **lib/receipt-scanner.ts** (MODIFIED)
   - Added Google Vision support
   - Fallback mechanism
   - Updated type definitions

3. **app/api/scan-receipt/route.ts** (MODIFIED)
   - Added Google Vision credentials support
   - Updated API key handling

4. **prisma/schema.prisma** (MODIFIED)
   - Added `googleVisionCredentials` field to UserSettings

### Response Format

The Google Vision OCR returns the same structured format as AI-based OCR:

```json
{
  "success": true,
  "data": {
    "transaction": {
      "store_name": "Indomaret",
      "date": "2025-11-24",
      "total_amount": 42000,
      "category": "Belanja",
      "description": "Belanja Indomaret",
      "payment_method": "Cash"
    },
    "items": [
      {
        "name": "Susu",
        "quantity": 2,
        "unit_price": 15000,
        "total_price": 30000
      },
      {
        "name": "Roti",
        "quantity": 1,
        "unit_price": 12000,
        "total_price": 12000
      }
    ]
  },
  "message": "Receipt scanned! Found 2 items."
}
```

## Customization

### Improving Receipt Parsing

The `parseReceiptText()` function in `lib/google-vision-ocr.ts` contains the logic for extracting receipt information from raw OCR text. You can customize it based on your receipt formats:

```typescript
// Example: Add support for specific store formats
if (text.includes('ALFAMART')) {
  // Custom parsing logic for Alfamart receipts
}
```

### Adding More Date Formats

Update the `parseDateString()` function to support additional date formats:

```typescript
// Example: Add support for "24 Nov 2025" format
const monthNameMatch = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|...)\s+(\d{4})/i);
```

## Error Handling

The integration includes comprehensive error handling:

1. **Missing Credentials**: Returns error message asking user to configure credentials
2. **API Errors**: Logs error and falls back to AI-based OCR
3. **No Text Detected**: Returns error message
4. **Invalid Response**: Validates and adjusts data before returning

## Cost Considerations

Google Cloud Vision API pricing (as of 2024):
- First 1,000 units/month: FREE
- 1,001 - 5,000,000 units: $1.50 per 1,000 units
- 5,000,001+ units: $0.60 per 1,000 units

One receipt scan = 1 unit

For most personal use cases, you'll stay within the free tier.

## Troubleshooting

### "No API key provided" error
- Make sure you've configured the Google Vision credentials path in Settings
- Verify the JSON file exists at the specified path
- Check file permissions

### "Invalid response format" error
- The receipt image may be too blurry or low quality
- Try taking a clearer photo
- Ensure the receipt is well-lit and flat

### Fallback to AI-based OCR
- This is normal behavior if Google Vision fails
- Check the console logs for specific error messages
- Verify your Google Cloud project has Vision API enabled

## Security Notes

1. **Never commit credentials to Git**: Add `*.json` to `.gitignore`
2. **Use environment variables**: For production, use environment variables instead of file paths
3. **Restrict API key permissions**: Only grant "Cloud Vision API User" role
4. **Monitor usage**: Set up billing alerts in Google Cloud Console

## Next Steps

1. Test with various receipt formats
2. Customize parsing logic for your specific needs
3. Add support for multiple languages
4. Implement caching to reduce API calls
5. Add receipt image preprocessing (rotation, contrast adjustment)

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Review Google Cloud Vision API documentation
- Test with the Google Cloud Vision API Explorer
