# BudTrack Mobile - Personal Use Guide (No App Store Needed!)

Guide super simpel untuk pakai BudTrack di mobile tanpa ribet submit ke App Store/Play Store.

---

## 🎯 Pilihan untuk Personal Use

### Option 1: Progressive Web App (PWA) - TERMUDAH! ⭐

**Advantages:**
- ✅ Gak perlu build app
- ✅ Gak perlu App Store/Play Store
- ✅ Install langsung dari browser
- ✅ Update otomatis
- ✅ Works di iOS & Android
- ✅ Push notifications (Android)
- ✅ Offline mode
- ✅ Feels like native app

**Cara Install:**
```
1. Buka https://budtrack.com di mobile browser
2. iOS: Tap Share → Add to Home Screen
3. Android: Tap menu → Install App / Add to Home Screen
4. Done! App icon muncul di home screen
```

**Setup PWA di Next.js:**
```bash
# Install next-pwa
npm install next-pwa

# Update next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true
})

module.exports = withPWA({
  // ... existing config
})
```

**Create manifest.json:**
```json
// public/manifest.json
{
  "name": "BudTrack",
  "short_name": "BudTrack",
  "description": "Personal Finance Manager",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Add to layout.tsx:**
```typescript
// app/layout.tsx
export const metadata = {
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BudTrack'
  }
}
```

**That's it!** 🎉 Access dari browser, install ke home screen, done!

---

### Option 2: Expo Go - CEPAT! ⚡

**Advantages:**
- ✅ Gak perlu Mac
- ✅ Gak perlu App Store account
- ✅ Test instant di device
- ✅ Hot reload
- ✅ Good untuk development

**Disadvantages:**
- ⚠️ Butuh Expo Go app installed
- ⚠️ Limited native modules
- ⚠️ Perlu network connection

**Setup (5 menit):**

```bash
# 1. Create Expo project
npx create-expo-app budtrack-mobile --template blank-typescript
cd budtrack-mobile

# 2. Install dependencies
npm install @react-navigation/native @react-navigation/stack
npm install axios @tanstack/react-query
npm install react-native-paper
npx expo install react-native-safe-area-context react-native-screens

# 3. Start development server
npx expo start

# QR code muncul di terminal
```

**Use on Phone:**

**iOS:**
```
1. Download "Expo Go" dari App Store (FREE)
2. Open Expo Go app
3. Scan QR code dari terminal
4. App langsung running di phone!
```

**Android:**
```
1. Download "Expo Go" dari Play Store (FREE)
2. Open Expo Go app
3. Scan QR code dari terminal
4. App langsung running di phone!
```

**Access Anywhere:**
```
Kalau di network yang sama:
- Scan QR code, done!

Kalau beda network (e.g., di luar):
- Pakai Tunnel mode: npx expo start --tunnel
- Scan QR code
- Works dari mana aja (butuh internet)
```

---

### Option 3: Development Build - FULL FEATURES! 💪

**Advantages:**
- ✅ All native modules work
- ✅ Full control
- ✅ No Expo Go limitations
- ✅ Better performance
- ✅ Can use any native library

**Disadvantages:**
- ⚠️ Need to rebuild untuk update
- ⚠️ Lebih complicated setup

**Setup:**

```bash
# 1. Create development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Wait ~15-30 menit

# 2. Download .ipa (iOS) atau .apk (Android) dari EAS dashboard

# 3. Install di device:
# iOS: Airdrop ke iPhone, tap to install
# Android: Download .apk di phone, tap to install

# 4. Run development server
npx expo start --dev-client

# 5. Open app di phone
# App akan connect ke dev server
# Hot reload works!
```

**Install di Device:**

**iOS:**
```
1. Download .ipa dari EAS
2. Airdrop ke iPhone
3. Settings → General → VPN & Device Management
4. Trust developer certificate
5. Open app
```

**Android:**
```
1. Download .apk dari EAS
2. Tap file to install
3. Allow "Install from Unknown Sources" kalau diminta
4. Open app
```

---

### Option 4: TestFlight (iOS) / Internal Testing (Android) - SHARE WITH OTHERS! 👥

Kalau mau share dengan keluarga/teman (max 100 orang).

#### **iOS - TestFlight (FREE)**

**Setup:**
```bash
# 1. Build production
eas build --platform ios --profile production

# 2. Submit ke TestFlight (NO APP STORE REVIEW!)
eas submit --platform ios --latest

# Wait ~10-30 menit for processing
```

**Share dengan Others:**
```
1. Login ke https://appstoreconnect.apple.com/
2. TestFlight tab
3. External Testing → Create Group
4. Add testers (email addresses)
5. Testers dapat email invite
6. Download dari TestFlight app
7. Done! Max 100 external testers
```

**Install untuk Tester:**
```
1. Terima email invite
2. Download TestFlight app (FREE dari App Store)
3. Tap link di email
4. Install BudTrack dari TestFlight
5. Done! Can use normally
```

**Update:**
```bash
# Build new version
eas build --platform ios

# Auto-push ke TestFlight
# Testers dapat notif update otomatis
```

#### **Android - Internal Testing (FREE)**

**Setup:**
```bash
# 1. Build AAB
eas build --platform android --profile production

