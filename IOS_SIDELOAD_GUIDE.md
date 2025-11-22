# BudTrack iOS - Sideload Guide (No App Store!)

Complete guide untuk install BudTrack di iPhone/iPad tanpa App Store menggunakan sideloading.

---

## 🎯 What is Sideloading?

**Sideloading** = Install app (.ipa file) langsung ke iPhone tanpa melalui App Store.

**Keuntungan:**
- ✅ Gak perlu App Store submission
- ✅ Gak perlu TestFlight
- ✅ Full native app dengan semua features
- ✅ Install langsung di device
- ✅ Free (dengan batasan)

**Limitations:**
- ⚠️ Free Apple ID: App expired setelah 7 hari (harus re-sign)
- ⚠️ Max 3 apps per Apple ID (free account)
- ⚠️ Butuh Mac atau PC Windows
- ⚠️ Need to re-install every 7 days (free) atau 1 tahun (paid $99)

---

## 📋 Prerequisites

### Option 1: Free Apple ID
```
Cost: FREE
Signing Duration: 7 days
Max Apps: 3 apps
Need: Any Apple ID

Setelah 7 hari:
- App akan crash/tidak bisa dibuka
- Harus re-sign & re-install
- Data tetap aman (tidak hilang)
```

### Option 2: Paid Apple Developer Account
```
Cost: $99/year
Signing Duration: 1 YEAR
Max Apps: Unlimited
Need: Apple Developer Account

Setelah 1 tahun:
- Re-sign sekali setahun
- Jauh lebih convenient
```

**Recommendation:** Kalau cuma buat personal, pakai free Apple ID dulu. Kalau kesel re-sign tiap 7 hari, upgrade ke paid ($99/year).

---

## 🛠️ Sideloading Tools Comparison

| Tool | Platform | Price | Auto Refresh | Ease of Use |
|------|----------|-------|--------------|-------------|
| **AltStore** | Mac/Windows | FREE | ✅ Yes (WiFi) | ⭐⭐⭐⭐⭐ Easy |
| **Sideloadly** | Mac/Windows | FREE | ✅ Yes | ⭐⭐⭐⭐ Easy |
| **Apple Configurator** | Mac only | FREE | ❌ Manual | ⭐⭐⭐ Medium |
| **Xcode** | Mac only | FREE | ❌ Manual | ⭐⭐ Hard |
| **iOS App Signer** | Mac only | FREE | ❌ Manual | ⭐⭐⭐ Medium |

**Recommended: AltStore** (paling gampang, auto-refresh)

---

## 🚀 Method 1: AltStore (RECOMMENDED)

**Best for:** Personal use, auto-refresh, easiest setup

### Step 1: Install AltServer (di PC/Mac)

**Windows:**
```
1. Download AltServer dari: https://altstore.io/
2. Install AltServer-Setup.exe
3. Buka AltServer (icon muncul di system tray)
4. Install iTunes & iCloud dari Microsoft Store (required)
5. Install Mail app (built-in Windows)
```

**macOS:**
```
1. Download AltServer dari: https://altstore.io/
2. Extract & move AltServer ke Applications
3. Open AltServer
4. Click AltServer icon di menu bar
5. Mail plugin will be installed automatically
```

### Step 2: Install AltStore di iPhone

```
1. Connect iPhone ke PC/Mac via USB
2. Trust computer di iPhone (popup akan muncul)
3. Di PC/Mac: Click AltServer icon → Install AltStore → [Your iPhone]
4. Enter Apple ID & Password (untuk signing)
5. Wait installation (~2-5 minutes)
6. AltStore app akan muncul di iPhone home screen

Troubleshooting:
- If "Installation failed": Settings → General → Device Management → Trust [Your Email]
- If still fails: Restart iPhone & PC, try again
```

### Step 3: Enable WiFi Sync (Auto Refresh!)

**PENTING:** Ini yang bikin gak perlu re-install manual tiap 7 hari!

