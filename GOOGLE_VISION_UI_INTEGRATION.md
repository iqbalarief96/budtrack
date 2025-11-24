# Google Cloud Vision UI Integration Guide

## Overview
This guide shows how to add Google Cloud Vision as an option in your receipt scanner UI.

## 1. Update Settings Page

Add a field for Google Vision credentials in your settings page:

```typescript
// In app/settings/page.tsx or similar

<div className="space-y-2">
  <label className="text-sm font-medium">
    Google Cloud Vision Credentials Path
  </label>
  <input
    type="text"
    placeholder="/path/to/google-vision-credentials.json"
    value={googleVisionCredentials}
    onChange={(e) => setGoogleVisionCredentials(e.target.value)}
    className="w-full px-3 py-2 border rounded-md"
  />
  <p className="text-xs text-gray-500">
    Path to your Google Cloud Vision service account JSON file
  </p>
</div>
```

Save to database:
```typescript
await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...otherSettings,
    googleVisionCredentials: googleVisionCredentials
  })
});
```

## 2. Update Receipt Scanner Component

Add Google Vision as a model option in your receipt scanner:

```typescript
// In components/ReceiptScanner.tsx or similar

const OCR_MODELS = [
  // Existing models
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  
  // Add Google Vision
  { value: 'google-vision', label: 'Google Cloud Vision (Direct OCR)' },
];

// In your component
const [selectedModel, setSelectedModel] = useState('google-vision');

// Model selector UI
<select
  value={selectedModel}
  onChange={(e) => setSelectedModel(e.target.value)}
  className="px-3 py-2 border rounded-md"
>
  {OCR_MODELS.map(model => (
    <option key={model.value} value={model.value}>
      {model.label}
    </option>
  ))}
</select>
```

## 3. Update Scan Function

The scan function remains the same - just pass the selected model:

```typescript
const handleScan = async (imageBase64: string) => {
  try {
    setIsScanning(true);
    
    const response = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imageBase64,
        model: selectedModel // Will be 'google-vision' if selected
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Handle success
      console.log('Receipt scanned:', data.data);
      onScanComplete(data.data);
    } else {
      // Handle error
      toast.error(data.error || 'Failed to scan receipt');
    }
  } catch (error) {
    console.error('Scan error:', error);
    toast.error('Failed to scan receipt');
  } finally {
    setIsScanning(false);
  }
};
```

## 4. Add Model Information/Tooltips

Help users understand when to use Google Vision:

```typescript
const MODEL_INFO = {
  'google-vision': {
    name: 'Google Cloud Vision',
    description: 'Direct OCR - Fast and accurate text extraction',
    pros: ['Very fast', 'Accurate text detection', 'Free tier available'],
    cons: ['Requires setup', 'Basic parsing (may need manual review)'],
    bestFor: 'Clear, well-formatted receipts'
  },
  'google/gemini-2.0-flash-exp:free': {
    name: 'Gemini 2.0 Flash',
    description: 'AI-powered OCR with intelligent parsing',
    pros: ['Smart item detection', 'Better for complex receipts', 'Free'],
    cons: ['Slower than direct OCR', 'May have rate limits'],
    bestFor: 'Complex receipts with multiple items'
  },
  // ... other models
};

// Display info
<div className="text-sm text-gray-600 mt-2">
  <p><strong>{MODEL_INFO[selectedModel].name}</strong></p>
  <p>{MODEL_INFO[selectedModel].description}</p>
  <p className="text-xs mt-1">Best for: {MODEL_INFO[selectedModel].bestFor}</p>
</div>
```

## 5. Add Status Indicators

Show which OCR method is being used:

```typescript
{isScanning && (
  <div className="flex items-center gap-2">
    <Loader className="animate-spin" />
    <span>
      {selectedModel === 'google-vision' 
        ? 'Extracting text with Google Vision...'
        : 'Processing with AI...'}
    </span>
  </div>
)}
```

## 6. Handle Fallback Gracefully

If Google Vision fails and falls back to AI:

```typescript
const response = await fetch('/api/scan-receipt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageBase64: imageBase64,
    model: selectedModel
  })
});

const data = await response.json();

if (data.success) {
  // Check if fallback was used (you can add this info in the API response)
  if (data.usedFallback) {
    toast.info('Google Vision unavailable, used AI fallback');
  }
  onScanComplete(data.data);
}
```

## 7. Example Complete Component

```typescript
import { useState } from 'react';
import { Camera, Upload, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const OCR_MODELS = [
  { value: 'google-vision', label: 'Google Cloud Vision (Fast OCR)', icon: '⚡' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 (Smart AI)', icon: '🤖' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Premium)', icon: '✨' },
];

export function ReceiptScanner({ onScanComplete }) {
  const [selectedModel, setSelectedModel] = useState('google-vision');
  const [isScanning, setIsScanning] = useState(false);

  const handleImageCapture = async (imageBase64: string) => {
    try {
      setIsScanning(true);
      
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64,
          model: selectedModel
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        onScanComplete(data.data);
      } else {
        toast.error(data.error || 'Failed to scan receipt');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          OCR Method
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isScanning}
        >
          {OCR_MODELS.map(model => (
            <option key={model.value} value={model.value}>
              {model.icon} {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* Camera/Upload Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {/* Open camera */}}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          <Camera size={20} />
          Take Photo
        </button>
        
        <button
          onClick={() => {/* Open file picker */}}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
        >
          <Upload size={20} />
          Upload
        </button>
      </div>

      {/* Scanning Status */}
      {isScanning && (
        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-md">
          <Loader className="animate-spin" size={20} />
          <span>Scanning receipt...</span>
        </div>
      )}
    </div>
  );
}
```

## 8. Testing Checklist

- [ ] Google Vision credentials configured in settings
- [ ] Model selector shows Google Vision option
- [ ] Scan works with Google Vision selected
- [ ] Fallback to AI works if Google Vision fails
- [ ] Error messages are clear and helpful
- [ ] Loading states work correctly
- [ ] Receipt data is parsed correctly
- [ ] UI updates after successful scan

## Tips

1. **Default to Google Vision** if credentials are configured (fastest)
2. **Show model comparison** to help users choose
3. **Add retry logic** for failed scans
4. **Cache model selection** in localStorage
5. **Show cost information** for paid models
6. **Add preview** before confirming scanned data