# 2. Upload ke Play Console
1. Login https://play.google.com/console
2. Create app (NO $25 FEE untuk internal testing!)
3. Testing → Internal testing
4. Create release
5. Upload .aab
6. Add testers (email list)
```

**Share dengan Others:**
```
1. Add tester emails
2. Testers dapat email dengan link
3. Tap link → Install
4. Done! Unlimited internal testers
```

---

### Option 5: Localhost + Ngrok - INSTANT ACCESS! 🚀

Kalau cuma buat test di phone, gak perlu build app sama sekali!

**Setup (2 menit):**

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start Next.js server
npm run dev
# Running on http://localhost:3000

# 3. Expose dengan ngrok
ngrok http 3000

# Output:
# Forwarding: https://abc123.ngrok.io → http://localhost:3000
```

**Access di Phone:**
```
1. Buka https://abc123.ngrok.io di mobile browser
2. Login
3. Works perfectly! Full features!
4. Bookmark atau Add to Home Screen
```

**Advantages:**
- ✅ Instant access
- ✅ No build needed
- ✅ Can test immediately
- ✅ Works from anywhere (internet)

**Disadvantages:**
- ⚠️ Need to run ngrok setiap kali
- ⚠️ URL berubah setiap restart (free plan)
- ⚠️ Need PC running

**Pro Version Ngrok ($8/month):**
- Static URL (doesn't change)
- Custom domain
- Better performance

---

## 📊 Comparison Table

| Method | Setup Time | Cost | Updates | Native Features | Best For |
|--------|------------|------|---------|----------------|----------|
| **PWA** | 10 min | FREE | Auto | Limited | ⭐ Daily use |
| **Expo Go** | 5 min | FREE | Instant | Limited | Development |
| **Dev Build** | 30 min | FREE | Manual rebuild | Full | Testing |
| **TestFlight** | 1 hour | FREE | Auto | Full | Share with others |
| **Ngrok** | 2 min | FREE | Auto | N/A (Web) | Quick testing |

---

## 🎯 Recommendation untuk Personal Use

### **Skenario 1: Cuma buat sendiri**
```
→ PWA (Progressive Web App)

Why:
✓ Paling simple
✓ No maintenance
✓ Auto update
✓ Feels native
✓ One-time setup

Steps:
1. Add PWA support ke Next.js (10 min)
2. Deploy ke Vercel/hosting (FREE)
3. Open di phone browser
4. Add to Home Screen
5. Done! ✅
```

### **Skenario 2: Buat keluarga/teman juga (2-10 orang)**
```
→ PWA atau TestFlight/Internal Testing

Why:
✓ Just share URL (PWA)
✓ Or add emails (TestFlight)
✓ Everyone can access
✓ Auto updates

Steps:
1. Deploy app (Vercel FREE)
2. Share link atau invite via email
3. Done! ✅
```

### **Skenario 3: Need native features (camera, biometric, etc)**
```
→ Development Build + Expo Dev Client

Why:
✓ Full native features
✓ Personal use only
✓ Install sekali, use forever
✓ Can update via OTA (Over-The-Air)

Steps:
1. eas build --profile development
2. Install .ipa/.apk di phone
3. Use normally
4. Update via expo publish when needed
```

### **Skenario 4: Just testing/development**
```
→ Expo Go atau Ngrok

Why:
✓ Super fast
✓ Hot reload
✓ No build time
✓ Perfect for testing

Steps:
1. npx expo start (Expo Go)
   atau
   npm run dev + ngrok http 3000
2. Open di phone
3. Test features
4. Iterate quickly
```

---

## 🚀 Recommended: PWA Setup (Step-by-Step)

**Total Time: 15 menit**

### Step 1: Install next-pwa

```bash
npm install next-pwa
```

### Step 2: Update next.config.js

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-data-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'apis',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    }
  ]
})