```
1. Di AltStore app di iPhone:
   - Settings tab
   - Sign in dengan Apple ID yang sama

2. Di AltServer di PC/Mac:
   - Keep AltServer running (always)
   - Keep PC/Mac on same WiFi as iPhone

3. Auto-refresh setup:
   - AltStore akan auto-refresh apps sebelum expire
   - Harus di same WiFi network
   - PC/Mac harus running

Cara kerja:
- Tiap hari, AltStore check expiration
- Kalau tinggal <3 hari, auto refresh
- Silent refresh (gak perlu action apa-apa)
- App continue working tanpa interrupt
```

### Step 4: Build .ipa File

**Option A: Using EAS (No Mac needed!)**
```bash
# 1. Install EAS CLI
npm install -g eas-cli
eas login

# 2. Configure
eas build:configure

# 3. Build .ipa
eas build --platform ios --profile production

# Wait ~15-30 minutes
# Download .ipa from EAS dashboard
```

**Option B: Using Xcode (Mac only)**
```bash
# 1. Open project in Xcode
cd ios
open BudtrackMobile.xcworkspace

# 2. Select target device: "Any iOS Device"
# 3. Product → Archive
# 4. Window → Organizer
# 5. Select archive → Distribute App → Development
# 6. Export as .ipa
# 7. Save .ipa file to Desktop
```

### Step 5: Install .ipa via AltStore

```
Method 1: From iPhone (Easy)
1. Airdrop atau copy .ipa file ke iPhone
2. Open .ipa file di Files app
3. Tap "Share" → "AltStore"
4. AltStore akan install app
5. Wait ~1-2 minutes
6. Done! App muncul di home screen

Method 2: From PC/Mac
1. Open AltServer di PC/Mac
2. Click AltServer icon
3. Sideload .ipa → [Your iPhone]
4. Select .ipa file
5. Enter Apple ID password
6. Wait installation
7. Done!
```

### Step 6: Trust Developer Certificate

```
First time install:
1. Settings → General → VPN & Device Management
2. Under "Developer App", tap your email
3. Tap "Trust [Your Email]"
4. Confirm

Now you can open the app!
```

### Maintenance (Auto-Refresh Enabled)

```
With WiFi Sync:
✅ Keep PC/Mac on same WiFi
✅ Keep AltServer running
✅ iPhone will auto-refresh apps
✅ No manual action needed!

Every 7 days (free) or 1 year (paid):
- AltStore automatically refreshes
- Apps continue working
- Zero downtime

If WiFi Sync fails:
- Manually open AltStore app
- Tap "Refresh All"
- Or sideload again
```

---

## 🛠️ Method 2: Sideloadly (Alternative)

**Best for:** More features, advanced users

### Step 1: Install Sideloadly

```
1. Download dari: https://sideloadly.io/
2. Install Sideloadly
3. Install iTunes & iCloud (Windows only)
```

### Step 2: Sideload .ipa

```
1. Open Sideloadly
2. Connect iPhone via USB
3. Select your device from dropdown
4. Drag & drop .ipa file ke Sideloadly
5. Enter Apple ID & Password
6. Click "Start"
7. Wait installation (~2-5 minutes)
8. Trust certificate di Settings (same as AltStore)
9. Done!
```

### Features:

```
✅ Inject tweaks (advanced)
✅ Remove app extensions if needed
✅ Custom bundle ID
✅ File sharing
✅ App thinning removal
✅ Force minimum iOS version
```

### Auto Refresh:

```
Sideloadly WiFi:
1. Install "Sideloadly WiFi" from Sideloadly
2. Keep Sideloadly running on PC/Mac
3. Same WiFi network
4. Auto-refresh before expiry
```

---

## 🛠️ Method 3: Apple Configurator 2 (Mac Only)

**Best for:** Mac users, simple & official

### Setup:

```
1. Download Apple Configurator 2 dari Mac App Store (FREE)
2. Open Apple Configurator 2
3. Connect iPhone via USB
4. Wait for device to appear
```

### Install .ipa:

```
1. Select your iPhone
2. Click "Add" → "Apps"
3. Select .ipa file
4. Click "Add"
5. Enter Apple ID password
6. Wait installation
7. Trust certificate di Settings
8. Done!
```

### Limitations:

```
❌ No auto-refresh (must re-install every 7 days)
❌ Manual process
✅ Official Apple tool
✅ Simple & clean
```

