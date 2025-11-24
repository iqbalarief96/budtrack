# ReceiptScanner Component - Google Vision Integration Patch

## Quick Update Guide

Add Google Cloud Vision as an option in your existing `components/ReceiptScanner.tsx`:

### 1. Update the MODELS array

**Find this code (around line 14):**
```typescript
const MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o (Best Quality - butuh OpenAI key)', provider: 'openai' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Butuh OpenAI API key + saldo)', provider: 'openai' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Gratis, bisa rate-limited)', provider: 'openrouter' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (Butuh Gemini API key)', provider: 'google' },
];
```

**Replace with:**
```typescript
const MODELS = [
    { id: 'google-vision', name: '⚡ Google Cloud Vision (OCR Langsung - Tercepat)', provider: 'google-vision' },
    { id: 'openai/gpt-4o', name: 'GPT-4o (Best Quality - butuh OpenAI key)', provider: 'openai' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Butuh OpenAI API key + saldo)', provider: 'openai' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Gratis, bisa rate-limited)', provider: 'openrouter' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (Butuh Gemini API key)', provider: 'google' },
];
```

### 2. Update the default model (Optional)

**Find this code (around line 21):**
```typescript
const [selectedModel, setSelectedModel] = useState(MODELS[0].id); // Default to GPT-4o
```

**Replace with:**
```typescript
const [selectedModel, setSelectedModel] = useState(MODELS[0].id); // Default to Google Vision
```

### 3. Add model description (Optional but recommended)

**Add this helper function after the MODELS array:**
```typescript
const MODEL_DESCRIPTIONS: Record<string, string> = {
    'google-vision': 'OCR langsung dari Google Cloud Vision. Sangat cepat untuk struk yang jelas. Butuh setup credentials.',
    'openai/gpt-4o': 'AI terbaik untuk parsing struk kompleks. Butuh OpenAI API key dengan saldo.',
    'openai/gpt-4o-mini': 'Versi lebih murah dari GPT-4o. Butuh OpenAI API key dengan saldo.',
    'google/gemini-2.0-flash-exp:free': 'Model gratis dari Google. Bisa rate-limited saat ramai.',
    'google/gemini-flash-1.5': 'Model Gemini yang cepat. Butuh Gemini API key.',
};
```

**Then add this below the Select component (around line 380):**
```typescript
<p className="text-xs text-muted-foreground">
    Pastikan API Key untuk model yang dipilih sudah diatur di Pengaturan.
</p>
{/* Add this: */}
{MODEL_DESCRIPTIONS[selectedModel] && (
    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
        ℹ️ {MODEL_DESCRIPTIONS[selectedModel]}
    </p>
)}
```

## That's It! 🎉

The backend already supports Google Vision - no other changes needed!

### How it works:
1. User selects "Google Cloud Vision" from dropdown
2. Uploads/captures receipt image
3. API automatically detects `model === 'google-vision'`
4. Uses Google Vision OCR for fast text extraction
5. If Google Vision fails, automatically falls back to AI-based OCR

### Testing:
1. Make sure Google Vision credentials are configured (see GOOGLE_VISION_INTEGRATION.md)
2. Select "Google Cloud Vision" from the model dropdown
3. Upload a receipt image
4. Should process in 1-2 seconds (much faster than AI models)

### Visual Result:

**Before:**
```
┌─────────────────────────────────┐
│ Pilih Model AI                  │
│ ┌─────────────────────────────┐ │
│ │ GPT-4o (Best Quality...)    │ │
│ │ GPT-4o Mini (Butuh...)      │ │
│ │ Gemini 2.0 Flash (Gratis)   │ │
│ │ Gemini 1.5 Flash (Butuh...) │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────┐
│ Pilih Model AI                  │
│ ┌─────────────────────────────┐ │
│ │ ⚡ Google Cloud Vision (...)│ │ ← NEW!
│ │ GPT-4o (Best Quality...)    │ │
│ │ GPT-4o Mini (Butuh...)      │ │
│ │ Gemini 2.0 Flash (Gratis)   │ │
│ │ Gemini 1.5 Flash (Butuh...) │ │
│ └─────────────────────────────┘ │
│ ℹ️ OCR langsung dari Google... │ ← NEW!
└─────────────────────────────────┘
```

## Alternative: Minimal Change

If you want the absolute minimal change, just add this one line to the MODELS array:

```typescript
const MODELS = [
    { id: 'google-vision', name: 'Google Cloud Vision', provider: 'google-vision' }, // ← Add this
    // ... rest of models
];
```

That's literally all you need! The rest is optional for better UX.