module.exports = withPWA({
  reactStrictMode: true,
  // ... your existing config
})
```

### Step 3: Create manifest.json

```json
// public/manifest.json
{
  "name": "BudTrack - Personal Finance Manager",
  "short_name": "BudTrack",
  "description": "Track your expenses, manage budgets, and achieve financial goals",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Step 4: Update layout.tsx

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'BudTrack - Personal Finance Manager',
  description: 'Track expenses, manage budgets, achieve financial goals',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BudTrack',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Step 5: Generate Icons

```bash
# Use online tool atau Figma:
# 1. Create 1024x1024px icon
# 2. Export multiple sizes:
#    - icon-72.png (72x72)
#    - icon-96.png (96x96)
#    - icon-128.png (128x128)
#    - icon-144.png (144x144)
#    - icon-152.png (152x152)
#    - icon-192.png (192x192)
#    - icon-384.png (384x384)
#    - icon-512.png (512x512)
#
# Or use: https://realfavicongenerator.net/
# Upload 1 image, generates all sizes automatically!

# Save all ke public/ folder
```

### Step 6: Deploy

```bash
# Deploy ke Vercel (FREE)
npx vercel

# Or push to GitHub dan connect Vercel
git push

# Your PWA live at: https://budtrack.vercel.app
```

### Step 7: Install di Phone

**iOS:**
```
1. Buka https://budtrack.vercel.app di Safari
2. Tap Share button (kotak dengan panah)
3. Scroll down, tap "Add to Home Screen"
4. Tap "Add"
5. Done! Icon muncul di home screen
```

**Android:**
```
1. Buka https://budtrack.vercel.app di Chrome
2. Tap menu (3 dots)
3. Tap "Install app" atau "Add to Home Screen"
4. Tap "Install"
5. Done! Icon muncul di home screen
```

**Features yang Works:**
- ✅ Offline mode (cached pages)
- ✅ Add to Home Screen
- ✅ Full screen mode (no browser UI)
- ✅ Push notifications (Android)
- ✅ Background sync
- ✅ Responsive design
- ✅ Fast loading

**Features yang TIDAK Works (PWA Limitations):**
- ❌ Biometric auth (Face ID/Touch ID) - Use browser saved passwords instead
- ❌ Native camera API - Can use `<input type="file" accept="image/*" capture="camera">`
- ❌ Advanced background tasks
- ❌ Full offline sync (need service worker setup)

---

## 💡 Tips for Personal Use

### 1. Gunakan Cloud Hosting (FREE)
```
Deploy ke:
- Vercel (recommended)
- Netlify
- Railway
- Render

Benefits:
✓ Always online
✓ Auto SSL (HTTPS)
✓ Auto deploy from GitHub
✓ FREE tier sufficient
```

### 2. Use Stable URL
```
Biar gak ribet ganti URL:
- Custom domain (optional, ~$10/year)
- Atau pakai Vercel subdomain (FREE)
- Bookmark di phone
```

### 3. Offline Mode
```
PWA automatically caches:
- Pages you visited
- Static assets (images, CSS, JS)
- API responses (optional)

Works without internet!
```

### 4. Update Strategy
```
PWA:
- Auto updates next time user visits
- Or force refresh (Cmd+Shift+R / Ctrl+Shift+R)

Expo Dev Build:
- Use OTA updates: expo publish
- Or rebuild & reinstall
```

### 5. Backup Data
```
Personal use = Local database OK

But also:
- Regular backups (use backup scripts)
- Export to CSV/Excel regularly
- Sync to cloud storage (Dropbox, Google Drive)
```

---

## 🎯 My Recommendation

**Untuk personal use, go with PWA:**

**Pros:**
1. ✅ **Zero cost** - No App Store fees
2. ✅ **Zero maintenance** - No app review, no updates submission
3. ✅ **Works everywhere** - iOS, Android, Desktop
4. ✅ **Auto updates** - Push code, users get update automatically
5. ✅ **One codebase** - Your existing Next.js app
6. ✅ **Fast setup** - 15 menit, done!
7. ✅ **Good enough** - 95% features work perfectly

**Setup Steps (Quick):**
```bash
# 1. Add PWA (5 min)
npm install next-pwa
# Update next.config.js & create manifest.json

# 2. Generate icons (5 min)
# Use https://realfavicongenerator.net/

# 3. Deploy (5 min)
npx vercel
# atau push to GitHub

# 4. Install di phone (1 min)
# Open URL → Add to Home Screen

Total: 15 minutes! 🎉
```

**Result:**
- ✅ App di home screen (looks native)
- ✅ Works offline
- ✅ Fast performance
- ✅ No App Store hassle
- ✅ FREE forever

---

## 📦 Quick Start Template

Create this script untuk instant PWA setup:

```bash
#!/bin/bash
# setup-pwa.sh

echo "🚀 Setting up BudTrack PWA..."

# Install next-pwa
npm install next-pwa

# Create manifest.json
cat > public/manifest.json << 'EOF'
{
  "name": "BudTrack",
  "short_name": "BudTrack",
  "description": "Personal Finance Manager",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF

echo "✅ PWA setup complete!"
echo "Next steps:"
echo "1. Generate icons (use realfavicongenerator.net)"
echo "2. Update next.config.js with PWA config"
echo "3. Deploy to Vercel"
echo "4. Add to Home Screen on your phone"
```

---

## ✅ Summary

**Kalau cuma buat personal:**
- ❌ **JANGAN** ribet submit ke App Store/Play Store
- ✅ **PAKAI** PWA (Progressive Web App)
- ✅ **ATAU** Expo Go untuk development
- ✅ **ATAU** TestFlight/Internal Testing kalau mau share with others

**Recommended flow:**
```
1. Build Next.js app ✅ (you already have this)
2. Add PWA support (15 min)
3. Deploy to Vercel (5 min)
4. Open on phone
5. Add to Home Screen
6. Done! Use like native app 🎉

Total time: 20 minutes
Total cost: $0
Maintenance: None
```

**Gak perlu:**
- ❌ Apple Developer account ($99/year)
- ❌ Google Play account ($25)
- ❌ App Store review (1-3 days wait)
- ❌ Native app development
- ❌ Separate iOS/Android codebases
- ❌ App updates approval
- ❌ Complex deployment

**Perfect for personal use!** 🎯

Need help setting up PWA? Let me know! 🚀