---

## 🛠️ Method 4: Xcode (Mac Only, For Developers)

**Best for:** Developers who already use Xcode

### Install via Xcode:

```
1. Open Xcode
2. Window → Devices and Simulators
3. Select your iPhone
4. Click "+" under Installed Apps
5. Select .ipa file
6. Wait installation
7. Trust certificate
8. Done!
```

### Run directly from Xcode:

```
1. Open project in Xcode
2. Connect iPhone
3. Select your device as target
4. Click "Run" (▶)
5. App builds & installs automatically
6. Auto re-signs when developing
```

---

## 📊 Comparison: All Methods

| Feature | AltStore | Sideloadly | Configurator | Xcode |
|---------|----------|------------|--------------|-------|
| **Platform** | Mac/Win | Mac/Win | Mac | Mac |
| **Price** | FREE | FREE | FREE | FREE |
| **Auto Refresh** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **WiFi Install** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Features** | Basic | Advanced | Basic | Advanced |
| **Best For** | Personal | Power users | Simple | Developers |

---

## 💡 Pro Tips

### 1. Auto-Refresh Setup (CRITICAL!)

```
MUST DO untuk avoid re-install tiap 7 hari:

✅ Enable WiFi sync (AltStore/Sideloadly)
✅ Keep PC/Mac running (or use 24/7 PC)
✅ Same WiFi network
✅ Check AltStore settings → ensure signed in

Result:
- Apps auto-refresh 2-3 hari sebelum expire
- Silent background refresh
- Zero downtime
- No manual action
```

### 2. Use Paid Developer Account ($99/year)

```
If tired of 7-day signing:

Benefits:
✅ Apps valid for 1 YEAR (not 7 days!)
✅ Unlimited apps (not max 3)
✅ Re-sign only once per year
✅ Much more convenient

Cost: $99/year (same as App Store submission)
But: No app review, no waiting, install anytime
```

### 3. Multiple Apple IDs

```
Free account limit: 3 apps

Workaround:
- Use multiple Apple IDs
- Each ID can have 3 apps
- Switch IDs in AltStore/Sideloadly

Example:
- apple.id.1@gmail.com → BudTrack, App2, App3
- apple.id.2@gmail.com → App4, App5, App6
```

### 4. Keep .ipa File Backed Up

```
Save .ipa to cloud:
✅ Google Drive
✅ Dropbox
✅ iCloud Drive

Why:
- Easy re-install if needed
- Share dengan devices lain
- Backup for future
```

### 5. Test First on Simulator

```
Before sideload ke device:

1. Test di iOS Simulator (Mac only)
   - Open Xcode
   - Open Simulator
   - Drag .app to Simulator
   - Test semua features

2. Fix bugs before sideload
3. Save time (no re-sideload needed)
```

---

## 🔧 Troubleshooting

### Problem 1: "Unable to Install"

**Cause:** Certificate issue atau expired

**Solution:**
```
1. Delete app dari iPhone
2. Settings → General → Device Management
3. Delete old certificate
4. Restart iPhone
5. Re-install via AltStore/Sideloadly
```

### Problem 2: "App Crashes on Launch"

**Cause:** Certificate expired (7 days passed)

**Solution:**
```
1. Open AltStore app
2. Tap "Refresh All"
3. Or re-install .ipa file
4. Data won't be lost (if app signed with same ID)
```

### Problem 3: "Could not find AltServer"

**Cause:** AltServer not running atau beda WiFi

**Solution:**
```
1. Check AltServer running di PC/Mac
2. Check iPhone & PC sama WiFi
3. Disable VPN kalau pakai
4. Restart AltServer
5. Try again
```

### Problem 4: "Maximum Apps Reached"

**Cause:** Already 3 apps installed (free account limit)

**Solution:**
```
Option 1: Delete 1 app
1. Open AltStore
2. My Apps tab
3. Delete 1 app yang tidak terpakai
4. Install app baru

Option 2: Use different Apple ID
1. Sign out dari AltStore
2. Sign in dengan Apple ID lain
3. Install app dengan ID baru

Option 3: Upgrade to paid ($99/year)
- Unlimited apps
```

### Problem 5: "Verification Failed"

**Cause:** No internet saat verify certificate

**Solution:**
```
1. Connect to WiFi/Cellular
2. Settings → General → Device Management
3. Tap email → Verify
4. Needs internet for first verification
```

### Problem 6: Auto-Refresh Not Working

**Cause:** WiFi sync not configured properly

**Solution:**
```
1. Open AltStore app → Settings
2. Check "Refresh Apps Automatically" is ON
3. Sign in dengan Apple ID
4. Check PC/Mac running AltServer
5. Check sama WiFi network
6. Manual refresh: Tap "Refresh All"
```

---

## 🔒 Security & Privacy

### Is Sideloading Safe?

```
✅ YES, if you build .ipa yourself
✅ YES, if download from trusted source
❌ NO, if download from random websites

Best practice:
✓ Build your own .ipa (using EAS/Xcode)
✓ Or get from developer you trust
✗ Don't download .ipa from sketchy sites
```

### Apple ID Safety

```
Q: Safe to enter Apple ID in AltStore/Sideloadly?
A: YES

Why:
- Only used for code signing
- Not sent to third-party servers
- Official Apple signing process
- Same as Xcode signing

But:
- Use app-specific password (recommended)
- Enable 2FA on Apple ID
- Don't share Apple ID credentials
```

### Create App-Specific Password

```
Recommended untuk security:

1. Visit: https://appleid.apple.com/
2. Sign in
3. Security → App-Specific Passwords
4. Generate new password
5. Use this password in AltStore/Sideloadly
6. Not your main Apple ID password

Benefits:
✓ More secure
✓ Can revoke anytime
✓ Doesn't expose main password
```

---

## 📈 Comparison: Sideload vs Other Methods

| Method | Setup Time | Cost | Maintenance | Features | Best For |
|--------|------------|------|-------------|----------|----------|
| **Sideload** | 30 min | FREE* | Weekly** | 100% | Personal, full features |
| **PWA** | 15 min | FREE | None | 95% | Quick setup, easy |
| **TestFlight** | 2 hours | FREE | None | 100% | Share w/ others |
| **App Store** | 1 week | $99/yr | Reviews | 100% | Public release |
| **Expo Go** | 5 min | FREE | None | 70% | Development |

\* Free with 7-day limit, or $99/year for 1-year signing
\** Can be automated with WiFi sync

---

## 🎯 Which Method Should You Use?

### Choose Sideloading If:
```
✅ Need 100% native features
✅ Need biometric auth (Face ID/Touch ID)
✅ Need advanced camera features
✅ Need background processing
✅ Okay with weekly refresh (free) atau yearly (paid)
✅ Have Mac or Windows PC
✅ Want full control
```

### Choose PWA If:
```
✅ Want zero maintenance
✅ Don't need advanced native features
✅ Want auto-updates
✅ Want cross-platform (iOS + Android + Desktop)
✅ 95% features sufficient
✅ Want simplest solution
```

### Choose Both!
```
Why not both?

Development:
- Use PWA for testing (quick iteration)

Production (Personal):
- Sideload for native experience
- Or PWA for convenience

Best of both worlds! 🎉
```

---

## 📋 Quick Start Checklist

### First Time Setup:

```
□ Choose signing method (free 7-day or paid 1-year)
□ Install AltServer on PC/Mac
□ Install AltStore on iPhone
□ Enable WiFi sync
□ Build .ipa file (EAS or Xcode)
□ Sideload .ipa via AltStore
□ Trust certificate
□ Test app

Time: ~30-60 minutes first time
```

### Ongoing Maintenance:

```
With Auto-Refresh (WiFi Sync):
□ Keep PC/Mac running (or scheduled on times)
□ Same WiFi network as iPhone
□ Check AltStore occasionally
□ That's it! Auto-refreshes before expiry

Manual (if WiFi sync not available):
□ Every 7 days (free) or 1 year (paid):
  - Open AltStore → Refresh All
  - Or re-sideload .ipa
□ Takes 2-3 minutes
```

---

## 💰 Cost Breakdown

### Option 1: Free Apple ID
```
Setup: FREE
Maintenance: FREE
Signing: 7 days
Effort: Low (with auto-refresh) to Medium (manual)

Annual cost: $0
Time cost: ~30 min/month (if manual)
           ~5 min/month (if auto-refresh)
```

### Option 2: Paid Developer Account
```
Setup: $99/year
Maintenance: FREE
Signing: 1 YEAR
Effort: Very Low (once per year)

Annual cost: $99
Time cost: ~15 min/year
Much more convenient!
```

### Comparison with Other Methods:
```
App Store: $99/year + review time + maintenance
Play Store: $25 one-time + review
TestFlight: FREE but limited to 100 testers
PWA: FREE, zero maintenance
Sideload Free: FREE but weekly refresh
Sideload Paid: $99/year, yearly refresh
```

---

## 🎬 Video Tutorials

### Recommended YouTube Tutorials:
```
Search for:
- "How to use AltStore"
- "Sideload iOS apps without jailbreak"
- "AltStore WiFi sync setup"

Watch 1-2 videos untuk visual guide
Sangat helpful untuk first-time setup!
```

---

## 📚 Additional Resources

### Official Documentation:
- **AltStore:** https://altstore.io/faq/
- **Sideloadly:** https://sideloadly.io/
- **Apple Configurator:** https://support.apple.com/apple-configurator

### Communities:
- **r/AltStore** (Reddit)
- **r/sideloaded** (Reddit)
- **AltStore Discord**

### Tools:
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Xcode:** https://developer.apple.com/xcode/

---

## ❓ FAQ

### Q: Aman gak sideloading?
**A:** Aman kalau build sendiri atau dari trusted source. Jangan download .ipa random dari internet.

### Q: Bisa kena ban Apple ID?
**A:** Tidak. Ini official signing method, sama seperti developers sign apps.

### Q: Data hilang kalau re-install?
**A:** Tidak, kalau sign dengan Apple ID yang sama. App data tetap aman.

### Q: Butuh jailbreak?
**A:** TIDAK! Sideloading ≠ jailbreak. Device tetap stock iOS.

### Q: Bisa update app gimana?
**A:** Build .ipa baru, install ulang. Data tetap aman (same bundle ID).

### Q: Work di iOS berapa?
**A:** iOS 12.2+ untuk AltStore. Tapi BudTrack recommend iOS 14+.

### Q: Bisa multi device (iPhone + iPad)?
**A:** Bisa! Install AltStore di each device, sideload .ipa ke masing-masing.

### Q: Auto-refresh work tanpa WiFi?
**A:** Tidak, butuh WiFi + PC/Mac running. Manual refresh juga bisa (buka AltStore → Refresh).

### Q: Lebih baik free 7-day atau paid 1-year?
**A:** Kalau cuma test: free. Kalau daily use: paid ($99) worth it untuk convenience.

---

## 🎯 Summary

**Sideloading is great untuk personal use!**

**Pros:**
- ✅ Full native app dengan 100% features
- ✅ No App Store submission (no waiting)
- ✅ Install anytime, unlimited times
- ✅ Full control
- ✅ Free (dengan batasan) atau $99/year (convenient)

**Cons:**
- ⚠️ Re-sign every 7 days (free) atau 1 year (paid)
- ⚠️ Setup awal butuh effort
- ⚠️ Butuh PC/Mac untuk auto-refresh
- ⚠️ Slightly more technical

**Best Setup:**
```
1. Install AltServer + AltStore
2. Enable WiFi sync (auto-refresh)
3. Build .ipa dengan EAS (no Mac needed)
4. Sideload via AltStore
5. Enjoy! Auto-refresh handles maintenance

Total time: 30-60 min setup
Maintenance: Automated (dengan WiFi sync)
Cost: FREE (or $99/year untuk convenience)
```

**Perfect combination:**
- **Development:** PWA (quick testing)
- **Personal use:** Sideload (full features)
- **Sharing:** TestFlight (for family/friends)

---

**Ready to sideload? Follow the AltStore method above! 🚀**

Need help? Check troubleshooting section or ask! 😊
